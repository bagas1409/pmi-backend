// src/services/donorHistory.service.ts
import { prisma } from '../config/prisma';
import { CreateDonorHistoryInput } from '../utils/validators/donorHistory.validator';
import { logger } from '../utils/logger';

const CTX = 'DonorHistoryService';

/**
 * Get histori donor berdasarkan ID Profile Pendonor
 * Bisa diakses oleh User (melihat datanya sendiri) atau Admin.
 */
export const getUserDonationHistory = async (userId: string) => {
  logger.info(CTX, `Mengambil riwayat donor untuk userId: ${userId}`);
  
  return await prisma.donationHistory.findMany({
    where: { userId },
    orderBy: { donationDate: 'desc' },
  });
};

/**
 * Mencatat riwayat donor baru — HANYA ADMIN PMI.
 * Ini adalah operasi krusial. Menggunakan Transaction untuk menjamin:
 * 1. Riwayat tercatat di tabel `donation_histories`
 * 2. `lastDonationDate` di tabel profil pengguna diperbarui otomatis.
 * 3. `totalDonations` di tabel profil pengguna bertambah +1.
 */
export const recordNewDonation = async (data: CreateDonorHistoryInput) => {
  logger.info(CTX, `Mencatat donor baru untuk userId: ${data.userId} di ${data.locationName}`);

  // Cek validitas user profile terlebih dahulu
  const userProfile = await prisma.donorProfile.findUnique({
    where: { userId: data.userId },
  });

  if (!userProfile) {
    throw new Error('DONOR_PROFILE_NOT_FOUND');
  }

  // Tanggal default = hari ini (jika tidak dikirim dari klien)
  const donationDate = data.donationDate ? new Date(data.donationDate) : new Date();

  // Atomicity: Gunakan $transaction agar tidak ada data setengah jalan
  const result = await prisma.$transaction(async (tx) => {
    // 1. Simpan riwayat
    const history = await tx.donationHistory.create({
      data: {
        userId: data.userId,
        locationName: data.locationName,
        donationDate: donationDate,
      },
    });

    // 2. Update metadata profil untuk gamifikasi dan validasi kelayakan
    await tx.donorProfile.update({
      where: { userId: data.userId },
      data: {
        lastDonationDate: donationDate,
        totalDonations: {
          increment: 1, // Menaikkan jumlah donor secara otomatis via SQL (aman dari race condition)
        },
      },
    });

    return history;
  });

  logger.success(CTX, `Riwayat tercatat dan metrik pengguna diperbarui (Total Donor: ${userProfile.totalDonations + 1})`);
  
  return result;
};
