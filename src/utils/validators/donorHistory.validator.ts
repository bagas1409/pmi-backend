// src/utils/validators/donorHistory.validator.ts
// Validasi untuk pencatatan riwayat donor baru oleh Admin.

import { z } from 'zod';

export const createDonorHistorySchema = z.object({
  userId: z
    .string()
    .uuid('ID Pengguna tidak valid.'),
  locationName: z
    .string()
    .min(3, 'Nama lokasi minimal 3 karakter.')
    .max(100, 'Nama lokasi maksimal 100 karakter.'),
  donationDate: z
    .string()
    .datetime('Format tanggal harus berupa ISO 8601 (YYYY-MM-DDTHH:mm:ssZ).')
    .optional(),
});

export type CreateDonorHistoryInput = z.infer<typeof createDonorHistorySchema>;
