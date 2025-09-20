import { createClient, RedisClientType } from 'redis';
import { logger } from '../application/logging';
import { env } from '../application/env.validation';

class CacheService {
  private client: RedisClientType | null = null;
  private isConnected = false;
  private keyPrefix: string;

  constructor() {
    // Initialize key prefix from environment variables
    this.keyPrefix = env.REDIS_KEY_PREFIX || env.APP_NAME || 'default';
  }

  async connect(): Promise<void> {
    if (this.client || !env.REDIS_URL) {
      return;
    }

    try {
      this.client = createClient({
        url: env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
        }
      });

      this.client.on('error', (err) => {
        if (err.message.includes('NOAUTH')) {
          logger.error('Redis authentication failed. Please check your Redis URL includes correct credentials or disable auth on Redis server.');
        } else {
          logger.error('Redis Client Error:', err);
        }
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      if (error instanceof Error && error.message.includes('NOAUTH')) {
        logger.error('Redis connection failed due to authentication error. Please check your Redis configuration:', error.message);
        logger.info('Solutions: 1) Add password to REDIS_URL (redis://:password@localhost:6379) 2) Disable Redis AUTH in redis.conf 3) Set REDIS_URL to empty to disable caching');
      } else {
        logger.error('Failed to connect to Redis:', error);
      }
      this.client = null;
      this.isConnected = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        this.client = null;
        this.isConnected = false;
        logger.info('Redis client disconnected');
      } catch (error) {
        logger.error('Error disconnecting Redis:', error);
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) {
      logger.debug('Redis not available, cache miss for key:', key);
      return null;
    }

    try {
      const prefixedKey = this.getPrefixedKey(key);
      const data = await this.client.get(prefixedKey);
      if (data) {
        logger.debug('Cache hit for key:', key, 'prefixed:', prefixedKey);
        return JSON.parse(data) as T;
      }
      logger.debug('Cache miss for key:', key, 'prefixed:', prefixedKey);
      return null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      logger.debug('Redis not available, skipping cache set for key:', key);
      return false;
    }

    try {
      const ttl = ttlSeconds || env.CACHE_TTL_SECONDS;
      const prefixedKey = this.getPrefixedKey(key);
      await this.client.setEx(prefixedKey, ttl, JSON.stringify(value));
      logger.debug('Cache set for key:', key, 'prefixed:', prefixedKey, 'TTL:', ttl);
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      logger.debug('Redis not available, skipping cache delete for key:', key);
      return false;
    }

    try {
      const prefixedKey = this.getPrefixedKey(key);
      const result = await this.client.del(prefixedKey);
      logger.debug('Cache delete for key:', key, 'prefixed:', prefixedKey, 'Result:', result);
      return result > 0;
    } catch (error) {
      logger.error('Redis delete error:', error);
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    if (!this.client || !this.isConnected) {
      logger.debug('Redis not available, skipping pattern delete:', pattern);
      return 0;
    }

    try {
      const prefixedPattern = this.getPrefixedKey(pattern);
      const keys = await this.client.keys(prefixedPattern);
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.client.del(keys);
      logger.debug('Cache pattern delete:', pattern, 'prefixed:', prefixedPattern, 'Keys deleted:', result);
      return result;
    } catch (error) {
      logger.error('Redis pattern delete error:', error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      const prefixedKey = this.getPrefixedKey(key);
      const result = await this.client.exists(prefixedKey);
      return result === 1;
    } catch (error) {
      logger.error('Redis exists error:', error);
      return false;
    }
  }

  async flush(): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      await this.client.flushDb();
      logger.info('Redis cache flushed');
      return true;
    } catch (error) {
      logger.error('Redis flush error:', error);
      return false;
    }
  }

  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  // Helper method to add prefix to keys
  private getPrefixedKey(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }

  // Get the current key prefix
  getKeyPrefix(): string {
    return this.keyPrefix || env.REDIS_KEY_PREFIX || env.APP_NAME || 'default';
  }

  // Legacy cache key generators (deprecated - use CacheKey utility instead)
  // These methods are kept for backward compatibility but should be replaced
  generateUserKey(id: string): string {
    return `user:${id}`;
  }

  generateUsersListKey(page?: number, limit?: number): string {
    if (page && limit) {
      return `users:list:page:${page}:limit:${limit}`;
    }
    return 'users:list:all';
  }

  generateUserByEmailKey(email: string): string {
    return `user:email:${email}`;
  }
}

export const cacheService = new CacheService();