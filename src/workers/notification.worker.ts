// src/workers/notification.worker.ts
// Worker Cron Job untuk:
// 1. Setiap hari jam 08:00 WIB: Cek donor yang TEPAT 90 hari lalu → kirim notifikasi "Siap Donor"
// 2. Notifikasi personal disimpan ke tabel `notifications` agar terbaca di aplikasi mobile.

import cron from 'node-cron';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

const CTX = 'DonorReminderWorker';

/**
 * Utility: Hitung hari sejak tanggal tertentu
 */
export const getDaysSince = (date: Date): number => {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

/**
 * Label Status Pendonor berdasarkan hari sejak donor terakhir:
 * - 0-30 hari  → 'RECOVERY'  (Hijau) - Sedang masa pemulihan
 * - 31-89 hari → 'READY_SOON' (Kuning) - Hampir siap donor
 * - 90+ hari   → 'READY'     (Merah) - Siap donor! 
 */
export const getDonorStatusLabel = (lastDonationDate: Date | null): {
  status: 'NO_HISTORY' | 'RECOVERY' | 'READY_SOON' | 'READY';
  daysSince: number | null;
  color: string;
  label: string;
} => {
  if (!lastDonationDate) {
    return { status: 'NO_HISTORY', daysSince: null, color: '#9CA3AF', label: 'Belum pernah donor' };
  }

  const days = getDaysSince(lastDonationDate);

  if (days <= 30) {
    return { status: 'RECOVERY', daysSince: days, color: '#10B981', label: `Masa Pemulihan (Hari ke-${days})` };
  } else if (days < 90) {
    return { status: 'READY_SOON', daysSince: days, color: '#F59E0B', label: `Hampir Siap Donor (${days} hari)` };
  } else {
    return { status: 'READY', daysSince: days, color: '#EF4444', label: `Siap Donor! (${days} hari)` };
  }
};

/**
 * Fungsi utama pengecekan. Mencari pendonor yang tepat hari ini masuk HARI ke-90.
 * Menggunakan DonationHistory (bukan lastDonationDate) agar akurat.
 */
export const checkDonorEligibility = async () => {
  logger.info(CTX, 'Memulai cek eligibilitas donor harian...');

  try {
    // Ambil semua donation history, lalu filter di aplikasi
    // yang donationDate-nya antara 89-91 hari lalu (window 1 hari)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    ninetyDaysAgo.setHours(0, 0, 0, 0);

    const ninetyOneDaysAgo = new Date(ninetyDaysAgo);
    // satu hari sebelumnya (jangka waktu 1 hari penuh = dari 90 hari lalu sampai 91 hari lalu)
    ninetyOneDaysAgo.setDate(ninetyOneDaysAgo.getDate() - 1);

    // Temukan riwayat donor yang tepat 90 hari lalu (hari ini = hari ke-90 atau lebih)
    const eligibleHistories = await prisma.donationHistory.findMany({
      where: {
        donationDate: {
          lte: ninetyDaysAgo, // Donor mereka sudah >= 90 hari lalu
          gte: ninetyOneDaysAgo, // Tapi belum lebih dari 91 hari lalu (window 1 hari)
        },
      },
      include: {
        user: {
          select: {
            id: true,
            isActive: true,
            donorProfile: {
              select: { fullName: true, whatsappNumber: true, bloodType: true }
            }
          }
        }
      }
    });

    if (eligibleHistories.length === 0) {
      logger.info(CTX, 'Tidak ada pendonor yang masuk hari ke-90 hari ini.');
      return 0;
    }

    let sent = 0;

    for (const history of eligibleHistories) {
      if (!history.user.isActive) continue;

      const profile = history.user.donorProfile;
      const name = profile?.fullName || 'Pendonor';
      const userId = history.user.id;

      // Cek apakah notifikasi yang sama sudah pernah dikirim hari ini (cegah duplikat)
      const existingNotif = await prisma.notification.findFirst({
        where: {
          targetUserId: userId,
          type: 'REMINDER',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)) // Awal hari ini
          }
        }
      });

      if (existingNotif) {
        logger.debug(CTX, `Notifikasi sudah dikirim hari ini ke userId: ${userId}`);
        continue;
      }

      // Buat notifikasi personal ke database
      await prisma.notification.create({
        data: {
          title: '🩸 Anda Siap Donor Kembali!',
          message: `Halo ${name}! Sudah 90 hari sejak donor terakhir Anda. Tubuh Anda kini siap untuk berbagi darah lagi. Yuk, cek jadwal kegiatan donor terdekat di PMI dan selamatkan nyawa bersama!`,
          type: 'REMINDER',
          targetUsers: `USER:${userId}`,
          targetUserId: userId,
          isRead: false,
        }
      });

      // Log sebagai simulator pengiriman WhatsApp / Push Notif
      logger.success(
        CTX,
        `[REMINDER TERKIRIM] → ${name} (${profile?.whatsappNumber}) gol. darah ${profile?.bloodType} — Sudah 90 hari sejak donor.`
      );

      sent++;
    }

    logger.info(CTX, `Selesai. Total ${sent} notifikasi reminder dikirimkan.`);
    return sent;

  } catch (error) {
    logger.error(CTX, `Kesalahan saat menjalankan cron eligibility: ${error}`);
    return -1;
  }
};

export const startNotificationWorker = () => {
  // Jalan setiap hari pukul 08:00 pagi WIB
  cron.schedule('0 8 * * *', () => {
    checkDonorEligibility();
  }, {
    timezone: 'Asia/Jakarta'
  });

  logger.info(CTX, 'Donor Reminder Worker aktif (Jadwal: Setiap hari jam 08:00 WIB)');
};
