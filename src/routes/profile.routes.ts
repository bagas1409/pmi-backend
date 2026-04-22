import { Router } from 'express';
import { completeProfile, updateBloodType } from '../controllers/profile.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

// Route melengkapi biodata perfil pendonor
router.post('/complete', verifyToken, completeProfile);

// Route untuk mengubah golongan darah
router.patch('/blood-type', verifyToken, updateBloodType);

export default router;
