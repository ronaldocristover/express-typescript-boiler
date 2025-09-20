# Generic Cache Architecture

This document describes the generic caching system that can be reused across all repositories in the application.

## 🎯 Overview

The generic cache system provides:
- **Consistent cache key patterns** across all entities
- **Reusable repository base class** with common caching functionality
- **Type-safe cache operations** with TypeScript support
- **Automatic cache invalidation** strategies
- **Flexible key generation** for various access patterns

## 🏗️ Architecture Components

### 1. Cache Key Utility (`src/utils/cache-key.util.ts`)

Central utility for generating consistent cache keys across all entity types.

#### Key Patterns

```typescript
// Single entity by ID
CacheKey.byId('user', '123')
// Result: 'user:123'

// Entity by field
CacheKey.byField('user', 'email', 'john@example.com')
// Result: 'user:email:john@example.com'

// Entity lists with optional filters
CacheKey.list('users', { page: 1, limit: 10 }, { is_active: true })
// Result: 'users:list:page:1:limit:10:is_active:true'

// Search results
CacheKey.search('products', 'laptop computer', { page: 1, limit: 20 })
// Result: 'products:search:laptop_computer:page:1:limit:20'

// Aggregations
CacheKey.count('orders', { status: 'completed' })
// Result: 'orders:count:status:completed'

// Custom patterns
CacheKey.custom('analytics', 'daily', '2023-12-01')
// Result: 'analytics:daily:2023-12-01'
```

#### Available Methods

| Method | Purpose | Example |
|--------|---------|---------|
| `byId(entity, id)` | Single entity by ID | `user:123` |
| `byField(entity, field, value)` | Entity by specific field | `user:email:john@test.com` |
| `list(entity, pagination?, filters?)` | Entity lists | `users:list:page:1:limit:10` |
| `relation(parent, id, relation, pagination?)` | Related entities | `user:123:posts:all` |
| `search(entity, query, pagination?, filters?)` | Search results | `products:search:laptop` |
| `count(entity, filters?)` | Count aggregation | `users:count:is_active:true` |
| `pattern(entity, pattern?)` | Deletion patterns | `users:*` |
| `custom(...parts)` | Custom key generation | `analytics:daily:2023-12-01` |

### 2. Base Repository (`src/repositories/base.repository.ts`)

Abstract base class providing common caching functionality for all repositories.

#### Cache TTL Constants

```typescript
protected static readonly CACHE_TTL = {
  SHORT: 300,    // 5 minutes - for frequently changing data
  MEDIUM: 900,   // 15 minutes - for moderately stable data
  LONG: 3600,    // 1 hour - for stable data
} as const;
```

#### Core Methods

| Method | Purpose | TTL |
|--------|---------|-----|
| `getFromCacheById(id)` | Retrieve entity by ID | - |
| `getFromCacheByField(field, value)` | Retrieve entity by field | - |
| `getListFromCache(pagination?, filters?)` | Retrieve entity list | - |
| `cacheById(entity, ttl?)` | Cache entity by ID | MEDIUM |
| `cacheByField(field, value, entity, ttl?)` | Cache entity by field | MEDIUM |
| `cacheList(entities, pagination?, filters?, ttl?)` | Cache entity list | SHORT |
| `invalidateCacheById(id)` | Remove entity cache | - |
| `invalidateListCaches()` | Remove all list caches | - |
| `invalidateAllCaches()` | Remove all entity caches | - |

## 🚀 Usage Examples

### Creating a New Repository

```typescript
import { BaseRepository } from "./base.repository";
import { PaginationParams } from "../utils/cache-key.util";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  category_id: string;
  is_active: boolean;
}

interface CreateProductDTO {
  name: string;
  slug: string;
  price: number;
  category_id: string;
}

interface UpdateProductDTO {
  name?: string;
  slug?: string;
  price?: number;
  is_active?: boolean;
}

class ProductRepository extends BaseRepository<Product, CreateProductDTO, UpdateProductDTO> {
  protected entityName = 'product';
  protected entityPluralName = 'products';

  async findById(id: string): Promise<Product | null> {
    // Try cache first
    const cached = await this.getFromCacheById(id);
    if (cached) return cached;

    // Fetch from database
    const result = await prisma.product.findUnique({ where: { id } });

    if (result) {
      // Cache with multiple access patterns
      await this.cacheMultiplePatterns(result, [
        { field: 'slug', value: result.slug }
      ]);
    }

    return result;
  }

  async findAll(pagination?: PaginationParams): Promise<Product[]> {
    // Try cache first
    const filters = { is_active: true };
    const cached = await this.getListFromCache(pagination, filters);
    if (cached) return cached;

    // Fetch from database
    const result = await prisma.product.findMany({
      where: filters,
      ...this.buildPaginationQuery(pagination)
    });

    // Cache the result
    await this.cacheList(result, pagination, filters);

    return result;
  }

  async create(data: CreateProductDTO): Promise<Product> {
    const result = await prisma.product.create({ data });

    // Invalidate list caches
    await this.invalidateListCaches();

    return result;
  }

  async update(id: string, data: UpdateProductDTO): Promise<Product> {
    const current = await prisma.product.findUnique({ where: { id } });
    const result = await prisma.product.update({ where: { id }, data });

    // Invalidate specific caches
    await this.invalidateMultiplePatterns(id, [
      {
        field: 'slug',
        oldValue: current?.slug,
        newValue: result.slug
      }
    ]);

    // Invalidate list caches
    await this.invalidateListCaches();

    return result;
  }
}
```

