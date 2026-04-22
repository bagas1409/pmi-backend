import { Router } from 'express';
import { getEvents, createEvent, deleteEvent, joinEvent, getEventParticipants, updateParticipantStatus } from '../controllers/event.controller';
import { verifyToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Endpoint publik
router.get('/', getEvents);

// Endpoint User (Mobile)
router.post('/:id/join', verifyToken, joinEvent);

// Endpoint ADMIN
router.post('/', verifyToken, authorizeRole('ADMIN_PMI'), createEvent);
router.delete('/:id', verifyToken, authorizeRole('ADMIN_PMI'), deleteEvent);
router.get('/admin/:id/participants', verifyToken, authorizeRole('ADMIN_PMI'), getEventParticipants);
router.patch('/admin/participants/:participantId', verifyToken, authorizeRole('ADMIN_PMI'), updateParticipantStatus);

export default router;
