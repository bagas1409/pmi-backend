import { Router } from 'express';
import { getAllDonors, getUserProfile, adminRegisterDonor, adminDonorin, adminDeleteUser, adminUpdateUser } from '../controllers/user.controller';
import { verifyToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Semua endpoint khusus ADMIN PMI
router.use(verifyToken, authorizeRole('ADMIN_PMI'));

// GET  /api/v1/users          — Daftar semua pendonor
router.get('/', getAllDonors);

// GET  /api/v1/users/:userId/profile — Detail lengkap profil pendonor
router.get('/:userId/profile', getUserProfile);

// POST /api/v1/users/register  — Admin tambah pendonor manual (walk-in)
router.post('/register', adminRegisterDonor);

// POST /api/v1/users/:userId/donorin — Admin mendaftarkan user ke Region/Event
router.post('/:userId/donorin', adminDonorin);

// PATCH  /api/v1/users/:userId — Admin edit biodata pendonor
router.patch('/:userId', adminUpdateUser);

// DELETE /api/v1/users/:userId — Admin hapus akun pendonor permanen
router.delete('/:userId', adminDeleteUser);

export default router;

