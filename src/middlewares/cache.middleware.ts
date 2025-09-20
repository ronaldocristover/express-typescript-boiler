import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache.service';
import { logger } from '../application/logging';

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  skipCache?: (req: Request) => boolean;
}

/**
 * Middleware for caching GET requests
 */
export const cacheMiddleware = (options: CacheOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip cache if condition is met
    if (options.skipCache && options.skipCache(req)) {
      return next();
    }

    // Skip if Redis is not available
    if (!cacheService.isReady()) {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = options.keyGenerator
        ? options.keyGenerator(req)
        : `${req.route?.path || req.path}:${JSON.stringify(req.query)}`;

      // Try to get from cache
      const cachedData = await cacheService.get(cacheKey);

      if (cachedData) {
        logger.debug('Cache middleware hit', {
          cacheKey,
          path: req.path,
          correlationId: req.correlationId
        });

        // Set cache headers
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);

        return res.json(cachedData);
      }

      // Cache miss - continue to controller
      logger.debug('Cache middleware miss', {
        cacheKey,
        path: req.path,
        correlationId: req.correlationId
      });

      // Store original json method
      const originalJson = res.json;

      // Override json method to cache the response
      res.json = function(data: any) {
        // Cache the response data
        if (res.statusCode === 200 && data) {
          cacheService.set(cacheKey, data, options.ttl)
            .then(() => {
              logger.debug('Response cached', {
                cacheKey,
                path: req.path,
                correlationId: req.correlationId
              });
            })
            .catch((error) => {
              logger.error('Failed to cache response', {
                error,
                cacheKey,
                path: req.path,
                correlationId: req.correlationId
              });
            });
        }

        // Set cache headers
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);

        // Call original json method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', {
        error,
        path: req.path,
        correlationId: req.correlationId
      });
      next();
    }
  };
};

/**
 * Middleware for invalidating cache patterns
 */
export const invalidateCacheMiddleware = (patterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json;

    // Override json method to invalidate cache after successful response
    res.json = function(data: any) {
      // Only invalidate on successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        Promise.all(patterns.map(pattern => cacheService.deletePattern(pattern)))
          .then(() => {
            logger.debug('Cache invalidated', {
              patterns,
              path: req.path,
              correlationId: req.correlationId
            });
          })
          .catch((error) => {
            logger.error('Failed to invalidate cache', {
              error,
              patterns,
              path: req.path,
              correlationId: req.correlationId
            });
          });
      }

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};