import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ApiResponse } from '../utils/ApiResponse';

export const getEvents = async (req: Request, res: Response) => {
    const rawEvents = await prisma.donorEvent.findMany({
        orderBy: { startDate: 'asc' },
        include: {
            uddRegion: {
                select: { id: true, kodeUdd: true, name: true }
            },
            participants: {
                select: { userId: true, status: true }
            }
        }
    });

    // Real-time status evaluation
    const now = new Date();
    const events = rawEvents.map(ev => {
        // Jangan ubah jika dibatalkan admin
        if (ev.status === 'CANCELLED') return ev;

        const start = new Date(ev.startDate);
        const end = new Date(ev.endDate);

        let realStatus = 'UPCOMING';
        if (now >= start && now <= end) {
            realStatus = 'ONGOING';
        } else if (now > end) {
            realStatus = 'COMPLETED';
        }

        return { ...ev, status: realStatus };
    });

    ApiResponse.success(res, 'Berhasil mengambil daftar event', events);
};

export const createEvent = async (req: Request, res: Response) => {
    const { title, description, locationName, latitude, longitude, startDate, endDate, status, uddRegionId } = req.body;
    
    // Validasi dasar
    if (!title || !locationName || !startDate || !endDate) {
        return ApiResponse.error(res, 'Harap isi title, locationName, startDate, dan endDate', 400);
    }

    if (uddRegionId) {
        const checkRegion = await prisma.uddRegion.findUnique({ where: { id: uddRegionId } });
        if (!checkRegion) {
            return ApiResponse.error(res, 'Cabang UDD tidak ditemukan', 404);
        }
    }

    // Sanitasi & validasi koordinat
    const parsedLat = latitude ? parseFloat(String(latitude)) : null;
    const parsedLon = longitude ? parseFloat(String(longitude)) : null;

    const validLat = parsedLat !== null && Math.abs(parsedLat) <= 90 ? parsedLat : null;
    const validLon = parsedLon !== null && Math.abs(parsedLon) <= 180 ? parsedLon : null;

    if ((latitude && validLat === null) || (longitude && validLon === null)) {
        return ApiResponse.error(res, 'Koordinat latitude/longitude tidak valid. Pastikan format desimal yang benar (contoh: -5.362145, 104.975402)', 400);
    }
    
    const event = await prisma.donorEvent.create({
        data: {
            title,
            description,
            locationName,
            latitude: validLat,
            longitude: validLon,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            status: status || 'UPCOMING',
            uddRegionId: uddRegionId || null
        }
    });
    ApiResponse.created(res, 'Event berhasil dibuat', event);
};

export const deleteEvent = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await prisma.donorEvent.delete({ where: { id } });
    ApiResponse.success(res, 'Event berhasil dihapus');
};

// ============================================================
// MOBILE ENDPOINT (USER)
// ============================================================

