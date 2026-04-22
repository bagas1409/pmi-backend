// src/routes/distribution.routes.ts
import { Router } from 'express';
import {
    getStockRequests,
    createStockRequest,
    approveStockRequest,
    rejectStockRequest,
    getDCStock,
    getDCInventory,
    addDCInventory
} from '../controllers/distribution.controller';
import { verifyToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Semua route distribusi hanya untuk ADMIN_PMI
router.use(verifyToken, authorizeRole('ADMIN_PMI'));

// ── STOCK REQUESTS (DSD) ─────────────────────────────
// GET  /api/v1/distribution/requests           — Semua permintaan (filter ?status=PENDING)
// POST /api/v1/distribution/requests           — Buat permintaan baru
// PATCH /api/v1/distribution/requests/:id/approve — Approve
// PATCH /api/v1/distribution/requests/:id/reject  — Tolak

router.get('/requests', getStockRequests);
router.post('/requests', createStockRequest);
router.patch('/requests/:id/approve', approveStockRequest);
router.patch('/requests/:id/reject', rejectStockRequest);

// ── DISTRIBUTION CENTER ──────────────────────────────
// GET  /api/v1/distribution/dc/stock           — Stok mentah WB + riwayat penerimaan
// GET  /api/v1/distribution/dc/inventory       — Inventori pengolahan (matriks)
// POST /api/v1/distribution/dc/inventory       — Tambah inventori (trigger pengurangan WB jika PRC/TC/FFP)

router.get('/dc/stock', getDCStock);
router.get('/dc/inventory', getDCInventory);
router.post('/dc/inventory', addDCInventory);

export default router;
