import { cacheService } from '../services/cache.service';
import { logger } from '../application/logging';

/**
 * Cache Testing Utility
 * Use this to test if Redis caching is working properly
 */

export async function testCacheConnection(): Promise<boolean> {
  try {
    // Connect to cache if not already connected
    if (!cacheService.isReady()) {
      await cacheService.connect();
    }

    // Test basic cache operations
    const testKey = 'test:cache:connection';
    const testValue = { message: 'Cache is working!', timestamp: new Date().toISOString() };

    // Test SET operation
    const setResult = await cacheService.set(testKey, testValue, 60); // 1 minute TTL
    if (!setResult) {
      logger.error('Cache SET operation failed');
      return false;
    }

    // Test GET operation
    const getResult = await cacheService.get(testKey);
    if (!getResult) {
      logger.error('Cache GET operation failed - no data returned');
      return false;
    }

    // Verify data integrity
    if (JSON.stringify(getResult) !== JSON.stringify(testValue)) {
      logger.error('Cache data integrity check failed', { expected: testValue, actual: getResult });
      return false;
    }

    // Test DELETE operation
    const deleteResult = await cacheService.delete(testKey);
    if (!deleteResult) {
      logger.warn('Cache DELETE operation failed, but cache might still be working');
    }

    // Verify deletion
    const deletedData = await cacheService.get(testKey);
    if (deletedData) {
      logger.warn('Cache DELETE verification failed - data still exists');
    }

    logger.info('✅ Cache connection test passed successfully!');
    return true;

  } catch (error) {
    logger.error('❌ Cache connection test failed', { error });
    return false;
  }
}

export async function testUserCacheKeys(): Promise<void> {
  try {
    const { CacheKey } = await import('./cache-key.util');

    logger.info('🔍 Testing cache key generation...');

    // Test different cache key patterns
    const testKeys = {
      userById: CacheKey.byId('user', '123'),
      userByEmail: CacheKey.byField('user', 'email', 'test@example.com'),
      usersList: CacheKey.list('users', undefined, { is_active: true }),
      usersListPaginated: CacheKey.list('users', { page: 1, limit: 10 }, { is_active: true }),
      usersPattern: CacheKey.pattern('users', 'list:*')
    };

    logger.info('Generated cache keys:', testKeys);

    // Test if Redis is working with these keys
    if (cacheService.isReady()) {
      for (const [keyType, key] of Object.entries(testKeys)) {
        if (keyType !== 'usersPattern') { // Skip pattern key for actual cache test
          const testData = { type: keyType, generated: new Date().toISOString() };
          await cacheService.set(key, testData, 30); // 30 seconds TTL
          const retrieved = await cacheService.get(key);

          if (retrieved) {
            logger.info(`✅ Cache key '${keyType}' working:`, key);
          } else {
            logger.warn(`❌ Cache key '${keyType}' failed:`, key);
          }
        }
      }

      // Clean up test keys
      for (const [keyType, key] of Object.entries(testKeys)) {
        if (keyType !== 'usersPattern') {
          await cacheService.delete(key);
        }
      }
    } else {
      logger.warn('⚠️  Redis not ready - cannot test cache operations');
    }

  } catch (error) {
    logger.error('❌ Cache key test failed', { error });
  }
}

export async function diagnoseCacheIssues(): Promise<void> {
  logger.info('🔍 Diagnosing cache issues...');

  // Check Redis connection
  logger.info('1. Checking Redis connection status...');
  const isReady = cacheService.isReady();
  logger.info(`   Redis ready: ${isReady}`);

  if (!isReady) {
    logger.warn('   ⚠️  Redis is not ready. Attempting to connect...');
    try {
      await cacheService.connect();
      logger.info('   ✅ Redis connection successful');
    } catch (error) {
      logger.error('   ❌ Redis connection failed:', error);
      return;
    }
  }

  // Test basic cache operations
  logger.info('2. Testing basic cache operations...');
  const connectionTest = await testCacheConnection();

  if (!connectionTest) {
    logger.error('   ❌ Basic cache operations failed');
    return;
  }

  // Test cache key generation
  logger.info('3. Testing cache key generation...');
  await testUserCacheKeys();

  logger.info('🎉 Cache diagnosis complete!');
}

// Export a simple function to run diagnosis
export async function runCacheDiagnosis(): Promise<void> {
  logger.info('🚀 Starting cache diagnosis...');
  await diagnoseCacheIssues();
}