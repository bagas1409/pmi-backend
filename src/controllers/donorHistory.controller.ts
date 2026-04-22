// src/controllers/donorHistory.controller.ts
import { Request, Response } from 'express';
import { createDonorHistorySchema } from '../utils/validators/donorHistory.validator';
import * as donorHistoryService from '../services/donorHistory.service';
import { ApiResponse } from '../utils/ApiResponse';

export const getMyHistory = async (req: Request, res: Response) => {
  // Ambil ID pengguna dari token JWT (telah diset oleh middleware verifyToken)
  const userId = req.user!.id;
  
  const history = await donorHistoryService.getUserDonationHistory(userId);
  ApiResponse.success(res, 'Riwayat donor berhasil diambil.', history);
};

export const getHistoryByAdmin = async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  
  const history = await donorHistoryService.getUserDonationHistory(userId);
  ApiResponse.success(res, `Riwayat donor (User ID: ${userId}) berhasil diambil.`, history);
};

export const recordDonation = async (req: Request, res: Response) => {
  const validated = createDonorHistorySchema.parse(req.body);
  
  try {
    const record = await donorHistoryService.recordNewDonation(validated);
    ApiResponse.created(res, 'Riwayat donor berhasil dicatat. Status pengguna otomatis terupdate.', record);
  } catch (error: any) {
    if (error.message === 'DONOR_PROFILE_NOT_FOUND') {
      ApiResponse.notFound(res, 'Gagal mencatat riwayat: Profil pengguna tidak ditemukan di sistem.');
    } else {
      throw error;
    }
  }
};
