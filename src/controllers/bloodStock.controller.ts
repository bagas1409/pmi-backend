// src/controllers/bloodStock.controller.ts
import { Request, Response } from 'express';
import { upsertBloodStockSchema } from '../utils/validators/bloodStock.validator';
import * as bloodStockService from '../services/bloodStock.service';
import { ApiResponse } from '../utils/ApiResponse';

export const getMatriks = async (_req: Request, res: Response) => {
  const data = await bloodStockService.getAllBloodStocks();
  ApiResponse.success(res, 'Matriks stok darah berhasil diambil.', data);
};

export const getSummary = async (_req: Request, res: Response) => {
  const data = await bloodStockService.getBloodStockSummary();
  ApiResponse.success(res, 'Ringkasan stok darah berhasil diambil.', data);
};

export const upsertStok = async (req: Request, res: Response) => {
  const validated = upsertBloodStockSchema.parse(req.body);
  
  try {
    const data = await bloodStockService.upsertBloodStock(validated);
    ApiResponse.success(res, 'Stok darah berhasil ditambahkan/diperbarui.', data);
  } catch (error: any) {
    if (error.message === 'REGION_NOT_FOUND') {
      ApiResponse.notFound(res, 'Wilayah UDD asal tidak ditemukan.');
    } else {
      throw error;
    }
  }
};
