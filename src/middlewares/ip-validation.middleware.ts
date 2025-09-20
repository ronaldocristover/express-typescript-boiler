import { Request, Response, NextFunction } from 'express';
import { logger } from '../application/logging';
import { env } from '../application/env.validation';
import { getSecureTrustProxyConfig, isIPTrusted } from '../utils/trust-proxy.util';

interface IPValidationOptions {
  logSuspiciousActivity?: boolean;
  blockSuspiciousIPs?: boolean;
  maxHeadersPerRequest?: number;
}

/**
 * IP Validation Middleware
 * Provides additional security validation for request IPs and proxy headers
 */
export const ipValidationMiddleware = (options: IPValidationOptions = {}) => {
  const {
    logSuspiciousActivity = true,
    blockSuspiciousIPs = false,
    maxHeadersPerRequest = 10
  } = options;

  const trustProxyConfig = getSecureTrustProxyConfig();

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientIP = req.ip;
      const forwardedFor = req.get('X-Forwarded-For');
      const realIP = req.get('X-Real-IP');
      const forwardedHost = req.get('X-Forwarded-Host');
      const forwardedProto = req.get('X-Forwarded-Proto');

      // Count proxy-related headers
      const proxyHeaders = [
        req.get('X-Forwarded-For'),
        req.get('X-Real-IP'),
        req.get('X-Forwarded-Host'),
        req.get('X-Forwarded-Proto'),
        req.get('X-Forwarded-Port'),
        req.get('CF-Connecting-IP'),
        req.get('CF-Ray'),
        req.get('True-Client-IP')
      ].filter(Boolean);

      // Security validations
      const suspiciousIndicators: string[] = [];

      // Check for excessive proxy headers (potential spoofing)
      if (proxyHeaders.length > maxHeadersPerRequest) {
        suspiciousIndicators.push(`excessive_proxy_headers:${proxyHeaders.length}`);
      }

      // Check for conflicting IP addresses
      if (forwardedFor && realIP) {
        const forwardedIPs = forwardedFor.split(',').map(ip => ip.trim());
        if (!forwardedIPs.includes(realIP)) {
          suspiciousIndicators.push('conflicting_ip_headers');
        }
      }

      // Check for suspicious IP patterns
      if (clientIP) {
        // Private IP ranges appearing as client IP when not configured for it
        if (trustProxyConfig === false && isPrivateIP(clientIP)) {
          suspiciousIndicators.push('private_ip_without_proxy');
        }

        // Common spoofing patterns
        if (clientIP === '127.0.0.1' && forwardedFor && !isIPTrusted(clientIP, trustProxyConfig)) {
          suspiciousIndicators.push('localhost_with_forwarded');
        }
      }

      // Check for header injection attempts
      if (forwardedFor && containsSuspiciousCharacters(forwardedFor)) {
        suspiciousIndicators.push('header_injection_attempt');
      }

      // Log and handle suspicious activity
      if (suspiciousIndicators.length > 0) {
        const logData = {
          clientIP,
          forwardedFor,
          realIP,
          forwardedHost,
          forwardedProto,
          userAgent: req.get('User-Agent'),
          url: req.url,
          method: req.method,
          suspiciousIndicators,
          correlationId: req.correlationId
        };

        if (logSuspiciousActivity) {
          logger.warn('Suspicious IP/proxy activity detected', logData);
        }

        if (blockSuspiciousIPs && env.NODE_ENV === 'production') {
          logger.error('Blocking suspicious request', logData);
          return res.status(403).json({
            error: 'Request blocked due to security validation',
            correlationId: req.correlationId
          });
        }
      }

      // Add IP validation info to request for debugging
      (req as any).ipValidation = {
        clientIP,
        proxyHeaderCount: proxyHeaders.length,
        trustProxyEnabled: trustProxyConfig !== false,
        suspiciousCount: suspiciousIndicators.length
      };

      next();
    } catch (error) {
      logger.error('IP validation middleware error', {
        error,
        correlationId: req.correlationId
      });
      // Don't block requests on middleware errors
      next();
    }
  };
};

/**
 * Check if an IP address is in private ranges
 */
function isPrivateIP(ip: string): boolean {
  if (!ip) return false;

  // IPv4 private ranges
  const privateRanges = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^127\./,                   // 127.0.0.0/8 (loopback)
    /^169\.254\./,              // 169.254.0.0/16 (link-local)
    /^::1$/,                    // IPv6 loopback
    /^fe80:/,                   // IPv6 link-local
    /^fc00:/,                   // IPv6 unique local
  ];

  return privateRanges.some(range => range.test(ip));
}

/**
 * Check for suspicious characters that might indicate header injection
 */
function containsSuspiciousCharacters(header: string): boolean {
  // Check for null bytes, newlines, or other control characters
  const suspiciousPatterns = [
    /\x00/,        // null byte
    /[\r\n]/,      // newlines
    /[^\x20-\x7E\s]/, // non-printable characters (except space)
    /<script/i,    // script tags
    /javascript:/i, // javascript protocol
  ];

  return suspiciousPatterns.some(pattern => pattern.test(header));
}

/**
 * Rate limiting enhancement middleware
 * Provides additional context for rate limiting decisions
 */
export const enhancedRateLimitContext = (req: Request, _res: Response, next: NextFunction) => {
  // Add additional context for rate limiting
  const clientIP = req.ip;
  const userAgent = req.get('User-Agent') || '';
  const acceptLanguage = req.get('Accept-Language') || '';

  // Create a more sophisticated fingerprint for rate limiting
  const fingerprint = {
    ip: clientIP,
    userAgent: userAgent.substring(0, 100), // Limit length
    acceptLanguage: acceptLanguage.substring(0, 50),
    hasProxyHeaders: !!(req.get('X-Forwarded-For') || req.get('X-Real-IP'))
  };

  // Add fingerprint to request for use by rate limiters
  (req as any).clientFingerprint = fingerprint;

  next();
};

/**
 * Middleware to validate and normalize client IP
 */
export const normalizeClientIP = (req: Request, _res: Response, next: NextFunction) => {
  const originalIP = req.ip;
  const forwardedFor = req.get('X-Forwarded-For');

  // Log IP resolution for debugging
  logger.debug('Client IP resolution', {
    originalIP,
    forwardedFor,
    trustProxy: getSecureTrustProxyConfig(),
    correlationId: req.correlationId
  });

  // Store original values for security analysis
  (req as any).ipInfo = {
    resolvedIP: originalIP,
    originalHeaders: {
      'x-forwarded-for': forwardedFor,
      'x-real-ip': req.get('X-Real-IP'),
      'x-forwarded-host': req.get('X-Forwarded-Host')
    }
  };

  next();
};