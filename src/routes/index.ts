// src/routes/index.ts
// Router utama — aggregator semua sub-router.
// Setiap modul fitur memiliki router-nya sendiri (auth, bloodStock, donor, dll).
// Daftarkan router baru di sini ketika membuat fitur baru.

import { Router } from 'express';
import authRouter from './auth.routes';
import bloodStockRouter from './bloodStock.routes';
import regionRouter from './region.routes';
import donorRouter from './donorHistory.routes';

const router = Router();

// ── Health Check ────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'PMI Donorku API berjalan dengan baik 🩸',
    timestamp: new Date().toISOString(),
  });
});

// ── Feature Routes ──────────────────────────────────────────────────
router.use('/auth', authRouter);
router.use('/profile', require('./profile.routes').default);
router.use('/regions', regionRouter);
router.use('/blood-stocks', bloodStockRouter); 
router.use('/donors', donorRouter);
router.use('/users', require('./user.routes').default);
router.use('/events', require('./event.routes').default);
router.use('/notifications', require('./notification.routes').default);
router.use('/distribution', require('./distribution.routes').default);
router.use('/hospital', require('./hospital.routes').default);

export default router;
