import rateLimit from 'express-rate-limit';
import { env } from '../application/env.validation';

/**
 * Rate Limiter Factory Functions
 * These create rate limiters after trust proxy configuration is set
 */

export const createGeneralLimiter = () => rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: env.RATE_LIMIT_MAX_REQUESTS || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting validation if trust proxy is disabled in development
  skip: env.NODE_ENV === 'development' && env.TRUST_PROXY === 'false' ? () => true : undefined,
});

export const createAuthLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: env.NODE_ENV === 'development' && env.TRUST_PROXY === 'false' ? () => true : undefined,
});

export const createApiLimiter = () => rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute for API endpoints
  message: {
    error: 'API rate limit exceeded, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: env.NODE_ENV === 'development' && env.TRUST_PROXY === 'false' ? () => true : undefined,
});

// Legacy exports for backward compatibility (will be created after trust proxy setup)
export let generalLimiter: ReturnType<typeof createGeneralLimiter>;
export let authLimiter: ReturnType<typeof createAuthLimiter>;
export let apiLimiter: ReturnType<typeof createApiLimiter>;

/**
 * Initialize rate limiters after trust proxy configuration
 * This must be called after trust proxy is configured
 */
export const initializeRateLimiters = () => {
  generalLimiter = createGeneralLimiter();
  authLimiter = createAuthLimiter();
  apiLimiter = createApiLimiter();
};