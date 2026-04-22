// src/utils/ApiResponse.ts
// Standarisasi format response API agar konsisten di seluruh aplikasi.
// Semua endpoint WAJIB menggunakan class ini — bukan res.json({}) manual.

import { Response } from 'express';

interface ApiResponsePayload<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
}

export class ApiResponse {
  /**
   * 200 OK — Permintaan berhasil diproses
   */
  static success<T>(res: Response, message: string, data?: T, statusCode = 200): Response {
    const payload: ApiResponsePayload<T> = { success: true, message, data };
    return res.status(statusCode).json(payload);
  }

  /**
   * 201 Created — Resource baru berhasil dibuat
   */
  static created<T>(res: Response, message: string, data?: T): Response {
    return ApiResponse.success(res, message, data, 201);
  }

  /**
   * 4xx Error — Kesalahan dari sisi klien (validasi, auth, dll)
   */
  static error(res: Response, message: string, statusCode = 400, errors?: unknown): Response {
    const payload: ApiResponsePayload<null> = { success: false, message, errors };
    return res.status(statusCode).json(payload);
  }

  /**
   * 401 Unauthorized — Token tidak ada atau tidak valid
   */
  static unauthorized(res: Response, message = 'Akses ditolak. Silakan login terlebih dahulu.'): Response {
    return ApiResponse.error(res, message, 401);
  }

  /**
   * 403 Forbidden — Token valid tapi role tidak memiliki akses
   */
  static forbidden(res: Response, message = 'Anda tidak memiliki izin untuk mengakses sumber daya ini.'): Response {
    return ApiResponse.error(res, message, 403);
  }

  /**
   * 404 Not Found
   */
  static notFound(res: Response, message = 'Data tidak ditemukan.'): Response {
    return ApiResponse.error(res, message, 404);
  }

  /**
   * 500 Internal Server Error
   */
  static serverError(res: Response, message = 'Terjadi kesalahan pada server.'): Response {
    return ApiResponse.error(res, message, 500);
  }
}
