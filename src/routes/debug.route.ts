import { Router } from 'express';
import { logger } from '../application/logging';
import { cacheService } from '../services/cache.service';
import { runCacheDiagnosis } from '../utils/cache-test.util';
import { CacheKey } from '../utils/cache-key.util';
import userRepository from '../repositories/user.repository';

const router = Router();

/**
 * Debug endpoint to test cache functionality
 * Only available in development
 */
router.get('/cache-test', async (req, res) => {
  try {
    logger.info('🔍 Cache test endpoint called');

    // Run cache diagnosis
    await runCacheDiagnosis();

    // Test actual user repository caching
    logger.info('4. Testing user repository cache...');

    // Clear any existing cache first
    await userRepository.clearAllUsersCache();

    // First call should miss cache and hit database
    const start1 = Date.now();
    const users1 = await userRepository.findAll();
    const time1 = Date.now() - start1;
    logger.info(`First call (should be cache miss): ${time1}ms, users found: ${users1.length}`);

    // Second call should hit cache
    const start2 = Date.now();
    const users2 = await userRepository.findAll();
    const time2 = Date.now() - start2;
    logger.info(`Second call (should be cache hit): ${time2}ms, users found: ${users2.length}`);

    // Check if cache key exists
    const cacheKey = CacheKey.list('users', undefined, { is_active: true });
    const cacheExists = await cacheService.exists(cacheKey);
    logger.info(`Cache key exists: ${cacheExists}, key: ${cacheKey}`);

    res.json({
      success: true,
      message: 'Cache test completed - check logs for details',
      results: {
        redisReady: cacheService.isReady(),
        cacheKey,
        cacheExists,
        timings: {
          firstCall: `${time1}ms (expected: slower, database hit)`,
          secondCall: `${time2}ms (expected: faster, cache hit)`,
          improvement: time1 > time2 ? `${time1 - time2}ms faster` : 'No improvement (cache miss?)'
        },
        usersCount: users1.length
      }
    });

  } catch (error) {
    logger.error('❌ Cache test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Cache test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Debug endpoint to check cache status
 */
router.get('/cache-status', async (req, res) => {
  try {
    const status = {
      redisReady: cacheService.isReady(),
      keyPrefix: cacheService.getKeyPrefix(),
      environment: process.env.NODE_ENV,
      redisUrl: process.env.REDIS_URL ? 'configured' : 'not configured'
    };

    logger.info('Cache status requested:', status);

    res.json({
      success: true,
      cache: status
    });

  } catch (error) {
    logger.error('Cache status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache status'
    });
  }
});

/**
 * Debug endpoint to clear all cache
 */
router.delete('/cache-clear', async (req, res) => {
  try {
    if (cacheService.isReady()) {
      await cacheService.flush();
      logger.info('🗑️  All cache cleared via debug endpoint');
      res.json({ success: true, message: 'Cache cleared successfully' });
    } else {
      res.json({ success: false, message: 'Redis not ready - cannot clear cache' });
    }
  } catch (error) {
    logger.error('Cache clear error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

export default router;