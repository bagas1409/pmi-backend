// src/controllers/distribution.controller.ts
import { Request, Response } from 'express';
import * as distributionService from '../services/distribution.service';
import { ApiResponse } from '../utils/ApiResponse';

// ── STOCK REQUESTS (DSD) ─────────────────────────────────────

export const getStockRequests = async (req: Request, res: Response) => {
    const rawStatus = req.query.status;
    const status = typeof rawStatus === 'string' ? rawStatus : undefined;
    const data = await distributionService.getAllStockRequests(status);
    ApiResponse.success(res, 'Daftar permintaan stok berhasil diambil.', data);
};

export const createStockRequest = async (req: Request, res: Response) => {
    const { regionId, bloodType, quantity, notes } = req.body;
    if (!regionId || !bloodType || !quantity || quantity <= 0) {
        return ApiResponse.error(res, 'regionId, bloodType, dan quantity (>0) wajib diisi.', 400);
    }
    try {
        const data = await distributionService.createStockRequest({
            regionId: String(regionId),
            bloodType: String(bloodType),
            quantity: Number(quantity),
            notes: notes ? String(notes) : undefined,
            requestedBy: (req as any).user?.email || 'Admin'
        });
        ApiResponse.success(res, 'Permintaan stok berhasil dibuat.', data, 201);
    } catch (err: any) {
        if (err.message === 'REGION_NOT_FOUND') return ApiResponse.notFound(res, 'UDD tidak ditemukan.');
        if (err.message === 'INSUFFICIENT_STOCK') return ApiResponse.error(res, 'Stok WB di UDD tidak mencukupi untuk jumlah yang diminta.', 422);
        throw err;
    }
};

export const approveStockRequest = async (req: Request, res: Response) => {
    const id: string = String(req.params.id);
    const approvedBy: string = String((req as any).user?.email ?? 'Admin');
    try {
        await distributionService.approveStockRequest(id, approvedBy);
        ApiResponse.success(res, 'Permintaan stok disetujui. Stok UDD berkurang dan stok DC bertambah.');
    } catch (err: any) {
        if (err.message === 'REQUEST_NOT_FOUND') return ApiResponse.notFound(res, 'Permintaan tidak ditemukan.');
        if (err.message === 'REQUEST_NOT_PENDING') return ApiResponse.error(res, 'Permintaan ini sudah diproses sebelumnya.', 409);
        if (err.message === 'INSUFFICIENT_STOCK_AT_APPROVE') return ApiResponse.error(res, 'Stok UDD sudah tidak mencukupi (mungkin sudah berubah). Tolak dan buat permintaan baru.', 422);
        throw err;
    }
};

export const rejectStockRequest = async (req: Request, res: Response) => {
    const id: string = String(req.params.id);
    const rawNotes = req.body.notes;
    const notes: string | undefined = rawNotes != null ? String(rawNotes) : undefined;
    try {
        const data = await distributionService.rejectStockRequest(id, notes);
        ApiResponse.success(res, 'Permintaan stok ditolak.', data);
    } catch (err: any) {
        if (err.message === 'REQUEST_NOT_FOUND') return ApiResponse.notFound(res, 'Permintaan tidak ditemukan.');
        if (err.message === 'REQUEST_NOT_PENDING') return ApiResponse.error(res, 'Permintaan ini sudah diproses sebelumnya.', 409);
        throw err;
    }
};

// ── DISTRIBUTION CENTER ──────────────────────────────────────

export const getDCStock = async (_req: Request, res: Response) => {
    const data = await distributionService.getDCStock();
    ApiResponse.success(res, 'Stok mentah DC berhasil diambil.', data);
};

export const getDCInventory = async (_req: Request, res: Response) => {
    const data = await distributionService.getDCInventory();
    ApiResponse.success(res, 'Inventori DC berhasil diambil.', data);
};

export const addDCInventory = async (req: Request, res: Response) => {
    const { bloodType, productType, quantity, notes } = req.body;
    if (!bloodType || !productType || !quantity || quantity <= 0) {
        return ApiResponse.error(res, 'bloodType, productType, dan quantity (>0) wajib diisi.', 400);
    }
    try {
        const data = await distributionService.addDCInventory({
            bloodType,
            productType,
            quantity: Number(quantity),
            notes
        });
        ApiResponse.success(res, 'Inventori DC berhasil diperbarui.', data);
    } catch (err: any) {
        if (err.message === 'INSUFFICIENT_DC_STOCK') {
            return ApiResponse.error(res, 'Stok mentah WB di DC tidak mencukupi untuk membuat produk olahan ini.', 422);
        }
        throw err;
    }
};
