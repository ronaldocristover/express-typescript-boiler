import winston from "winston";
import LokiTransport from "winston-loki";
const { combine, timestamp, json, errors } = winston.format;

// Configure Winston logger with Loki transport
export const logger = winston.createLogger({
  level: "info",
  format: combine(timestamp(), errors({ stack: true }), json()),
  transports: [
    new winston.transports.Console(),
    new LokiTransport({
      host: process.env.LOKI_HOST || "http://127.0.0.1:3100",
      labels: {
        app: process.env.APP_NAME || "service-app",
        env: process.env.NODE_ENV || "development",
      },
      json: true,
      format: winston.format.json(),
    }),
  ],
});
