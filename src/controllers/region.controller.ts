// src/controllers/region.controller.ts
import { Request, Response } from 'express';
import { createRegionSchema, updateRegionSchema } from '../utils/validators/region.validator';
import * as regionService from '../services/region.service';
import { ApiResponse } from '../utils/ApiResponse';

export const getAll = async (req: Request, res: Response) => {
  // Ambil userId dari token jika ada (karena rute ini mungkin dipanggil dengan token atau tanpa token)
  const userId = (req as any).user?.id;
  const regions = await regionService.getAllRegions(userId);
  ApiResponse.success(res, 'Data wilayah berhasil diambil.', regions);
};

export const create = async (req: Request, res: Response) => {
  const validated = createRegionSchema.parse(req.body);
  const region = await regionService.createRegion(validated);
  ApiResponse.created(res, 'Wilayah baru berhasil ditambahkan.', region);
};

export const update = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const validated = updateRegionSchema.parse(req.body);
  
  try {
    const region = await regionService.updateRegion(id, validated);
    ApiResponse.success(res, 'Data wilayah berhasil diperbarui.', region);
  } catch (error: any) {
    if (error.message === 'REGION_NOT_FOUND') {
      ApiResponse.notFound(res, 'Wilayah tidak ditemukan.');
    } else {
      throw error;
    }
  }
};

export const remove = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  
  try {
    await regionService.deleteRegion(id);
    ApiResponse.success(res, 'Data wilayah berhasil dihapus.');
  } catch (error: any) {
    if (error.message === 'REGION_NOT_FOUND') {
      ApiResponse.notFound(res, 'Wilayah tidak ditemukan.');
    } else {
      throw error;
    }
  }
};

export const joinUdd = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const regionId = req.params.id as string;

  try {
    const reg = await regionService.joinUddRegion(userId, regionId);
    ApiResponse.created(res, 'Berhasil mendaftar antrean harian markas.', reg);
  } catch (error: any) {
    if (error.message === 'PROFILE_INCOMPLETE') {
      return ApiResponse.error(res, 'Profil pendonor belum lengkap.', 403);
    }
    if (error.message === 'RECOVERY_PERIOD') {
      return ApiResponse.error(res, 'Anda masih dalam masa pemulihan (belum 60 hari sejak donor terakhir).', 403);
    }
    if (error.message === 'ALREADY_REGISTERED') {
      return ApiResponse.error(res, 'Anda sudah terdaftar di antrean markas ini hari ini.', 409);
    }
    throw error;
  }
};

export const getRegistrants = async (req: Request, res: Response) => {
  const regionId = req.params.id as string;
  const registrants = await regionService.getUddRegistrants(regionId);
  ApiResponse.success(res, 'Data pendaftar markas berhasil diambil.', registrants);
};

export const updateRegistrant = async (req: Request, res: Response) => {
  const regId = req.params.id as string; // ini ID registrasinya
  const { status } = req.body;
  const adminId = (req as any).user?.id;

  if (!['ATTENDED', 'ABSENT'].includes(status)) {
    return ApiResponse.error(res, 'Status tidak valid.', 400);
  }

  try {
    const updated = await regionService.updateRegistrantStatus(regId, status, adminId);
    ApiResponse.success(res, `Status berhasil diubah menjadi ${status}.`, updated);
  } catch (error: any) {
    if (error.message === 'REGISTRATION_NOT_FOUND') {
      return ApiResponse.notFound(res, 'Data pendaftaran tidak ditemukan.');
    }
    if (error.message === 'INVALID_STATUS_TRANSITION') {
      return ApiResponse.error(res, 'Status pendaftar sudah tidak bisa diubah.', 400);
    }
    throw error;
  }
};
