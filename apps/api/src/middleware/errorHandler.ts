import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, code: err.code },
    });
  }

  // Prisma not-found
  if ((err as any).code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: { message: 'Resource not found', code: 'NOT_FOUND' },
    });
  }

  // Prisma unique constraint
  if ((err as any).code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: { message: 'Resource already exists', code: 'CONFLICT' },
    });
  }

  logger.error('Unhandled error', { error: err.message, stack: err.stack });

  return res.status(500).json({
    success: false,
    error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
  });
}
