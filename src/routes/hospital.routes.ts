// src/routes/hospital.routes.ts
import { Router } from 'express';
import {
  submitRoleRequest, getMyRoleRequestStatus,
  getRoleRequests, approveRoleRequest, rejectRoleRequest,
  createBloodRequest, getBloodRequests, getMyBloodRequests,
  processBloodRequest, rejectBloodRequest, getDispensingHistory
} from '../controllers/hospital.controller';
import { verifyToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Semua endpoint butuh login
router.use(verifyToken);

// ── ROLE REQUESTS ─────────────────────────────────────────────
// USER mengajukan role RS_SWASTA
router.post('/role-requests', authorizeRole('USER'), submitRoleRequest);
// USER cek status pengajuannya sendiri
router.get('/role-requests/my', authorizeRole('USER', 'RS_SWASTA'), getMyRoleRequestStatus);
// ADMIN PMI melihat semua pengajuan
router.get('/role-requests', authorizeRole('ADMIN_PMI'), getRoleRequests);
// ADMIN PMI approve/reject
router.patch('/role-requests/:id/approve', authorizeRole('ADMIN_PMI'), approveRoleRequest);
router.patch('/role-requests/:id/reject', authorizeRole('ADMIN_PMI'), rejectRoleRequest);

// ── BLOOD REQUESTS ────────────────────────────────────────────
// RS SWASTA buat permintaan darah
router.post('/blood-requests', authorizeRole('RS_SWASTA'), createBloodRequest);
// RS SWASTA lihat riwayat requestnya sendiri
router.get('/blood-requests/my', authorizeRole('RS_SWASTA'), getMyBloodRequests);
// ADMIN DISTRIBUSI lihat semua request masuk
router.get('/blood-requests', authorizeRole('ADMIN_DISTRIBUSI', 'ADMIN_PMI'), getBloodRequests);
// ADMIN DISTRIBUSI proses / tolak request
router.patch('/blood-requests/:id/process', authorizeRole('ADMIN_DISTRIBUSI'), processBloodRequest);
router.patch('/blood-requests/:id/reject', authorizeRole('ADMIN_DISTRIBUSI'), rejectBloodRequest);

// ── DISPENSING HISTORY ────────────────────────────────────────
// Audit trail stok keluar — bisa dilihat Admin PMI dan Admin Distribusi
router.get('/dispensings', authorizeRole('ADMIN_PMI', 'ADMIN_DISTRIBUSI'), getDispensingHistory);

export default router;
