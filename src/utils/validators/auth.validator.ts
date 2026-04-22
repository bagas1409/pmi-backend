// src/utils/validators/auth.validator.ts
// Zod v4 compatible — breaking changes dari v3:
// - `required_error` dihapus, gunakan `error` atau `.min(1)`
// - `z.enum` butuh `as const` atau array literal

import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi.')
    .email('Format email tidak valid.'),

  password: z
    .string()
    .min(8, 'Password minimal 8 karakter.')
    .regex(/[A-Z]/, 'Password harus mengandung minimal 1 huruf kapital.')
    .regex(/[0-9]/, 'Password harus mengandung minimal 1 angka.'),

  fullName: z
    .string()
    .min(3, 'Nama lengkap minimal 3 karakter.'),

  nik: z
    .string()
    .length(16, 'NIK harus tepat 16 digit.')
    .regex(/^\d+$/, 'NIK hanya boleh berisi angka.'),

  whatsappNumber: z
    .string()
    .min(10, 'Nomor WhatsApp minimal 10 digit.')
    .regex(/^\d+$/, 'Nomor WhatsApp hanya boleh berisi angka.'),

  bloodType: z
    .enum(['A', 'B', 'AB', 'O'] as const).optional()
});

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi.')
    .email('Format email tidak valid.'),

  password: z
    .string()
    .min(1, 'Password tidak boleh kosong.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput    = z.infer<typeof loginSchema>;
