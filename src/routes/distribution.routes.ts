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

// Wajib verifikasi token dulu untuk semua route ini
router.use(verifyToken);

const requireBoth = authorizeRole('ADMIN_DISTRIBUSI', 'ADMIN_PMI');
const requireDC = authorizeRole('ADMIN_DISTRIBUSI');

// ── STOCK REQUESTS (DSD) ─────────────────────────────
// ADMIN PMI butuh askes GET, APPROVE, dan REJECT
router.get('/requests', requireBoth, getStockRequests);
router.post('/requests', requireDC, createStockRequest);
router.patch('/requests/:id/approve', requireBoth, approveStockRequest);
router.patch('/requests/:id/reject', requireBoth, rejectStockRequest);

// ── DISTRIBUTION CENTER ──────────────────────────────
// HANYA UNTUK ADMIN DISTRIBUSI
router.get('/dc/stock', requireDC, getDCStock);
router.get('/dc/inventory', requireDC, getDCInventory);
router.post('/dc/inventory', requireDC, addDCInventory);

export default router;
