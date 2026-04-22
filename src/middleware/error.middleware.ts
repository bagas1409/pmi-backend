// src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiResponse } from '../utils/ApiResponse';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  logger.error('ErrorHandler', `${req.method} ${req.path} — ${err.message}`);

  if (err instanceof ZodError) {
    ApiResponse.error(res, 'Validasi data gagal.', 422, err.flatten().fieldErrors);
    return;
  }

  const message =
    process.env.NODE_ENV === 'development' ? err.message : 'Terjadi kesalahan pada server.';

  ApiResponse.serverError(res, message);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  logger.warn('NotFound', `${req.method} ${req.path}`);
  ApiResponse.notFound(res, `Route '${req.method} ${req.path}' tidak ditemukan.`);
};