export const joinEvent = async (req: Request, res: Response) => {
    const eventId = req.params.id as string;
    const userId = (req as any).user?.id;

    if (!userId) return ApiResponse.unauthorized(res, 'Sesi tidak valid.');

    // 1. Pastikan DonorProfile eksis dan lengkap
    const profile = await prisma.donorProfile.findUnique({ where: { userId } });
    if (!profile || !profile.gender || !profile.birthDate || !profile.address) {
        return ApiResponse.error(res, 'Profil belum lengkap! Harap lengkapi biodata pendaftaran donor Anda.', 403);
    }

    if (profile.lastDonationDate) {
        const daysSinceLast = Math.floor((Date.now() - new Date(profile.lastDonationDate).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLast < 60) {
            return ApiResponse.error(res, 'Anda masih dalam masa pemulihan (belum 60 hari sejak donor terakhir).', 403);
        }
    }

    // 2. Cegah duplikasi
    const existing = await prisma.eventParticipant.findUnique({
        where: { userId_eventId: { userId, eventId } }
    });
    
    if (existing) {
        return ApiResponse.error(res, 'Anda sudah terdaftar di event ini.', 409);
    }

    // 3. Gabung Event
    const participant = await prisma.eventParticipant.create({
        data: { userId, eventId, status: 'REGISTERED' }
    });

    ApiResponse.created(res, 'Berhasil mendaftar ke kegiatan donor!', participant);
};

// ============================================================
// ADMIN ENDPOINTS
// ============================================================

export const getEventParticipants = async (req: Request, res: Response) => {
    const eventId = req.params.id as string;

    const participants = await prisma.eventParticipant.findMany({
        where: { eventId },
        orderBy: { registeredAt: 'desc' },
        include: {
            user: {
                select: {
                    email: true,
                    donorProfile: {
                        select: { fullName: true, bloodType: true, whatsappNumber: true, totalDonations: true }
                    }
                }
            }
        }
    });

    // Formatting agar flat untuk UI
    const mapped = participants.map(p => ({
        id: p.id,
        userId: p.userId,
        status: p.status,
        registeredAt: p.registeredAt,
        fullName: p.user.donorProfile?.fullName || p.user.email,
        bloodType: p.user.donorProfile?.bloodType || '?',
        whatsappNumber: p.user.donorProfile?.whatsappNumber || '-',
        totalDonations: p.user.donorProfile?.totalDonations || 0
    }));

    ApiResponse.success(res, 'Data peserta event berhasil diambil', mapped);
};

export const updateParticipantStatus = async (req: Request, res: Response) => {
    const participantId = req.params.participantId as string;
    const { status } = req.body; // 'ATTENDED' | 'ABSENT'

    if (status !== 'ATTENDED' && status !== 'ABSENT') {
        return ApiResponse.error(res, 'Status tidak valid. Gunakan ATTENDED atau ABSENT', 400);
    }

    const participant: any = await prisma.eventParticipant.findUnique({
        where: { id: participantId },
        include: { 
            event: { include: { uddRegion: true } }, 
            user: { include: { donorProfile: true } } 
        }
    });

    if (!participant) return ApiResponse.notFound(res, 'Peserta tidak ditemukan');

    // Jika status diubah menjadi ATTENDED (dan sebelumnya bukan ATTENDED)
    if (status === 'ATTENDED' && participant.status !== 'ATTENDED') {

        // Validasi: event harus punya UDD terhubung
        if (!participant.event.uddRegionId) {
            return ApiResponse.error(res, 'Event ini belum terhubung ke Cabang UDD. Harap edit event dan pilih UDD terlebih dahulu sebelum memvalidasi donor.', 422);
        }

        const bloodType = participant.user.donorProfile?.bloodType;

        await prisma.$transaction(async (tx) => {
            // Update status
            await tx.eventParticipant.update({
                where: { id: participantId },
                data: { status }
            });

            // Increment total donasi & update lastDonationDate
            if (participant.user.donorProfile) {
                await tx.donorProfile.update({
                    where: { userId: participant.userId },
                    data: { 
                        totalDonations: { increment: 1 },
                        lastDonationDate: new Date()
                    }
                });
            }

            // Tambahkan Riwayat Donasi dengan regionId & sourceType
            await tx.donationHistory.create({
                data: {
                    userId: participant.userId,
                    locationName: participant.event.locationName,
                    donationDate: new Date(),
                    regionId: participant.event.uddRegionId,
                    sourceType: 'EVENT'
                }
            });

            // Auto-increment stok WB di UDD terhubung
            if (bloodType) {
                await tx.bloodStock.upsert({
                    where: {
                        regionId_bloodType_productType: {
                            regionId: participant.event.uddRegionId,
                            bloodType: bloodType,
                            productType: 'WB'
                        }
                    },
                    update: { quantity: { increment: 1 } },
                    create: {
                        regionId: participant.event.uddRegionId,
                        bloodType: bloodType,
                        productType: 'WB',
                        quantity: 1
                    }
                });
            }

            // Notifikasi Personal
            const name = participant.user.donorProfile?.fullName || 'Pendonor';
            await tx.notification.create({
                data: {
                    title: '🩸 Donasi Anda Telah Dikonfirmasi!',
                    message: `Terima kasih, ${name}! Donasi darah Anda pada kegiatan "${participant.event.title}" di ${participant.event.locationName} telah diverifikasi. Stok darah UDD ${participant.event.uddRegion?.name || ''} kini bertambah berkat Anda! 💪`,
                    type: 'INFO',
                    targetUsers: `USER:${participant.userId}`,
                    targetUserId: participant.userId,
                    isRead: false,
                }
            });
        });
    } else {
        // Cukup Update Status
        await prisma.eventParticipant.update({
            where: { id: participantId },
            data: { status }
        });
    }

    ApiResponse.success(res, 'Berhasil memperbarui status partisipan');
};
