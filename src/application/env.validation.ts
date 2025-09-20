import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().transform(Number).default('8888'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Logging configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOKI_HOST: z.string().optional(),
  LOKI_PORT: z.string().transform(Number).optional(),
  APP_NAME: z.string().default('express-api'),
  HOSTNAME: z.string().default('localhost'),

  // JWT configuration
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  // Cache (Redis)
  REDIS_URL: z.string().optional(),
  CACHE_TTL_SECONDS: z.string().transform(Number).default('3600'),

  // Database Pool
  DB_POOL_MAX: z.string().transform(Number).default('10'),
  DB_POOL_TIMEOUT: z.string().transform(Number).default('20000'),

  // RabbitMQ configuration
  RABBITMQ_URL: z.string().default('amqp://localhost'),
  RABBITMQ_EXCHANGE: z.string().default('app_exchange'),
  RABBITMQ_QUEUE_PREFIX: z.string().default('app_queue'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment validation failed:');
      error.issues.forEach((issue) => {
        console.error(`- ${issue.path.join('.')}: ${issue.message}`);
      });
    }
    process.exit(1);
  }
}

export const env = validateEnv();