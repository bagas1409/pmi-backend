// src/routes/auth.routes.ts
// Routing untuk semua endpoint autentikasi.
//
// Public routes  (tanpa token):  POST /register, POST /login
// Protected route (butuh token): GET  /me

import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', register);

// POST /api/v1/auth/login
router.post('/login', login);

// GET /api/v1/auth/me  → dilindungi JWT
router.get('/me', verifyToken, getMe);

export default router;
