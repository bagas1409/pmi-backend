// src/controllers/hospital.controller.ts
import { Request, Response } from 'express';
import * as hospitalService from '../services/hospital.service';
import { ApiResponse } from '../utils/ApiResponse';

// ── ROLE REQUESTS ─────────────────────────────────────────────

export const submitRoleRequest = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { namaRs, noIzinRs, alamatRs, noTelpRs, namaPic, jabatanPic, dokumenIzin } = req.body;
  if (!namaRs || !noIzinRs || !alamatRs || !noTelpRs || !namaPic || !jabatanPic) {
    return ApiResponse.error(res, 'Semua field wajib diisi kecuali dokumenIzin.', 400);
  }
  try {
    const data = await hospitalService.submitRoleRequest(userId, {
      namaRs, noIzinRs, alamatRs, noTelpRs, namaPic, jabatanPic, dokumenIzin
    });
    ApiResponse.success(res, 'Pengajuan role RS Swasta berhasil dikirim. Menunggu persetujuan Admin PMI.', data, 201);
  } catch (err: any) {
    if (err.message === 'PENDING_REQUEST_EXISTS') {
      return ApiResponse.error(res, 'Anda sudah memiliki pengajuan yang sedang menunggu persetujuan.', 409);
    }
    throw err;
  }
};

export const getMyRoleRequestStatus = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const data = await hospitalService.getMyRoleRequestStatus(userId);
  ApiResponse.success(res, 'Status pengajuan berhasil diambil.', data);
};

export const getRoleRequests = async (req: Request, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const data = await hospitalService.getRoleRequests(status);
  ApiResponse.success(res, 'Daftar pengajuan role RS Swasta berhasil diambil.', data);
};

export const approveRoleRequest = async (req: Request, res: Response) => {
  const { id } = req.params;
  const reviewedBy = (req as any).user?.email || 'Admin PMI';
  try {
    const data = await hospitalService.approveRoleRequest(String(id), reviewedBy);
    ApiResponse.success(res, 'Pengajuan disetujui. Role pengguna telah diubah menjadi RS_SWASTA.');
  } catch (err: any) {
    if (err.message === 'REQUEST_NOT_FOUND') return ApiResponse.notFound(res, 'Pengajuan tidak ditemukan.');
    if (err.message === 'REQUEST_NOT_PENDING') return ApiResponse.error(res, 'Pengajuan ini sudah diproses.', 409);
    throw err;
  }
};

export const rejectRoleRequest = async (req: Request, res: Response) => {
  const { id } = req.params;
  const reviewedBy = (req as any).user?.email || 'Admin PMI';
  const { alasanTolak } = req.body;
  try {
    await hospitalService.rejectRoleRequest(String(id), reviewedBy, alasanTolak);
    ApiResponse.success(res, 'Pengajuan role RS Swasta ditolak.');
  } catch (err: any) {
    if (err.message === 'REQUEST_NOT_FOUND') return ApiResponse.notFound(res, 'Pengajuan tidak ditemukan.');
    if (err.message === 'REQUEST_NOT_PENDING') return ApiResponse.error(res, 'Pengajuan ini sudah diproses.', 409);
    throw err;
  }
};

// ── BLOOD REQUESTS ────────────────────────────────────────────

export const createBloodRequest = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { golonganDarah, jenisProduk, jumlahKantong, namaPasien, noRekamMedis, namaDokter, alasanMedis, tingkatUrgensi, catatanTambahan } = req.body;
  if (!golonganDarah || !jenisProduk || !jumlahKantong || !namaPasien || !noRekamMedis || !namaDokter || !alasanMedis) {
    return ApiResponse.error(res, 'Semua field medis wajib diisi.', 400);
  }
  try {
    const data = await hospitalService.createBloodRequest(userId, {
      golonganDarah, jenisProduk, jumlahKantong: Number(jumlahKantong),
      namaPasien, noRekamMedis, namaDokter, alasanMedis, tingkatUrgensi, catatanTambahan
    });
    ApiResponse.success(res, 'Permintaan darah berhasil dikirim ke Distribution Center PMI.', data, 201);
  } catch (err: any) {
    if (err.message === 'HOSPITAL_PROFILE_NOT_FOUND') {
      return ApiResponse.error(res, 'Profil RS Swasta tidak ditemukan. Pastikan pengajuan Anda sudah disetujui.', 403);
    }
    throw err;
  }
};

export const getBloodRequests = async (req: Request, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const data = await hospitalService.getBloodRequests(status);
  ApiResponse.success(res, 'Daftar permintaan darah RS Swasta berhasil diambil.', data);
};

export const getMyBloodRequests = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  try {
    const data = await hospitalService.getMyBloodRequests(userId);
    ApiResponse.success(res, 'Riwayat permintaan darah Anda berhasil diambil.', data);
  } catch (err: any) {
    if (err.message === 'HOSPITAL_PROFILE_NOT_FOUND') {
      return ApiResponse.error(res, 'Profil RS Swasta tidak ditemukan.', 403);
    }
    throw err;
  }
};

export const processBloodRequest = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { namaPengambil } = req.body;
  const namaPetugasPmi = (req as any).user?.email || 'Admin Distribusi';
  if (!namaPengambil) {
    return ApiResponse.error(res, 'Nama pengambil dari pihak RS wajib diisi.', 400);
  }
  try {
    await hospitalService.processBloodRequest(String(id), namaPetugasPmi, String(namaPengambil));
    ApiResponse.success(res, 'Permintaan darah berhasil diselesaikan. Stok DC telah dikurangi dan audit trail tersimpan.');
  } catch (err: any) {
    if (err.message === 'REQUEST_NOT_FOUND') return ApiResponse.notFound(res, 'Permintaan tidak ditemukan.');
    if (err.message === 'REQUEST_ALREADY_PROCESSED') return ApiResponse.error(res, 'Permintaan ini sudah diproses sebelumnya.', 409);
    if (err.message === 'INSUFFICIENT_DC_STOCK') return ApiResponse.error(res, 'Stok di Distribution Center tidak mencukupi.', 422);
    throw err;
  }
};

export const rejectBloodRequest = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { alasanTolak } = req.body;
  try {
    await hospitalService.rejectBloodRequest(String(id), alasanTolak);
    ApiResponse.success(res, 'Permintaan darah ditolak.');
  } catch (err: any) {
    if (err.message === 'REQUEST_NOT_FOUND') return ApiResponse.notFound(res, 'Permintaan tidak ditemukan.');
    if (err.message === 'REQUEST_NOT_PENDING') return ApiResponse.error(res, 'Permintaan ini sudah diproses.', 409);
    throw err;
  }
};

export const getDispensingHistory = async (_req: Request, res: Response) => {
  const data = await hospitalService.getDispensingHistory();
  ApiResponse.success(res, 'Riwayat pengeluaran darah ke RS berhasil diambil.', data);
};
