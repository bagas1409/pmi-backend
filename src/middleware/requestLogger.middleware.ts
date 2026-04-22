// src/middleware/requestLogger.middleware.ts
// Mencatat setiap HTTP request yang masuk ke server secara real-time.
// Output: [timestamp] [INFO] (HTTP) METHOD /path - STATUS - XXms

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  // Hook ke event 'finish' agar kita bisa log SETELAH response terkirim
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const method = req.method;
    const path = req.originalUrl;

    // Warnai berdasarkan status code
    let level: 'success' | 'warn' | 'error' | 'info' = 'info';
    if (statusCode >= 500) level = 'error';
    else if (statusCode >= 400) level = 'warn';
    else if (statusCode >= 200) level = 'success';

    logger[level]('HTTP', `${method} ${path} → ${statusCode} (${duration}ms)`);
  });

  next();
};
