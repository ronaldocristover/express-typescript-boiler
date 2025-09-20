/**
 * Prisma Error Handler Utility
 * Converts Prisma errors into user-friendly messages without exposing sensitive data
 */

import { Prisma } from '@prisma/client';
import { logger } from '../application/logging';

export interface SafeErrorResponse {
  status: number;
  message: string;
  code?: string;
}

/**
 * Convert Prisma errors to safe, user-friendly error responses
 */
export function handlePrismaError(error: any): SafeErrorResponse {
  // Log the full error for debugging (server-side only)
  logger.error('Prisma error occurred', {
    name: error.name,
    code: error.code,
    message: error.message,
    // Don't log full stack trace in production
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });

  // Handle Prisma Client Known Request Errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const field = error.meta?.target as string[] | undefined;
        const fieldName = field?.[0] || 'field';
        return {
          status: 409,
          message: `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} already exists`,
          code: 'DUPLICATE_ENTRY'
        };

      case 'P2025':
        // Record not found
        return {
          status: 404,
          message: 'Record not found',
          code: 'NOT_FOUND'
        };

      case 'P2003':
        // Foreign key constraint violation
        return {
          status: 400,
          message: 'Invalid reference to related record',
          code: 'INVALID_REFERENCE'
        };

      case 'P2014':
        // Required relation violation
        return {
          status: 400,
          message: 'Invalid data: missing required relation',
          code: 'MISSING_RELATION'
        };

      case 'P2015':
        // Related record not found
        return {
          status: 400,
          message: 'Related record not found',
          code: 'RELATED_NOT_FOUND'
        };

      case 'P2021':
        // Table does not exist
        return {
          status: 500,
          message: 'Service temporarily unavailable',
          code: 'SERVICE_ERROR'
        };

      case 'P2022':
        // Column does not exist
        return {
          status: 500,
          message: 'Service configuration error',
          code: 'SERVICE_ERROR'
        };

      default:
        // Other Prisma known errors
        return {
          status: 400,
          message: 'Invalid request data',
          code: 'INVALID_DATA'
        };
    }
  }

  // Handle Prisma Client Validation Errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      status: 400,
      message: 'Invalid data format provided',
      code: 'VALIDATION_ERROR'
    };
  }

  // Handle Prisma Client Initialization Errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      status: 503,
      message: 'Database service temporarily unavailable',
      code: 'SERVICE_UNAVAILABLE'
    };
  }

  // Handle Prisma Client Rust Panic Errors
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return {
      status: 500,
      message: 'Internal service error',
      code: 'INTERNAL_ERROR'
    };
  }

  // Handle Prisma Client Unknown Request Errors
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return {
      status: 500,
      message: 'Unexpected service error',
      code: 'UNKNOWN_ERROR'
    };
  }

  // Not a Prisma error - return null to let other handlers deal with it
  return {
    status: 500,
    message: 'Internal server error',
    code: 'UNKNOWN_ERROR'
  };
}

/**
 * Check if an error is a Prisma error
 */
export function isPrismaError(error: any): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  );
}

/**
 * Get user-friendly error messages for common Prisma error codes
 */
export const PRISMA_ERROR_MESSAGES: Record<string, string> = {
  P2002: 'This record already exists',
  P2025: 'Record not found',
  P2003: 'Cannot delete record due to existing references',
  P2014: 'Required relation is missing',
  P2015: 'Related record could not be found',
  P2021: 'Database table is missing',
  P2022: 'Database column is missing'
};

/**
 * Extract field name from Prisma error meta for better error messages
 */
export function extractFieldFromPrismaError(error: Prisma.PrismaClientKnownRequestError): string | null {
  if (error.code === 'P2002' && error.meta?.target) {
    const target = error.meta.target as string | string[];
    if (Array.isArray(target)) {
      return target[0];
    }
    return target;
  }
  return null;
}