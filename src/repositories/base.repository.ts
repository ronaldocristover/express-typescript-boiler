import { cacheService } from "../services/cache.service";
import { logger } from "../application/logging";
import { CacheKey, PaginationParams } from "../utils/cache-key.util";

/**
 * Base Repository Class
 * Provides common caching functionality for all repositories
 */
export abstract class BaseRepository<T, CreateDTO, UpdateDTO> {
  protected abstract entityName: string;
  protected abstract entityPluralName: string;

  /**
   * Cache TTL constants (in seconds)
   */
  protected static readonly CACHE_TTL = {
    SHORT: 300,    // 5 minutes
    MEDIUM: 900,   // 15 minutes
    LONG: 3600,    // 1 hour
  } as const;

  /**
   * Get entity from cache by ID
   */
  protected async getFromCacheById(id: string | number): Promise<T | null> {
    const cacheKey = CacheKey.byId(this.entityName, id);
    const cachedResult = await cacheService.get<T>(cacheKey);

    if (cachedResult) {
      logger.debug(`Cache hit for ${this.entityName}`, { id, cacheKey });
    } else {
      logger.debug(`Cache miss for ${this.entityName}`, { id, cacheKey });
    }

    return cachedResult;
  }

  /**
   * Get entity from cache by field
   */
  protected async getFromCacheByField(field: string, value: string): Promise<T | null> {
    const cacheKey = CacheKey.byField(this.entityName, field, value);
    const cachedResult = await cacheService.get<T>(cacheKey);

    if (cachedResult) {
      logger.debug(`Cache hit for ${this.entityName} by ${field}`, { value, cacheKey });
    } else {
      logger.debug(`Cache miss for ${this.entityName} by ${field}`, { value, cacheKey });
    }

    return cachedResult;
  }

  /**
   * Get entity list from cache
   */
  protected async getListFromCache(
    pagination?: PaginationParams,
    filters?: Record<string, any>
  ): Promise<T[] | null> {
    const cacheKey = CacheKey.list(this.entityPluralName, pagination, filters);
    const cachedResult = await cacheService.get<T[]>(cacheKey);

    if (cachedResult) {
      logger.debug(`Cache hit for ${this.entityPluralName} list`, { cacheKey });
    } else {
      logger.debug(`Cache miss for ${this.entityPluralName} list`, { cacheKey });
    }

    return cachedResult;
  }

  /**
   * Cache entity by ID
   */
  protected async cacheById(entity: T & { id: string | number }, ttl: number = BaseRepository.CACHE_TTL.MEDIUM): Promise<void> {
    const cacheKey = CacheKey.byId(this.entityName, entity.id);
    await cacheService.set(cacheKey, entity, ttl);
    logger.debug(`Cached ${this.entityName}`, { id: entity.id, cacheKey, ttl });
  }

  /**
   * Cache entity by field
   */
  protected async cacheByField(field: string, value: string, entity: T, ttl: number = BaseRepository.CACHE_TTL.MEDIUM): Promise<void> {
    const cacheKey = CacheKey.byField(this.entityName, field, value);
    await cacheService.set(cacheKey, entity, ttl);
    logger.debug(`Cached ${this.entityName} by ${field}`, { value, cacheKey, ttl });
  }

  /**
   * Cache entity list
   */
  protected async cacheList(
    entities: T[],
    pagination?: PaginationParams,
    filters?: Record<string, any>,
    ttl: number = BaseRepository.CACHE_TTL.SHORT
  ): Promise<void> {
    const cacheKey = CacheKey.list(this.entityPluralName, pagination, filters);
    await cacheService.set(cacheKey, entities, ttl);
    logger.debug(`Cached ${this.entityPluralName} list`, { cacheKey, count: entities.length, ttl });
  }

  /**
   * Cache multiple entities with different access patterns
   */
  protected async cacheMultiplePatterns(
    entity: T & { id: string | number },
    additionalFields?: { field: string; value: string }[],
    ttl: number = BaseRepository.CACHE_TTL.MEDIUM
  ): Promise<void> {
    // Cache by ID
    await this.cacheById(entity, ttl);

    // Cache by additional fields if provided
    if (additionalFields) {
      for (const { field, value } of additionalFields) {
        await this.cacheByField(field, value, entity, ttl);
      }
    }
  }

  /**
   * Invalidate entity cache by ID
   */
  protected async invalidateCacheById(id: string | number): Promise<void> {
    const cacheKey = CacheKey.byId(this.entityName, id);
    await cacheService.delete(cacheKey);
    logger.debug(`Invalidated cache for ${this.entityName}`, { id, cacheKey });
  }

  /**
   * Invalidate entity cache by field
   */
  protected async invalidateCacheByField(field: string, value: string): Promise<void> {
    const cacheKey = CacheKey.byField(this.entityName, field, value);
    await cacheService.delete(cacheKey);
    logger.debug(`Invalidated cache for ${this.entityName} by ${field}`, { value, cacheKey });
  }

  /**
   * Invalidate all list caches for this entity
   */
  protected async invalidateListCaches(): Promise<void> {
    const pattern = CacheKey.pattern(this.entityPluralName, 'list:*');
    await cacheService.deletePattern(pattern);
    logger.debug(`Invalidated list caches for ${this.entityPluralName}`, { pattern });
  }

  /**
   * Invalidate all caches for this entity type
   */
  protected async invalidateAllCaches(): Promise<void> {
    const patterns = [
      CacheKey.pattern(this.entityName),
      CacheKey.pattern(this.entityPluralName)
    ];

    for (const pattern of patterns) {
      await cacheService.deletePattern(pattern);
    }

    logger.info(`Cleared all caches for ${this.entityName}`, { patterns });
  }

  /**
   * Invalidate multiple cache patterns for an entity
   */
  protected async invalidateMultiplePatterns(
    entityId: string | number,
    additionalFields?: { field: string; oldValue?: string; newValue?: string }[]
  ): Promise<void> {
    const promises: Promise<boolean>[] = [];

    // Invalidate by ID
    promises.push(cacheService.delete(CacheKey.byId(this.entityName, entityId)));

    // Invalidate by additional fields
    if (additionalFields) {
      for (const { field, oldValue, newValue } of additionalFields) {
        if (oldValue) {
          promises.push(cacheService.delete(CacheKey.byField(this.entityName, field, oldValue)));
        }
        if (newValue && newValue !== oldValue) {
          promises.push(cacheService.delete(CacheKey.byField(this.entityName, field, newValue)));
        }
      }
    }

    await Promise.all(promises);
    logger.debug(`Invalidated multiple cache patterns for ${this.entityName}`, { entityId });
  }

  /**
   * Get cache statistics for this entity type
   */
  protected async getCacheStats(): Promise<{ entityCaches: number; listCaches: number }> {
    // This is a placeholder - actual implementation would depend on Redis capabilities
    // You could use SCAN command to count keys matching patterns
    return {
      entityCaches: 0, // Number of individual entity caches
      listCaches: 0    // Number of list caches
    };
  }
}