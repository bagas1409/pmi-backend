// src/routes/bloodStock.routes.ts
import { Router } from 'express';
import { getMatriks, getSummary, upsertStok } from '../controllers/bloodStock.controller';
import { verifyToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// GET /api/v1/blood-stocks — Akses publik (matriks lengkap)
router.get('/', getMatriks);

// GET /api/v1/blood-stocks/summary — Ringkasan dashboard (stok WB + feed donor)
router.get('/summary', getSummary);

// POST /api/v1/blood-stocks/upsert — WAJIB ADMIN PMI
router.post('/upsert', verifyToken, authorizeRole('ADMIN_PMI'), upsertStok);

export default router;
