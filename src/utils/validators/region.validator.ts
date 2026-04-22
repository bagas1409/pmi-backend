// src/utils/validators/region.validator.ts
// Skema validasi Zod untuk API Wilayah / UDD Region.

import { z } from 'zod';

export const createRegionSchema = z.object({
  name: z
    .string()
    .min(3, 'Nama wilayah minimal 3 karakter.')
    .max(100, 'Nama wilayah maksimal 100 karakter.'),
  address: z
    .string()
    .optional(),
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .optional(),
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .optional(),
});

export const updateRegionSchema = createRegionSchema.partial();

export type CreateRegionInput = z.infer<typeof createRegionSchema>;
export type UpdateRegionInput = z.infer<typeof updateRegionSchema>;
