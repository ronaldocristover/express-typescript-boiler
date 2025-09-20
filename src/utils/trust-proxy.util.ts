import { env } from '../application/env.validation';
import { logger } from '../application/logging';

/**
 * Trust Proxy Configuration Utility
 * Provides secure trust proxy settings based on environment configuration
 */

export type TrustProxyConfig = boolean | string | string[] | number | ((ip: string, hopIndex: number) => boolean);

/**
 * Parse and validate trust proxy configuration from environment variables
 * @returns Safe trust proxy configuration for Express
 */
export function getTrustProxyConfig(): TrustProxyConfig {
  const trustProxySetting = env.TRUST_PROXY?.toLowerCase();

  switch (trustProxySetting) {
    case 'false':
    case '':
    case undefined:
      logger.info('Trust proxy disabled for security');
      return false;

    case 'true':
      // Only allow in development - log warning for production
      if (env.NODE_ENV === 'production') {
        logger.error('Trust proxy "true" is dangerous in production! Using secure default instead.');
        return false;
      } else {
        logger.warn('Trust proxy set to "true" - only safe in development');
        return true;
      }

    case 'loopback':
      logger.info('Trust proxy configured for loopback only');
      return 'loopback';

    case 'linklocal':
      logger.info('Trust proxy configured for link-local addresses');
      return 'linklocal';

    case 'uniquelocal':
      logger.info('Trust proxy configured for unique local addresses');
      return 'uniquelocal';

    default:
      // Handle numeric values (hop count)
      const hopCount = parseInt(trustProxySetting, 10);
      if (!isNaN(hopCount) && hopCount > 0) {
        logger.info(`Trust proxy configured for ${hopCount} hops`);
        return hopCount;
      }

      // Handle IP addresses/subnets
      if (env.TRUSTED_PROXY_IPS) {
        const trustedIPs = env.TRUSTED_PROXY_IPS.split(',').map(ip => ip.trim());
        logger.info('Trust proxy configured for specific IPs', { trustedIPs });
        return trustedIPs;
      }

      // Fallback to secure default
      logger.warn(`Invalid trust proxy setting "${trustProxySetting}", using secure default`);
      return false;
  }
}

/**
 * Get trust proxy configuration with validation
 * Ensures secure defaults and validates configuration
 */
export function getSecureTrustProxyConfig(): TrustProxyConfig {
  const config = getTrustProxyConfig();

  // Additional security validation
  if (env.NODE_ENV === 'production') {
    if (config === true) {
      logger.error('SECURITY WARNING: Trust proxy "true" blocked in production');
      return false;
    }

    if (Array.isArray(config) && config.length === 0) {
      logger.warn('Empty trusted proxy list in production, disabling trust proxy');
      return false;
    }
  }

  return config;
}

/**
 * Common trust proxy configurations for different deployment scenarios
 */
export const TrustProxyPresets = {
  // Local development
  DEVELOPMENT: true,

  // Behind Nginx/Apache reverse proxy
  REVERSE_PROXY: 'loopback',

  // Behind load balancer (1 hop)
  LOAD_BALANCER: 1,

  // Behind Cloudflare
  CLOUDFLARE: [
    '173.245.48.0/20',
    '103.21.244.0/22',
    '103.22.200.0/22',
    '103.31.4.0/22',
    '141.101.64.0/18',
    '108.162.192.0/18',
    '190.93.240.0/20',
    '188.114.96.0/20',
    '197.234.240.0/22',
    '198.41.128.0/17',
    '162.158.0.0/15',
    '104.16.0.0/13',
    '104.24.0.0/14',
    '172.64.0.0/13',
    '131.0.72.0/22'
  ],

  // AWS Application Load Balancer
  AWS_ALB: 'linklocal',

  // Google Cloud Load Balancer
  GCP_LB: 'linklocal',

  // Azure Load Balancer
  AZURE_LB: 'linklocal',

  // No proxy (direct connection)
  NONE: false
} as const;

/**
 * Validate if an IP address is from a trusted source
 * @param ip - IP address to validate
 * @param trustedConfig - Trust proxy configuration
 * @returns Whether the IP is trusted
 */
export function isIPTrusted(ip: string, trustedConfig: TrustProxyConfig): boolean {
  if (trustedConfig === false) {
    return false;
  }

  if (trustedConfig === true) {
    return true; // Warning: This is unsafe in production
  }

  if (Array.isArray(trustedConfig)) {
    // Check if IP matches any of the trusted IPs/subnets
    return trustedConfig.some(trustedIP => {
      if (trustedIP.includes('/')) {
        // CIDR subnet matching would need additional validation
        // This is a simplified check
        return ip.startsWith(trustedIP.split('/')[0]);
      }
      return ip === trustedIP;
    });
  }

  if (typeof trustedConfig === 'string') {
    switch (trustedConfig) {
      case 'loopback':
        return ip === '127.0.0.1' || ip === '::1';
      case 'linklocal':
        return ip.startsWith('169.254.') || ip.startsWith('fe80:');
      case 'uniquelocal':
        return ip.startsWith('10.') || ip.startsWith('172.16.') || ip.startsWith('192.168.') || ip.startsWith('fc00:');
      default:
        return false;
    }
  }

  return false;
}