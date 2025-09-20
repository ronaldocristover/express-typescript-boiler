import express from "express";
import { errorMiddleware } from "./middlewares/error.middleware";
import { requestContextMiddleware } from "./middlewares/request-context.middleware";
import { generalLimiter, apiLimiter } from "./middlewares/rate-limit.middleware";
import { logger } from "./application/logging";
import { env } from "./application/env.validation";
import compression from "compression";
import helmet from "helmet";

import userRoutes from "./routes/user.route";
import healthRoutes from "./routes/health.route";
import cacheRoutes from "./routes/cache.route";
import messageRoutes from "./routes/message.route";
import cors from "cors";

const app = express();

// Request context and logging (before other middleware)
app.use(requestContextMiddleware);

// Security middleware
app.use(helmet());
app.use(generalLimiter);

// CORS configuration
app.use(cors({
  origin: env.ALLOWED_ORIGINS.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-TOKEN']
}));

app.use(compression()); // Place early in middleware chain
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.set("trust proxy", true);

// Health check endpoint (no rate limiting)
app.use("/health", healthRoutes);

// Cache management endpoint (with rate limiting for security)
app.use("/cache", apiLimiter, cacheRoutes);

// API routes with rate limiting
app.use("/api/users", apiLimiter, userRoutes);
app.use("/api/messages", apiLimiter, messageRoutes);

app.use(errorMiddleware);

app.get("/", (_req, res) => {
  logger.debug("Ini Debug");
  logger.info("Processing request", { data: "value" });
  logger.log("info", "Processing request with structured logging", {
    data: "value",
  });
  logger.error(new Error("This is an error log"));
  res
    .status(200)
    .json({ message: "Welcome to the Express-Prisma-Repo CRUD API!" });
});

app.get("/error", (_req, res) => {
  try {
    throw new Error("Something went wrong!");
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

export default app;
