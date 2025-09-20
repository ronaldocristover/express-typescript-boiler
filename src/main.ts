import { config } from "dotenv";
import prisma from "./application/database";
import app from "./app";
import { logger } from "./application/logging";
import { env } from "./application/env.validation";
import { cacheService } from "./services/cache.service";

// Load environment variables first
config({ path: `.env` });

async function main() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info("Connected to the database successfully.");

    // Initialize Redis cache (optional - app will work without it)
    if (env.REDIS_URL) {
      try {
        await cacheService.connect();
        logger.info("Connected to Redis cache successfully.");
      } catch (error) {
        logger.warn("Failed to connect to Redis cache, continuing without caching:", error);
      }
    } else {
      logger.info("Redis URL not configured, running without cache.");
    }

    // Start server with configured port
    const server = app.listen(env.PORT, () => {
      logger.info(`Server is running on port ${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`Access the API at http://localhost:${env.PORT}`);
      logger.info(`Health check: http://localhost:${env.PORT}/health`);
      logger.info(`Cache enabled: ${cacheService.isReady()}`);
    });

    // Configure server timeouts
    server.keepAliveTimeout = 60000; // 60 seconds
    server.headersTimeout = 65000; // 65 seconds

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed.');

        try {
          await prisma.$disconnect();
          logger.info('Database connection closed.');

          // Disconnect Redis if connected
          if (cacheService.isReady()) {
            await cacheService.disconnect();
          }

          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error("Failed to connect to the database or start server:", error);
    process.exit(1);
  }
}

main();
