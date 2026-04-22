// src/controllers/auth.controller.ts
// Controller hanya bertanggung jawab untuk:
// 1. Menerima request & memvalidasi input (via Zod)
// 2. Memanggil service yang tepat
// 3. Mengembalikan response yang terstandarisasi (via ApiResponse)
//
// TIDAK ADA logic bisnis atau query database di sini.

import { Request, Response } from 'express';
import { registerSchema, loginSchema } from '../utils/validators/auth.validator';
import { registerService, loginService, getMeService } from '../services/auth.service';
import { ApiResponse } from '../utils/ApiResponse';
import { logger } from '../utils/logger';

const CTX = 'AuthController';

// ── POST /api/v1/auth/register ──────────────────────────────────────
export const register = async (req: Request, res: Response): Promise<void> => {
  // Validasi input — jika gagal, ZodError dilempar ke global error handler
  const validatedData = registerSchema.parse(req.body);

  try {
    const result = await registerService(validatedData);
    ApiResponse.created(res, 'Registrasi berhasil! Selamat bergabung sebagai pendonor.', result);
  } catch (error: any) {
    const errorCode = error instanceof Error ? error.message : '';
    logger.warn(CTX, `Register error: ${errorCode}`);

    // Menangani error dari layanan auth
    if (errorCode === 'EMAIL_TAKEN') {
      return void ApiResponse.error(res, 'Email ini sudah terdaftar. Gunakan email lain atau coba login.', 409);
    } 
    if (errorCode === 'NIK_TAKEN') {
      return void ApiResponse.error(res, 'NIK ini sudah terdaftar di sistem. Hubungi PMI jika ada kesalahan.', 409);
    }

    // Menangani error spesifik dari Prisma (Contoh: Unique constraint P2002)
    if (error.code === 'P2002') {
      const targetStr = JSON.stringify(error.meta?.target || "");
      if (targetStr.includes('whatsapp')) {
        return void ApiResponse.error(res, 'Nomor WhatsApp ini sudah terdaftar di sistem. Gunakan nomor lain.', 409);
      }
      return void ApiResponse.error(res, 'Gagal mendaftar. Data ini (kemungkinan NIK/WA) sudah pernah digunakan.', 409);
    }

    // Jika terjadi error koneksi database atau hal lain
    ApiResponse.serverError(res, process.env.NODE_ENV === 'development' ? errorCode : 'Terjadi kesalahan pada server.');
  }
};

// ── POST /api/v1/auth/login ─────────────────────────────────────────
export const login = async (req: Request, res: Response): Promise<void> => {
  const validatedData = loginSchema.parse(req.body);

  try {
    const result = await loginService(validatedData);
    ApiResponse.success(res, 'Login berhasil.', result);
  } catch (error: unknown) {
    const errorCode = error instanceof Error ? error.message : '';
    logger.warn(CTX, `Login error: ${errorCode}`);

    if (errorCode === 'INVALID_CREDENTIALS') {
      ApiResponse.error(res, 'Email atau password salah.', 401);
    } else if (errorCode === 'ACCOUNT_INACTIVE') {
      ApiResponse.error(res, 'Akun Anda telah dinonaktifkan. Hubungi Admin PMI.', 403);
    } else {
      ApiResponse.serverError(res);
    }
  }
};

// ── GET /api/v1/auth/me ─────────────────────────────────────────────
// Route ini dilindungi oleh `verifyToken` middleware di router
export const getMe = async (req: Request, res: Response): Promise<void> => {
  // req.user sudah diisi oleh verifyToken middleware
  const userId = req.user!.id;

  try {
    const user = await getMeService(userId);
    ApiResponse.success(res, 'Data profil berhasil diambil.', user);
  } catch (error: unknown) {
    const errorCode = error instanceof Error ? error.message : '';
    logger.warn(CTX, `GetMe error: ${errorCode}`);

    if (errorCode === 'USER_NOT_FOUND') {
      ApiResponse.notFound(res, 'Profil pengguna tidak ditemukan.');
    } else {
      ApiResponse.serverError(res);
    }
  }
};
