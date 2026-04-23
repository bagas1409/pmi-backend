// src/services/bloodStock.service.ts
import { prisma } from '../config/prisma';
import { UpsertBloodStockInput } from '../utils/validators/bloodStock.validator';
import { logger } from '../utils/logger';

const CTX = 'BloodStockService';

/**
 * Endpoint publik: Melihat seluruh matriks stok darah.
 * Dikelompokkan berdasarkan Region, Golongan Darah, dan Produk.
 * Disertakan juga 10 riwayat donor terbaru per region.
 */
export const getAllBloodStocks = async () => {
  logger.info(CTX, 'Mengambil matriks stok darah terpadu');
  
  return await prisma.uddRegion.findMany({
    include: {
      bloodStocks: {
        select: {
          id: true,
          bloodType: true,
          productType: true,
          quantity: true,
          lastUpdated: true,
        },
      },
      // Riwayat donor terbaru per region (hanya WB dari event dan UDD)
      donationHistories: {
        orderBy: { donationDate: 'desc' },
        take: 10,
        include: {
          user: {
            select: {
              donorProfile: {
                select: { fullName: true, bloodType: true }
              }
            }
          }
        }
      }
    },
    orderBy: { name: 'asc' },
  });
};

/**
 * Endpoint Dashboard: Ringkasan stok darah WB per UDD + feed donor terbaru global.
 */
export const getBloodStockSummary = async () => {
  logger.info(CTX, 'Mengambil ringkasan stok darah dashboard');

  const regions = await prisma.uddRegion.findMany({
    include: {
      bloodStocks: {
        where: { productType: 'WB' },
        select: { bloodType: true, quantity: true, lastUpdated: true }
      },
      donationHistories: {
        orderBy: { donationDate: 'desc' },
        take: 5,
        include: {
          user: {
            select: {
              donorProfile: { select: { fullName: true, bloodType: true } }
            }
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  // Feed global 100 donor terbaru dari semua UDD
  const globalFeed = await prisma.donationHistory.findMany({
    where: { regionId: { not: null } },
    orderBy: { donationDate: 'desc' },
    take: 100,
    include: {
      user: {
        select: {
          donorProfile: { select: { fullName: true, bloodType: true } }
        }
      },
      region: { select: { name: true, kodeUdd: true } }
    }
  });

  // Hitung total WB per golongan darah
  let totalA = 0, totalB = 0, totalAB = 0, totalO = 0, totalWB = 0;
  const regionSummaries = regions.map(r => {
    const byBloodType: Record<string, number> = { A: 0, B: 0, AB: 0, O: 0 };
    r.bloodStocks.forEach(s => {
      byBloodType[s.bloodType] = (byBloodType[s.bloodType] || 0) + s.quantity;
      totalWB += s.quantity;
      if (s.bloodType === 'A') totalA += s.quantity;
      else if (s.bloodType === 'B') totalB += s.quantity;
      else if (s.bloodType === 'AB') totalAB += s.quantity;
      else if (s.bloodType === 'O') totalO += s.quantity;
    });

    const recentDonors = r.donationHistories.map(h => ({
      id: h.id,
      name: h.user.donorProfile?.fullName || 'Donatur Anonim',
      bloodType: h.user.donorProfile?.bloodType || null,
      date: h.donationDate,
      sourceType: h.sourceType,
      locationName: h.locationName,
    }));

    return {
      id: r.id,
      kodeUdd: r.kodeUdd,
      name: r.name,
      address: r.address,
      totalWB: Object.values(byBloodType).reduce((a, b) => a + b, 0),
      byBloodType,
      recentDonors
    };
  });

  const globalDonorFeed = globalFeed.map(h => ({
    id: h.id,
    name: h.user.donorProfile?.fullName || 'Donatur Anonim',
    bloodType: h.user.donorProfile?.bloodType || null,
    date: h.donationDate,
    sourceType: h.sourceType,
    locationName: h.locationName,
    regionName: h.region?.name || null,
    regionCode: h.region?.kodeUdd || null,
  }));

  return {
    totalWB,
    byBloodType: { A: totalA, B: totalB, AB: totalAB, O: totalO },
    totalRegions: regions.length,
    regions: regionSummaries,
    globalDonorFeed,
  };
};

/**
 * Endpoint Admin: Menambah atau mengupdate kuantitas stok tertentu (manual).
 */
export const upsertBloodStock = async (data: UpsertBloodStockInput) => {
  logger.info(CTX, `Upsert stok → Region: ${data.regionId} | ${data.bloodType}-${data.productType} | QTY: ${data.quantity}`);

  const region = await prisma.uddRegion.findUnique({ where: { id: data.regionId } });
  if (!region) throw new Error('REGION_NOT_FOUND');

  return await prisma.bloodStock.upsert({
    where: {
      regionId_bloodType_productType: {
        regionId: data.regionId,
        bloodType: data.bloodType,
        productType: data.productType,
      },
    },
    update: { quantity: data.quantity },
    create: {
      regionId: data.regionId,
      bloodType: data.bloodType,
      productType: data.productType,
      quantity: data.quantity,
    },
  });
};
