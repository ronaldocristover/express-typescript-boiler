import { Response, Request, NextFunction } from "express";
import { ZodError } from "zod";
import { ResponseError } from "../errors/response-error";
import { logger } from "../application/logging";
import { env } from "../application/env.validation";
import { handlePrismaError, isPrismaError } from "../utils/prisma-error.util";

export const errorMiddleware = async (error: Error, req: Request, res: Response, next: NextFunction) => {
    // Generate correlation ID for error tracking
    const errorId = req.correlationId || `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Log all errors for monitoring (server-side only)
    logger.error("Error occurred", {
        errorId,
        name: error.name,
        message: error.message,
        // Only log stack trace in development
        ...(env.NODE_ENV === 'development' && { stack: error.stack }),
        request: {
            path: req.path,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            correlationId: req.correlationId
        }
    });

    // Handle Zod validation errors
    if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
        }));

        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: formattedErrors,
            errorId
        });
    }

    // Handle custom ResponseError
    if (error instanceof ResponseError) {
        return res.status(error.status).json({
            success: false,
            message: error.message,
            errorId
        });
    }

    // Handle Prisma database errors
    if (isPrismaError(error)) {
        const prismaError = handlePrismaError(error);
        return res.status(prismaError.status).json({
            success: false,
            message: prismaError.message,
            code: prismaError.code,
            errorId
        });
    }

    // Handle other common errors
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: "Invalid data provided",
            errorId
        });
    }

    if (error.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: "Invalid ID format",
            errorId
        });
    }

    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: "Invalid authentication token",
            errorId
        });
    }

    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: "Authentication token has expired",
            errorId
        });
    }

    // Handle rate limiting errors
    if (error.message.includes('Too many requests')) {
        return res.status(429).json({
            success: false,
            message: "Too many requests, please try again later",
            errorId
        });
    }

    // Default server error - never expose internal details to client
    return res.status(500).json({
        success: false,
        message: "Internal server error",
        errorId,
        // For development, you can check logs with the errorId
        ...(env.NODE_ENV === 'development' && {
            note: `Check server logs for error details using errorId: ${errorId}`
        })
    });
}
