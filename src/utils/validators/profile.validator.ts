import { z } from 'zod';

export const completeProfileSchema = z.object({
  gender: z.enum(['MALE', 'FEMALE']),
  birthPlace: z.string().min(1, 'Tempat lahir wajib diisi'),
  birthDate: z.string().min(1, 'Tanggal lahir wajib diisi').transform((str) => new Date(str)),
  address: z.string().min(1, 'Alamat domisili wajib diisi'),
  village: z.string().min(1, 'Kelurahan wajib diisi'),
  subdistrict: z.string().min(1, 'Kecamatan wajib diisi'),
  city: z.string().min(1, 'Kabupaten/Kota wajib diisi'),
  job: z.string().min(1, 'Pekerjaan wajib diisi'),
  maritalStatus: z.string().min(1, 'Status pernikahan wajib diisi'),
  bloodType: z.enum(['A', 'B', 'AB', 'O'] as const, { error: 'Golongan darah wajib diisi' }),
});

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;

// ── Schema untuk update golongan darah ──────────────────────
export const updateBloodTypeSchema = z.object({
  bloodType: z.enum(['A', 'B', 'AB', 'O']),
});

export type UpdateBloodTypeInput = z.infer<typeof updateBloodTypeSchema>;
