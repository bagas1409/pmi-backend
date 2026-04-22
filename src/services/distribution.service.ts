// src/services/distribution.service.ts
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

const CTX = 'DistributionService';

// ── STOCK REQUESTS (DSD) ────────────────────────────────────────

/** Ambil semua permintaan stok, filter opsional by status */
export const getAllStockRequests = async (status?: string) => {
  logger.info(CTX, `Mengambil StockRequests (status: ${status || 'all'})`);
  return prisma.stockRequest.findMany({
    where: status ? { status } : undefined,
    include: {
      region: { select: { id: true, name: true, kodeUdd: true } },
      logs: { orderBy: { approvedAt: 'desc' }, take: 1 }
    },
    orderBy: { requestedAt: 'desc' }
  });
};

/** Buat permintaan baru dari DC ke sebuah UDD */
export const createStockRequest = async (data: {
  regionId: string;
  bloodType: string;
  quantity: number;
  notes?: string;
  requestedBy?: string;
}) => {
  logger.info(CTX, `Membuat StockRequest → UDD: ${data.regionId} | ${data.bloodType} x${data.quantity}`);

  // Validasi region
  const region = await prisma.uddRegion.findUnique({ where: { id: data.regionId } });
  if (!region) throw new Error('REGION_NOT_FOUND');

  // Validasi stok cukup
  const stock = await prisma.bloodStock.findUnique({
    where: {
      regionId_bloodType_productType: {
        regionId: data.regionId,
        bloodType: data.bloodType as any,
        productType: 'WB'
      }
    }
  });
  if (!stock || stock.quantity < data.quantity) {
    throw new Error('INSUFFICIENT_STOCK');
  }

  return prisma.stockRequest.create({
    data: {
      regionId: data.regionId,
      bloodType: data.bloodType as any,
      quantity: data.quantity,
      notes: data.notes,
      requestedBy: data.requestedBy,
      status: 'PENDING'
    },
    include: { region: { select: { name: true, kodeUdd: true } } }
  });
};

/** Approve permintaan → stok UDD berkurang, stok DC bertambah */
export const approveStockRequest = async (requestId: string, approvedBy?: string) => {
  logger.info(CTX, `Approving StockRequest ${requestId}`);

  const req = await prisma.stockRequest.findUnique({
    where: { id: requestId },
    include: { region: true }
  });
  if (!req) throw new Error('REQUEST_NOT_FOUND');
  if (req.status !== 'PENDING') throw new Error('REQUEST_NOT_PENDING');

  return prisma.$transaction(async (tx) => {
    // 1. Kurangi stok WB di UDD
    const currentStock = await tx.bloodStock.findUnique({
      where: {
        regionId_bloodType_productType: {
          regionId: req.regionId,
          bloodType: req.bloodType,
          productType: 'WB'
        }
      }
    });
    if (!currentStock || currentStock.quantity < req.quantity) {
      throw new Error('INSUFFICIENT_STOCK_AT_APPROVE');
    }

    await tx.bloodStock.update({
      where: {
        regionId_bloodType_productType: {
          regionId: req.regionId,
          bloodType: req.bloodType,
          productType: 'WB'
        }
      },
      data: { quantity: { decrement: req.quantity } }
    });

    // 2. Tambah stok mentah WB di DC
    await tx.distributionCenterStock.upsert({
      where: { bloodType: req.bloodType },
      update: { quantity: { increment: req.quantity } },
      create: { bloodType: req.bloodType, quantity: req.quantity }
    });

    // 3. Update status request
    await tx.stockRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED', approvedAt: new Date() }
    });

    // 4. Buat log audit
    await tx.stockRequestLog.create({
      data: {
        stockRequestId: requestId,
        regionId: req.regionId,
        regionName: req.region.name,
        bloodType: req.bloodType,
        quantity: req.quantity,
        approvedBy: approvedBy || 'Admin PMI'
      }
    });

    logger.info(CTX, `StockRequest ${requestId} APPROVED — UDD ${req.region.name}: WB-${req.bloodType} -${req.quantity}, DC: +${req.quantity}`);
    return { success: true };
  });
};

/** Tolak permintaan */
export const rejectStockRequest = async (requestId: string, notes?: string) => {
  const req = await prisma.stockRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new Error('REQUEST_NOT_FOUND');
  if (req.status !== 'PENDING') throw new Error('REQUEST_NOT_PENDING');

  return prisma.stockRequest.update({
    where: { id: requestId },
    data: { status: 'REJECTED', rejectedAt: new Date(), notes: notes || req.notes }
  });
};

// ── DISTRIBUTION CENTER ────────────────────────────────────────

/** Stok mentah WB di DC + riwayat penerimaan */
export const getDCStock = async () => {
  const [stocks, logs] = await Promise.all([
    prisma.distributionCenterStock.findMany({ orderBy: { bloodType: 'asc' } }),
    prisma.stockRequestLog.findMany({
      orderBy: { approvedAt: 'desc' },
      take: 50,
    })
  ]);
  return { stocks, receptionLogs: logs };
};

/** Inventori pengolahan darah di DC */
export const getDCInventory = async () => {
  return prisma.dCInventory.findMany({ orderBy: [{ bloodType: 'asc' }, { productType: 'asc' }] });
};

/** Tambah inventori pengolahan.
 *  Jika productType = PRC/TC/FFP → kurangi stok mentah WB di DC.
 *  Jika productType = WB → hanya catat ke inventori, tidak kurangi stok mentah. */
export const addDCInventory = async (data: {
  bloodType: string;
  productType: string;
  quantity: number;
  notes?: string;
}) => {
  logger.info(CTX, `Tambah DCInventory: ${data.bloodType}-${data.productType} x${data.quantity}`);

  return prisma.$transaction(async (tx) => {
    const isProcessedProduct = data.productType !== 'WB';

    // Jika produk olahan (PRC/TC/FFP) → validasi & kurangi stok mentah WB
    if (isProcessedProduct) {
      const dcStock = await tx.distributionCenterStock.findUnique({
        where: { bloodType: data.bloodType as any }
      });
      if (!dcStock || dcStock.quantity < data.quantity) {
        throw new Error('INSUFFICIENT_DC_STOCK');
      }
      await tx.distributionCenterStock.update({
        where: { bloodType: data.bloodType as any },
        data: { quantity: { decrement: data.quantity } }
      });
    }

    // Upsert inventori DC
    const inventory = await tx.dCInventory.upsert({
      where: {
        bloodType_productType: {
          bloodType: data.bloodType as any,
          productType: data.productType as any
        }
      },
      update: { quantity: { increment: data.quantity }, notes: data.notes },
      create: {
        bloodType: data.bloodType as any,
        productType: data.productType as any,
        quantity: data.quantity,
        notes: data.notes
      }
    });

    logger.info(CTX, `DCInventory updated: ${data.bloodType}-${data.productType} +${data.quantity}${isProcessedProduct ? ` (DC WB stock -${data.quantity})` : ''}`);
    return inventory;
  });
};
