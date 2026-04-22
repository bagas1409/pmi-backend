// src/middleware/auth.middleware.ts
// Middleware RBAC (Role-Based Access Control) berbasis JWT.
//
// CARA KERJA:
// 1. `verifyToken`   → Wajib ada di semua route yang butuh login
// 2. `authorizeRole` → Opsional, dipasang SETELAH verifyToken untuk pembatasan role
//
// CONTOH PENGGUNAAN DI ROUTE:
//   router.get('/admin/users', verifyToken, authorizeRole('ADMIN_PMI'), handler)
//   router.get('/profile', verifyToken, handler)

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { ApiResponse } from '../utils/ApiResponse';

interface JwtPayload {
  id: string;
  email: string;
  role: Role;
}

/**
 * Middleware 1: verifyToken
 * Memvalidasi JWT dari header Authorization.
 * Jika valid, menyuntikkan data user ke req.user untuk digunakan di controller.
 */
export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  // Format header yang diterima: "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ApiResponse.unauthorized(res);
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET tidak dikonfigurasi di environment');

    const decoded = jwt.verify(token, secret) as JwtPayload;

    // Suntikkan data user ke dalam request object
    // Tipe `req.user` sudah didefinisikan di src/types/express.d.ts
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    // Token expired atau signature tidak valid
    ApiResponse.unauthorized(res, 'Token tidak valid atau sudah kadaluarsa. Silakan login ulang.');
  }
};

/**
 * Middleware: optionalVerifyToken
 * Sama seperti verifyToken, namun JIKA token tidak ada / tidak valid, ia tidak melempar 401 error.
 * Sebaliknya, dia membiarkan req.user kosong lalu melanjutkannya ke route.
 */
export const optionalVerifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET;
    if (secret) {
      const decoded = jwt.verify(token, secret) as JwtPayload;
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };
    }
  } catch (error) {
    // Abaikan jika token invalid (krn opsional)
  }
  next();
};

/**
 * Middleware 2: authorizeRole (Higher-Order Function)
 * Menerima satu atau lebih role yang diizinkan.
 * HARUS dipasang setelah `verifyToken`.
 *
 * Contoh: authorizeRole('ADMIN_PMI')
 * Contoh: authorizeRole('ADMIN_PMI', 'USER') — izinkan keduanya
 */
export const authorizeRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Jika verifyToken belum dipasang sebelumnya, req.user akan undefined
    if (!req.user) {
      ApiResponse.unauthorized(res);
      return;
    }

    const hasPermission = allowedRoles.includes(req.user.role);

    if (!hasPermission) {
      ApiResponse.forbidden(
        res,
        `Akses hanya untuk: ${allowedRoles.join(', ')}. Role Anda: ${req.user.role}`
      );
      return;
    }

    next();
  };
};
