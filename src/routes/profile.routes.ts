import { Router } from 'express';
import { completeProfile, updateBloodType, updatePushToken } from '../controllers/profile.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

// Route melengkapi biodata perfil pendonor
router.post('/complete', verifyToken, completeProfile);

// Route untuk mengubah golongan darah
router.patch('/blood-type', verifyToken, updateBloodType);

// Route untuk memperbarui Expo Push Token (Notifikasi Native)
router.put('/push-token', verifyToken, updatePushToken);

export default router;
