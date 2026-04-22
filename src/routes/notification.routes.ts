import { Router } from 'express';
import { 
    getNotifications, 
    getMyNotifications, 
    markNotificationRead,
    broadcastNotification,
    testDonorReminder
} from '../controllers/notification.controller';
import { verifyToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// ── Endpoint User Mobile ────────────────────────────────────────────
router.get('/me', verifyToken, getMyNotifications);
router.patch('/:id/read', verifyToken, markNotificationRead);

// ── Endpoint Admin broadcast ────────────────────────────────────────
router.get('/', getNotifications);
router.post('/broadcast', verifyToken, authorizeRole('ADMIN_PMI'), broadcastNotification);

// ── Endpoint Dev Testing ────────────────────────────────────────────
router.post('/test-reminder', testDonorReminder);

export default router;
