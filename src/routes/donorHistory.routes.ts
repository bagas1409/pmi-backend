// src/routes/donorHistory.routes.ts
import { Router } from 'express';
import { getMyHistory, getHistoryByAdmin, recordDonation } from '../controllers/donorHistory.controller';
import { verifyToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Semua akses riwayat membutuhkan autentikasi
router.use(verifyToken);

// GET /api/v1/donors/my-history — Diakses oleh User yang sedang login
router.get('/my-history', getMyHistory);

// Endpoint di bawah ini KHUSUS ADMIN PMI
// POST /api/v1/donors/record — Mencatat riwayat donor baru
router.post('/record', authorizeRole('ADMIN_PMI'), recordDonation);

// GET /api/v1/donors/:userId/history — Melihat riwayat user tertentu
router.get('/:userId/history', authorizeRole('ADMIN_PMI'), getHistoryByAdmin);

export default router;
