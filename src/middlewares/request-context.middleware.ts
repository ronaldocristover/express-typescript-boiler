import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createLoggerWithCorrelation } from '../application/logging';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      logger: ReturnType<typeof createLoggerWithCorrelation>;
    }
  }
}

export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Extract or generate correlation ID
  const correlationId = req.headers['x-request-id'] as string ||
                       req.headers['x-correlation-id'] as string ||
                       uuidv4();

  // Add correlation ID to request
  req.correlationId = correlationId;

  // Create logger with correlation ID
  req.logger = createLoggerWithCorrelation(correlationId);

  // Add correlation ID to response headers
  res.setHeader('X-Request-ID', correlationId);

  // Log incoming request
  const startTime = Date.now();
  req.logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    req.logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  });

  next();
};