### Direct Cache Key Usage

```typescript
import { CacheKey } from "../utils/cache-key.util";
import { cacheService } from "../services/cache.service";

// Cache user preferences
const preferencesKey = CacheKey.byField('user', 'preferences', userId);
await cacheService.set(preferencesKey, preferences, 3600);

// Cache search results
const searchKey = CacheKey.search('products', searchQuery, pagination, filters);
const cachedResults = await cacheService.get(searchKey);

// Cache aggregated data
const statsKey = CacheKey.custom('analytics', 'daily-stats', '2023-12-01');
await cacheService.set(statsKey, dailyStats, 86400); // 24 hours

// Invalidate related caches
await cacheService.deletePattern(CacheKey.pattern('user', '123:*'));
```

## 🔧 Migration Guide

### From Old Cache System

**Before (User Repository):**
```typescript
// Old hardcoded approach
const cacheKey = cacheService.generateUserKey(id);
const listKey = cacheService.generateUsersListKey(page, limit);
```

**After (Generic System):**
```typescript
// New generic approach
const cacheKey = CacheKey.byId('user', id);
const listKey = CacheKey.list('users', { page, limit }, { is_active: true });
```

### Benefits of Migration

1. **Consistency**: All repositories use the same key patterns
2. **Flexibility**: Easy to add new entities without custom key logic
3. **Maintainability**: Centralized key generation reduces duplication
4. **Type Safety**: TypeScript support for better development experience
5. **Debugging**: Predictable key patterns make debugging easier

## 📋 Best Practices

### 1. Entity Naming
- Use singular form for individual entities: `'user'`, `'product'`, `'order'`
- Use plural form for collections: `'users'`, `'products'`, `'orders'`

### 2. Filter Inclusion
- Include relevant filters in list cache keys for accuracy
- Sort filter keys alphabetically for consistent cache keys

### 3. TTL Strategy
```typescript
// Fast-changing data (user sessions, cart contents)
await this.cacheById(entity, BaseRepository.CACHE_TTL.SHORT);

// Moderate data (user profiles, product details)
await this.cacheById(entity, BaseRepository.CACHE_TTL.MEDIUM);

// Stable data (categories, settings)
await this.cacheById(entity, BaseRepository.CACHE_TTL.LONG);
```

### 4. Cache Invalidation
- Invalidate specific entity caches on updates
- Invalidate list caches when entities are created/deleted
- Use pattern-based deletion for related data

### 5. Error Handling
- Always have database fallback when cache fails
- Log cache hits/misses for monitoring
- Don't let cache errors break application flow

## 🔍 Monitoring and Debugging

### Cache Key Patterns
All cache keys follow predictable patterns with service prefixes:

```
{service-prefix}:user:123
{service-prefix}:users:list:page:1:limit:10:is_active:true
{service-prefix}:product:email:john@example.com
{service-prefix}:products:search:laptop:page:1:limit:20
```

### Debugging Tips
1. Use Redis CLI to inspect keys: `KEYS {service-prefix}:*`
2. Check cache hit/miss logs in application logs
3. Monitor cache performance metrics
4. Use cache headers in API responses for debugging

## 🚀 Future Enhancements

1. **Cache Warming**: Automatic cache population strategies
2. **Smart Invalidation**: Graph-based cache dependency tracking
3. **Cache Analytics**: Detailed hit/miss ratio reporting
4. **Distributed Invalidation**: Cross-service cache invalidation
5. **Cache Compression**: Automatic data compression for large objects

---

This generic cache system provides a solid foundation for scalable, maintainable caching across all your application's repositories.