// src/services/hospital.service.ts
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

const CTX = 'HospitalService';

// ── ROLE REQUEST ──────────────────────────────────────────────

export const submitRoleRequest = async (userId: string, data: {
  namaRs: string; noIzinRs: string; alamatRs: string;
  noTelpRs: string; namaPic: string; jabatanPic: string; dokumenIzin?: string;
}) => {
  logger.info(CTX, `User ${userId} mengajukan role RS_SWASTA`);
  // Cegah duplikat pengajuan yang masih PENDING
  const existing = await prisma.hospitalRoleRequest.findFirst({
    where: { userId, status: 'PENDING' }
  });
  if (existing) throw new Error('PENDING_REQUEST_EXISTS');

  return prisma.hospitalRoleRequest.create({ data: { userId, ...data } });
};

export const getRoleRequests = async (status?: string) => {
  return prisma.hospitalRoleRequest.findMany({
    where: status ? { status } : undefined,
    include: { user: { select: { email: true, role: true } } },
    orderBy: { createdAt: 'desc' }
  });
};

export const approveRoleRequest = async (id: string, reviewedBy: string) => {
  const req = await prisma.hospitalRoleRequest.findUnique({ where: { id } });
  if (!req) throw new Error('REQUEST_NOT_FOUND');
  if (req.status !== 'PENDING') throw new Error('REQUEST_NOT_PENDING');

  return prisma.$transaction(async (tx) => {
    // 1. Update status pengajuan
    await tx.hospitalRoleRequest.update({
      where: { id },
      data: { status: 'APPROVED', reviewedBy, reviewedAt: new Date() }
    });
    // 2. Ubah role user
    await tx.user.update({ where: { id: req.userId }, data: { role: 'RS_SWASTA' } });
    // 3. Buat hospital profile
    await tx.hospitalProfile.create({
      data: {
        userId: req.userId,
        namaRs: req.namaRs,
        noIzinRs: req.noIzinRs,
        alamatRs: req.alamatRs,
        noTelpRs: req.noTelpRs,
        namaPic: req.namaPic,
        jabatanPic: req.jabatanPic,
        dokumenIzin: req.dokumenIzin
      }
    });
    logger.info(CTX, `Role RS_SWASTA disetujui untuk user ${req.userId}`);
  });
};

export const rejectRoleRequest = async (id: string, reviewedBy: string, alasanTolak?: string) => {
  const req = await prisma.hospitalRoleRequest.findUnique({ where: { id } });
  if (!req) throw new Error('REQUEST_NOT_FOUND');
  if (req.status !== 'PENDING') throw new Error('REQUEST_NOT_PENDING');

  return prisma.hospitalRoleRequest.update({
    where: { id },
    data: { status: 'REJECTED', reviewedBy, reviewedAt: new Date(), alasanTolak }
  });
};

export const getMyRoleRequestStatus = async (userId: string) => {
  return prisma.hospitalRoleRequest.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
};

// ── BLOOD REQUESTS ────────────────────────────────────────────

export const createBloodRequest = async (userId: string, data: {
  golonganDarah: string; jenisProduk: string; jumlahKantong: number;
  namaPasien: string; noRekamMedis: string; namaDokter: string;
  alasanMedis: string; tingkatUrgensi?: string; catatanTambahan?: string;
}) => {
  const profile = await prisma.hospitalProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error('HOSPITAL_PROFILE_NOT_FOUND');

  logger.info(CTX, `RS ${profile.namaRs} membuat request darah`);
  return prisma.hospitalBloodRequest.create({
    data: {
      hospitalProfileId: profile.id,
      golonganDarah: data.golonganDarah as any,
      jenisProduk: data.jenisProduk as any,
      jumlahKantong: data.jumlahKantong,
      namaPasien: data.namaPasien,
      noRekamMedis: data.noRekamMedis,
      namaDokter: data.namaDokter,
      alasanMedis: data.alasanMedis,
      tingkatUrgensi: (data.tingkatUrgensi as any) || 'NORMAL',
      catatanTambahan: data.catatanTambahan
    },
    include: { hospitalProfile: { select: { namaRs: true } } }
  });
};

export const getBloodRequests = async (status?: string) => {
  return prisma.hospitalBloodRequest.findMany({
    where: status ? { status } : undefined,
    include: {
      hospitalProfile: { select: { namaRs: true, noTelpRs: true, namaPic: true } },
      dispensing: true
    },
    orderBy: [{ tingkatUrgensi: 'asc' }, { requestedAt: 'asc' }]
  });
};

export const getMyBloodRequests = async (userId: string) => {
  const profile = await prisma.hospitalProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error('HOSPITAL_PROFILE_NOT_FOUND');

  return prisma.hospitalBloodRequest.findMany({
    where: { hospitalProfileId: profile.id },
    include: { dispensing: true },
    orderBy: { requestedAt: 'desc' }
  });
};

export const processBloodRequest = async (id: string, petugasPmi: string, namaPengambil: string) => {
  const req = await prisma.hospitalBloodRequest.findUnique({
    where: { id },
    include: { hospitalProfile: true }
  });
  if (!req) throw new Error('REQUEST_NOT_FOUND');
  if (req.status !== 'PENDING' && req.status !== 'DIPROSES') throw new Error('REQUEST_ALREADY_PROCESSED');

  return prisma.$transaction(async (tx) => {
    // 1. Kurangi stok DC
    const dcStock = await tx.dCInventory.findUnique({
      where: { bloodType_productType: { bloodType: req.golonganDarah, productType: req.jenisProduk } }
    });
    if (!dcStock || dcStock.quantity < req.jumlahKantong) throw new Error('INSUFFICIENT_DC_STOCK');

    await tx.dCInventory.update({
      where: { bloodType_productType: { bloodType: req.golonganDarah, productType: req.jenisProduk } },
      data: { quantity: { decrement: req.jumlahKantong } }
    });

    // 2. Update status request
    await tx.hospitalBloodRequest.update({
      where: { id },
      data: { status: 'SELESAI', completedAt: new Date(), processedAt: new Date() }
    });

    // 3. Buat audit trail dispensing
    await tx.hospitalBloodDispensing.create({
      data: {
        requestId: id,
        hospitalProfileId: req.hospitalProfileId,
        namaRs: req.hospitalProfile.namaRs,
        namaPasien: req.namaPasien,
        noRekamMedis: req.noRekamMedis,
        namaDokter: req.namaDokter,
        alasanMedis: req.alasanMedis,
        golonganDarah: req.golonganDarah,
        jenisProduk: req.jenisProduk,
        jumlahKantong: req.jumlahKantong,
        namaPetugasPmi: petugasPmi,
        namaPengambil
      }
    });

    logger.info(CTX, `Request ${id} SELESAI — ${req.jumlahKantong} kantong ${req.golonganDarah}-${req.jenisProduk} ke ${req.hospitalProfile.namaRs}`);
    return { success: true };
  });
};

export const rejectBloodRequest = async (id: string, alasanTolak?: string) => {
  const req = await prisma.hospitalBloodRequest.findUnique({ where: { id } });
  if (!req) throw new Error('REQUEST_NOT_FOUND');
  if (req.status !== 'PENDING') throw new Error('REQUEST_NOT_PENDING');

  return prisma.hospitalBloodRequest.update({
    where: { id },
    data: { status: 'DITOLAK', alasanTolak }
  });
};

export const getDispensingHistory = async () => {
  return prisma.hospitalBloodDispensing.findMany({
    orderBy: { dispensedAt: 'desc' },
    include: { hospitalProfile: { select: { namaRs: true } } }
  });
};
