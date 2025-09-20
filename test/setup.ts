import prisma from '../src/application/database';
import { cacheService } from '../src/services/cache.service';

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';

  // Disable Redis for tests to avoid authentication issues
  process.env.REDIS_URL = '';

  console.log('✅ Test environment setup complete (Redis disabled)');
});

// Global test teardown
afterAll(async () => {
  // Clean up database connections
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting database:', error);
  }

  // Clean up cache connections (only if connected)
  try {
    if (cacheService.isReady()) {
      await cacheService.disconnect();
      console.log('✅ Cache service disconnected');
    }
  } catch (error) {
    console.warn('⚠️  Error disconnecting cache service:', error);
  }
});

// Clean up cache between tests (skip if Redis not connected)
beforeEach(async () => {
  // Skip cache cleanup since Redis is disabled in tests
});

// Global error handlers for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});