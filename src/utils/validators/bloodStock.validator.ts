// src/utils/validators/bloodStock.validator.ts
// Skema validasi Zod untuk API Manajemen Matriks Stok Darah.

import { z } from 'zod';

export const upsertBloodStockSchema = z.object({
  regionId: z
    .string()
    .uuid('ID Wilayah tidak valid.'),
  bloodType: z
    .enum(['A', 'B', 'AB', 'O'] as const),
  productType: z
    .enum(['WB', 'PRC', 'TC', 'FFP'] as const),
  quantity: z
    .number()
    .int()
    .min(0, 'Kuantitas tidak boleh negatif.'),
});

export type UpsertBloodStockInput = z.infer<typeof upsertBloodStockSchema>;
