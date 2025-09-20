# Redis Cache Implementation

This document describes the Redis caching implementation added to the Express TypeScript API.

## Overview

Redis caching has been implemented to improve API performance by caching frequently accessed data and reducing database load. The implementation includes:

- **Repository-level caching** for user data
- **Automatic cache invalidation** on write operations
- **Graceful degradation** when Redis is unavailable
- **Cache management endpoints** for monitoring and maintenance

## Features Implemented

### 1. Cache Service (`src/services/cache.service.ts`)

A centralized cache service that provides:

- **Connection management** with automatic reconnection
- **Key generation** with consistent naming patterns
- **TTL support** with configurable expiration times
- **Pattern-based deletion** for bulk cache invalidation
- **Error handling** with graceful fallbacks

#### Key Methods:
```typescript
await cacheService.get<T>(key: string): Promise<T | null>
await cacheService.set(key: string, value: any, ttlSeconds?: number): Promise<boolean>
await cacheService.delete(key: string): Promise<boolean>
await cacheService.deletePattern(pattern: string): Promise<number>
```

### 2. Repository Caching (`src/repositories/user.repository.ts`)

Enhanced user repository with caching for:

- **User by ID** - Cached for 15 minutes
- **User by email** - Cached for 15 minutes
- **Users list** (with pagination) - Cached for 5 minutes
- **Automatic invalidation** on create/update/delete

#### Cache Keys:
- `user:{id}` - Individual user by ID
- `user:email:{email}` - User by email address
- `users:list:page:{page}:limit:{limit}` - Paginated user lists
- `users:list:all` - Complete user list

### 3. Cache Middleware (`src/middlewares/cache.middleware.ts`)

Reusable middleware for:

- **Response caching** for GET requests
- **Cache headers** (X-Cache: HIT/MISS)
- **Custom key generation**
- **Conditional caching** with skip logic

### 4. Cache Management API (`src/routes/cache.route.ts`)

Admin endpoints for cache management:

- `GET /cache/status` - Check Redis connection status
- `DELETE /cache/users` - Clear all user-related cache
- `DELETE /cache/users/:id` - Clear specific user cache
- `DELETE /cache/all` - Flush entire cache (use with caution)

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379
CACHE_TTL_SECONDS=3600
```

### Optional Redis Setup

The application works with or without Redis:

- **With Redis**: Full caching functionality enabled
- **Without Redis**: Graceful degradation, all requests go to database

## Cache Strategy

### Read Operations
1. Check cache first
2. If cache miss, query database
3. Cache the result with appropriate TTL
4. Return data to client

### Write Operations
1. Perform database operation
2. Invalidate related cache entries:
   - User-specific cache (by ID and email)
   - Users list cache (all pagination variants)
3. Return result to client

### Cache Keys Pattern
```
user:{userId}                           # Individual user
user:email:{email}                      # User by email
users:list:page:{page}:limit:{limit}    # Paginated list
users:list:all                          # Complete list
```

## Performance Benefits

### Cache Hit Scenarios
- **User profile lookups**: 15-minute cache reduces DB load
- **User lists**: 5-minute cache for dashboard/admin views
- **Email-based lookups**: Authentication scenarios

### Cache Invalidation Strategy
- **Surgical invalidation**: Only clear related cache entries
- **Pattern-based clearing**: Efficient bulk invalidation
- **Write-through**: Immediate invalidation on updates

## Monitoring

### Logging
Cache operations are logged with correlation IDs:
```
Cache hit for user: {"userId": "123", "cacheKey": "user:123"}
Cache miss for users list: {"cacheKey": "users:list:page:1:limit:10"}
Cache invalidated after user update: {"userId": "123"}
```

### Headers
Response headers indicate cache status:
```
X-Cache: HIT|MISS
X-Cache-Key: user:123
X-Request-ID: correlation-id
```

## Testing Redis Implementation

### 1. Start Redis Server
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally
brew install redis
redis-server
```

### 2. Update Environment
```bash
# Add to .env
REDIS_URL=redis://localhost:6379
```

### 3. Test API Endpoints

```bash
# Check cache status
curl http://localhost:8888/cache/status

# Get users (first call - cache miss)
curl http://localhost:8888/api/users

# Get users (second call - cache hit)
curl http://localhost:8888/api/users

# Clear cache
curl -X DELETE http://localhost:8888/cache/users
```

### 4. Verify Cache Behavior

Check response headers:
- First request: `X-Cache: MISS`
- Subsequent requests: `X-Cache: HIT`

## Production Considerations

### Redis Configuration
- Use Redis Cluster for high availability
- Configure appropriate memory limits
- Set up monitoring and alerting
- Regular backup strategy

### Cache TTL Guidelines
- **User profiles**: 15-30 minutes
- **User lists**: 5-10 minutes
- **Search results**: 1-5 minutes
- **Static data**: 1-24 hours

### Security
- Cache management endpoints should be protected
- Consider authentication for cache operations
- Monitor cache hit ratios and performance

## Error Handling

The cache implementation includes robust error handling:

- **Connection failures**: App continues without cache
- **Redis timeouts**: Graceful fallback to database
- **Serialization errors**: Logged but non-blocking
- **Pattern deletion errors**: Partial invalidation handling

## Metrics to Monitor

1. **Cache hit ratio**: Target >60% for user lookups
2. **Response times**: Cached responses <10ms
3. **Memory usage**: Monitor Redis memory consumption
4. **Connection health**: Redis connection status
5. **Invalidation frequency**: Cache turnover rates

---

This Redis implementation provides significant performance improvements while maintaining reliability through graceful degradation when cache services are unavailable.