import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ApiResponse } from '../utils/ApiResponse';
import { completeProfileSchema, updateBloodTypeSchema } from '../utils/validators/profile.validator';

export const completeProfile = async (req: Request, res: Response) => {
    // Diasumsikan endpoint ini dilindungi oleh protect (middleware auth) sehingga user ID tersedia di req.user
    const userId = (req as any).user?.id;
    if (!userId) {
        return ApiResponse.unauthorized(res, 'Sesi tidak valid.');
    }

    const validatedData = completeProfileSchema.parse(req.body);

    // Validasi apakah DonorProfile eksis (khusus akun lawas / akun admin tanpa profil)
    const existingProfile = await prisma.donorProfile.findUnique({
        where: { userId }
    });

    if (!existingProfile) {
        return ApiResponse.error(
            res, 
            'Profil pendonor Anda belum terinisiasi di sistem (akun lama/admin). Silakan hapus akun atau gunakan akun reguler baru.', 
            404
        );
    }

    const updatedProfile = await prisma.donorProfile.update({
        where: { userId },
        data: {
            gender: validatedData.gender,
            birthPlace: validatedData.birthPlace,
            birthDate: validatedData.birthDate,
            address: validatedData.address,
            village: validatedData.village,
            subdistrict: validatedData.subdistrict,
            city: validatedData.city,
            job: validatedData.job,
            maritalStatus: validatedData.maritalStatus,
        }
    });

    return ApiResponse.success(res, 'Biodata pendonor berhasil dilengkapi.', updatedProfile);
};

export const updateBloodType = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
        return ApiResponse.unauthorized(res, 'Sesi tidak valid.');
    }

    try {
        const validatedData = updateBloodTypeSchema.parse(req.body);

        const existingProfile = await prisma.donorProfile.findUnique({
            where: { userId }
        });

        if (!existingProfile) {
            return ApiResponse.error(res, 'Profil pendonor tidak ditemukan.', 404);
        }

        const updatedProfile = await prisma.donorProfile.update({
            where: { userId },
            data: {
                bloodType: validatedData.bloodType
            }
        });

        return ApiResponse.success(res, 'Golongan darah berhasil diperbarui.', updatedProfile);
    } catch (error: any) {
        if (error.name === 'ZodError') {
             return ApiResponse.error(res, error.errors[0].message, 422);
        }
        return ApiResponse.error(res, 'Gagal memperbarui golongan darah.', 500);
    }
};
