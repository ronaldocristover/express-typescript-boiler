import { Response, Request, NextFunction } from "express";
import { ZodError } from "zod";
import { ResponseError } from "../errors/response-error";
import { logger } from "../application/logging";
import { env } from "../application/env.validation";

export const errorMiddleware = async (error: Error, req: Request, res: Response, next: NextFunction) => {
    // Log all errors for monitoring
    logger.error("Error occurred", {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
        }));

        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: formattedErrors
        });
    }

    if (error instanceof ResponseError) {
        return res.status(error.status).json({
            success: false,
            message: error.message,
            ...(env.NODE_ENV === 'development' && { stack: error.stack })
        });
    }

    // Database/Prisma errors
    if (error.message.includes('Unique constraint')) {
        return res.status(409).json({
            success: false,
            message: "Resource already exists"
        });
    }

    if (error.message.includes('Record to update not found')) {
        return res.status(404).json({
            success: false,
            message: "Resource not found"
        });
    }

    // Default server error
    return res.status(500).json({
        success: false,
        message: env.NODE_ENV === 'production'
            ? "Internal server error"
            : error.message,
        ...(env.NODE_ENV === 'development' && { stack: error.stack })
    });
}
