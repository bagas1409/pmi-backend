// src/routes/region.routes.ts
import { Router } from 'express';
import { getAll, create, update, remove, joinUdd, getRegistrants, updateRegistrant } from '../controllers/region.controller';
import { verifyToken, authorizeRole, optionalVerifyToken } from '../middleware/auth.middleware';

const router = Router();

// GET /api/v1/regions — bisa diakses publik (untuk dropdown registrasi)
// Jika dilengkapi token, akan mengembalikan `isRegistered` untuk UDD
router.get('/', optionalVerifyToken, getAll);

// Rute untuk User Umum (Aplikasi Mobile)
router.post('/:id/join', verifyToken, joinUdd);

// Sisanya WAJIB Admin PMI
router.use(verifyToken, authorizeRole('ADMIN_PMI'));

router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

// Admin: Mengelola Pendaftar In-House Harian
router.get('/:id/registrants', getRegistrants);
router.patch('/registrants/:id', updateRegistrant); // perhatikan ini /registrants/:id (id dari pendaftaran)

export default router;
