// src/utils/validators/user.validator.ts
import { z } from 'zod';

export const adminRegisterDonorSchema = z.object({
  // Wajib
  email: z.string().min(1, 'Email wajib diisi.').email('Format email tidak valid.'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter.')
    .regex(/[A-Z]/, 'Password harus mengandung minimal 1 huruf kapital.')
    .regex(/[0-9]/, 'Password harus mengandung minimal 1 angka.'),
  fullName: z.string().min(3, 'Nama lengkap minimal 3 karakter.'),
  nik: z
    .string()
    .length(16, 'NIK harus tepat 16 digit.')
    .regex(/^\d+$/, 'NIK hanya boleh berisi angka.'),
  whatsappNumber: z
    .string()
    .min(10, 'Nomor WhatsApp minimal 10 digit.')
    .regex(/^\d+$/, 'Nomor WhatsApp hanya boleh berisi angka.'),

  // Opsional — data medis
  bloodType: z.enum(['A', 'B', 'AB', 'O'] as const).optional(),
  gender: z.enum(['MALE', 'FEMALE'] as const).optional(),

  // Opsional — biodata diri
  birthDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  birthPlace: z.string().optional(),
  job: z.string().optional(),
  maritalStatus: z.string().optional(),

  // Opsional — alamat
  address: z.string().optional(),
  village: z.string().optional(),
  subdistrict: z.string().optional(),
  city: z.string().optional(),
});

export type AdminRegisterDonorInput = z.infer<typeof adminRegisterDonorSchema>;

export const adminDonorinSchema = z.object({
  targetType: z.enum(['REGION', 'EVENT']),
  targetId: z.string().min(1, 'Target ID wajib diisi.'),
});

export type AdminDonorinInput = z.infer<typeof adminDonorinSchema>;
