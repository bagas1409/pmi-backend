// src/services/region.service.ts
import { prisma } from '../config/prisma';
import { CreateRegionInput, UpdateRegionInput } from '../utils/validators/region.validator';
import { logger } from '../utils/logger';

const CTX = 'RegionService';

export const getAllRegions = async (userId?: string) => {
  logger.info(CTX, 'Mengambil semua data wilayah UDD');
  const regions = await prisma.uddRegion.findMany({
    orderBy: { name: 'asc' },
  });

  if (!userId) return regions;

  // Jika ada userId, cek pendaftaran hari ini (dimana status = REGISTERED)
  const userRegistrations = await prisma.uddRegistration.findMany({
    where: { 
      userId, 
      status: 'REGISTERED' 
    },
    select: { regionId: true }
  });

  const registeredRegionIds = new Set(userRegistrations.map(r => r.regionId));

  return regions.map(region => ({
    ...region,
    isRegistered: registeredRegionIds.has(region.id)
  }));
};

export const joinUddRegion = async (userId: string, regionId: string) => {
  logger.info(CTX, `Pendaftaran UDD: user=${userId}, markas=${regionId}`);
  
  const profile = await prisma.donorProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error('PROFILE_INCOMPLETE');

  // Cek apakah masih dalam masa pemulihan (RECOVERY < 90 hari)
  const lastHistory = await prisma.donationHistory.findFirst({
    where: { userId },
    orderBy: { donationDate: 'desc' }
  });

  if (lastHistory) {
    const diffMs = new Date().getTime() - new Date(lastHistory.donationDate).getTime();
    const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    // Bebas apakah mau strict 90 atau 60. Biasanya strict 60 untuk wanita 90 untuk pria. Kita buat 90 default.
    if (daysSince <= 60) {
      throw new Error('RECOVERY_PERIOD');
    }
  }

  // Cek apakah sudah pernah daftar dan masih aktif
  const existingReg = await prisma.uddRegistration.findFirst({
    where: { userId, regionId, status: 'REGISTERED' }
  });
  if (existingReg) throw new Error('ALREADY_REGISTERED');

  // Karena unik kombinasi userId dan regionId di DB, jika abs/attend sebelumnya ada, kita hapus dulu 
  // atau kita upsert (update/create) pendaftarannya hari ini.
  return await prisma.uddRegistration.upsert({
    where: {
      userId_regionId: { userId, regionId }
    },
    update: {
      status: 'REGISTERED',
      scheduledFor: new Date(),
      registeredAt: new Date()
    },
    create: {
      userId,
      regionId,
      status: 'REGISTERED',
      scheduledFor: new Date()
    }
  });
};

export const getUddRegistrants = async (regionId: string) => {
  logger.info(CTX, `Menarik data antrean pendaftar harian markas: ${regionId}`);
  const regs = await prisma.uddRegistration.findMany({
    where: { 
      regionId,
      status: 'REGISTERED' 
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          donorProfile: true,
          donationHistories: {
            orderBy: { donationDate: 'desc' },
            take: 1
          }
        }
      }
    },
    orderBy: { registeredAt: 'asc' }
  });
  return regs;
};

// Generate kode otomatis UDD-XXXX
async function generateKodeUdd(): Promise<string> {
  const lastRegion = await prisma.uddRegion.findFirst({
    orderBy: { kodeUdd: 'desc' },
    select: { kodeUdd: true }
  });

  if (!lastRegion || !lastRegion.kodeUdd) {
    return 'UDD-0001';
  }

  // Ekstrak angka "0001" dari "UDD-0001"
  const lastNumberStr = lastRegion.kodeUdd.replace('UDD-', '');
  const lastNumber = parseInt(lastNumberStr, 10);
  
  const nextNumber = isNaN(lastNumber) ? 1 : lastNumber + 1;
  return `UDD-${String(nextNumber).padStart(4, '0')}`;
}

export const createRegion = async (data: CreateRegionInput) => {
  logger.info(CTX, `Membuat wilayah baru: ${data.name}`);
  const kodeUdd = await generateKodeUdd();
  
  return await prisma.uddRegion.create({
    data: {
      ...data,
      kodeUdd
    },
  });
};

export const updateRegion = async (id: string, data: UpdateRegionInput) => {
  logger.info(CTX, `Mengupdate wilayah ID: ${id}`);
  
  // Validasi eksistensi agar error 404 bisa ditangkap controller
  const exists = await prisma.uddRegion.findUnique({ where: { id } });
  if (!exists) throw new Error('REGION_NOT_FOUND');

  return await prisma.uddRegion.update({
    where: { id },
    data,
  });
};

export const deleteRegion = async (id: string) => {
  logger.info(CTX, `Menghapus wilayah ID: ${id}`);
  
  const exists = await prisma.uddRegion.findUnique({ where: { id } });
  if (!exists) throw new Error('REGION_NOT_FOUND');

  // Hapus region
  return await prisma.uddRegion.delete({
    where: { id },
  });
};

export const updateRegistrantStatus = async (registrationId: string, status: 'ATTENDED' | 'ABSENT', adminId?: string) => {
  logger.info(CTX, `Memperbarui status pendaftar markas ${registrationId} menjadi ${status}`);

  // Cek reg exist
  const reg = await prisma.uddRegistration.findUnique({
    where: { id: registrationId },
    include: { 
      region: true,
      user: { include: { donorProfile: true } }
    }
  });
  if (!reg) throw new Error('REGISTRATION_NOT_FOUND');
  if (reg.status !== 'REGISTERED') throw new Error('INVALID_STATUS_TRANSITION');

  return await prisma.$transaction(async (tx) => {
    // 1. Update status
    const updated = await tx.uddRegistration.update({
      where: { id: registrationId },
      data: { status }
    });

    // 2. Jika ATTENDED, catat riwayat, increment, dan lempar notifikasi
    if (status === 'ATTENDED') {
      const bloodType = reg.user.donorProfile?.bloodType;

      // Increment total donasi profil
      await tx.donorProfile.update({
        where: { userId: reg.userId },
        data: { 
          totalDonations: { increment: 1 },
          lastDonationDate: new Date()
        }
      });

      // Catat riwayat donasi dengan regionId & sourceType
      await tx.donationHistory.create({
        data: {
          userId: reg.userId,
          donationDate: new Date(),
          locationName: reg.region.name,
          regionId: reg.regionId,
          sourceType: 'UDD'
        }
      });

      // Auto-increment stok WB jika bloodType tersedia
      if (bloodType) {
        await tx.bloodStock.upsert({
          where: {
            regionId_bloodType_productType: {
              regionId: reg.regionId,
              bloodType: bloodType,
              productType: 'WB'
            }
          },
          update: { quantity: { increment: 1 } },
          create: {
            regionId: reg.regionId,
            bloodType: bloodType,
            productType: 'WB',
            quantity: 1
          }
        });
        logger.info(CTX, `Stok WB-${bloodType} di ${reg.region.name} +1 (UDD donation)`);
      } else {
        logger.warn(CTX, `Golongan darah user ${reg.userId} belum diisi — stok tidak diperbarui`);
      }

      // Notifikasi ke user
      await tx.notification.create({
        data: {
          title: "🩸 Donasi Berhasil Dikonfirmasi",
          message: `Terima kasih! Donasi darah Anda di markas ${reg.region.name} hari ini telah divalidasi. Anda menyelamatkan hingga 3 nyawa!`,
          type: "INFO",
          targetUserId: reg.userId
        }
      });
    }

    return updated;
  });
};
