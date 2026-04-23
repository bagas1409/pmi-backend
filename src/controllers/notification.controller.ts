import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ApiResponse } from '../utils/ApiResponse';

// ── GET /api/v1/notifications (Broadcast/Admin view) ───────────────
export const getNotifications = async (req: Request, res: Response) => {
    const notifs = await prisma.notification.findMany({
        where: { targetUserId: null }, // Hanya notifikasi publik/broadcast
        orderBy: { createdAt: 'desc' }
    });
    ApiResponse.success(res, 'Berhasil mengambil riwayat notifikasi', notifs);
};

// ── GET /api/v1/notifications/me (Notifikasi Personal User Mobile) ─
export const getMyNotifications = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) return ApiResponse.unauthorized(res, 'Sesi tidak valid.');

    // Ambil: notifikasi personal user + broadcast publik
    const notifs = await prisma.notification.findMany({
        where: {
            OR: [
                { targetUserId: userId },
                { targetUserId: null, targetUsers: 'ALL' }
            ]
        },
        orderBy: { createdAt: 'desc' },
        take: 30 // Batas 30 notif terbaru
    });

    ApiResponse.success(res, 'Notifikasi berhasil diambil', notifs);
};

// ── PATCH /api/v1/notifications/:id/read (Tandai sudah dibaca) ─────
export const markNotificationRead = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const id = req.params.id as string;

    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif) return ApiResponse.notFound(res, 'Notifikasi tidak ditemukan.');
    if (notif.targetUserId && notif.targetUserId !== userId) {
        return ApiResponse.error(res, 'Akses ditolak.', 403);
    }

    await prisma.notification.update({ where: { id }, data: { isRead: true } });
    ApiResponse.success(res, 'Notifikasi ditandai sudah dibaca.');
};

// ── POST /api/v1/notifications/broadcast (ADMIN Broadcast) ─────────
export const broadcastNotification = async (req: Request, res: Response) => {
    const { title, message, type, targetUsers } = req.body;
    
    if (!title || !message) {
        return ApiResponse.error(res, 'Title dan Message wajib diisi untuk broadcast', 400);
    }

    const notif = await prisma.notification.create({
        data: {
            title,
            message,
            type: type || 'EMERGENCY',
            targetUsers: targetUsers || 'ALL'
        }
    });

    // Jalankan service Expo Push setelah trigger record logic
    import('../utils/expoPush').then(({ broadcastPushNotification }) => {
        if (targetUsers === 'ALL' || !targetUsers) {
            broadcastPushNotification(title, message);
        }
    });

    ApiResponse.created(res, 'Siar Darurat / Notifikasi berhasil dipancarkan', notif);
};

// ── POST /api/v1/notifications/test-reminder (DEV ONLY) ────────────
// Endpoint khusus developer untuk trigger cron job sekarang (simulasi 90 hari)
export const testDonorReminder = async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
        return ApiResponse.error(res, 'Endpoint ini hanya tersedia di mode development.', 403);
    }
    const { checkDonorEligibility } = await import('../workers/notification.worker');
    const sent = await checkDonorEligibility();
    ApiResponse.success(res, `Test selesai. ${sent} notifikasi dikirimkan.`, { sent });
};
