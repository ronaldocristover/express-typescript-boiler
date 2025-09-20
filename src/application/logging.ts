import winston from "winston";
import LokiTransport from "winston-loki";
import { env } from "./env.validation";

const { combine, timestamp, json, errors, colorize, simple } = winston.format;

// Create transports array based on environment
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: env.NODE_ENV === 'development'
      ? combine(colorize(), simple())
      : combine(timestamp(), json())
  })
];

// Add Loki transport if host is configured
if (env.LOKI_HOST) {
  transports.push(
    new LokiTransport({
      host: env.LOKI_HOST,
      labels: {
        app: env.APP_NAME,
        env: env.NODE_ENV,
        hostname: env.HOSTNAME
      },
      json: true,
      format: winston.format.json(),
    })
  );
}

// Configure Winston logger with structured logging
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: env.APP_NAME },
  transports,
});

// Add request correlation to logger
export const createLoggerWithCorrelation = (correlationId: string) => {
  return logger.child({ correlationId });
};
