// src/controllers/user.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { ApiResponse } from '../utils/ApiResponse';
import { logger } from '../utils/logger';
import { adminRegisterDonorSchema, adminDonorinSchema } from '../utils/validators/user.validator';
import * as regionService from '../services/region.service';

const CTX = 'UserController';

// ── GET /api/v1/users — Daftar semua pendonor ─────────────────────
export const getAllDonors = async (req: Request, res: Response) => {
    const donors = await prisma.user.findMany({
        where: { role: 'USER' },
        select: {
            id: true,
            email: true,
            isActive: true,
            createdAt: true,
            donorProfile: {
                select: {
                    fullName: true,
                    nik: true,
                    whatsappNumber: true,
                    bloodType: true,
                    totalDonations: true,
                    lastDonationDate: true,
                }
            },
            donationHistories: {
                orderBy: { donationDate: 'desc' },
                take: 5,
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    ApiResponse.success(res, 'Berhasil mengambil daftar pendonor', donors);
};

// ── GET /api/v1/users/:userId/profile — Detail profil lengkap ─────
export const getUserProfile = async (req: Request, res: Response) => {
    const userId = req.params.userId as string;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            donorProfile: {
                select: {
                    fullName: true,
                    nik: true,
                    whatsappNumber: true,
                    bloodType: true,
                    totalDonations: true,
                    lastDonationDate: true,
                    gender: true,
                    birthPlace: true,
                    birthDate: true,
                    job: true,
                    maritalStatus: true,
                    address: true,
                    village: true,
                    subdistrict: true,
                    city: true,
                    latitude: true,
                    longitude: true,
                }
            },
            donationHistories: {
                orderBy: { donationDate: 'desc' },
            },
            eventParticipants: {
                include: {
                    event: {
                        select: {
                            title: true,
                            locationName: true,
                            startDate: true,
                        }
                    }
                },
                orderBy: { registeredAt: 'desc' },
                take: 10,
            }
        }
    });

    if (!user) {
        return void ApiResponse.notFound(res, 'Pengguna tidak ditemukan.');
    }

    logger.info(CTX, `Admin melihat profil userId: ${userId}`);
    ApiResponse.success(res, 'Data profil pendonor berhasil diambil.', user);
};

// ── POST /api/v1/users/register — Admin tambah pendonor manual ────
export const adminRegisterDonor = async (req: Request, res: Response) => {
    const validatedData = adminRegisterDonorSchema.parse(req.body);

    // Cek duplikasi email
    const existingUser = await prisma.user.findUnique({ where: { email: validatedData.email } });
    if (existingUser) {
        return void ApiResponse.error(res, 'Email ini sudah terdaftar. Gunakan email lain.', 409);
    }

    // Cek duplikasi NIK
    const existingNik = await prisma.donorProfile.findUnique({ where: { nik: validatedData.nik } });
    if (existingNik) {
        return void ApiResponse.error(res, 'NIK ini sudah terdaftar di sistem.', 409);
    }

    // Cek duplikasi WhatsApp
    const existingWa = await prisma.donorProfile.findUnique({ where: { whatsappNumber: validatedData.whatsappNumber } });
    if (existingWa) {
        return void ApiResponse.error(res, 'Nomor WhatsApp ini sudah terdaftar di sistem.', 409);
    }

    const passwordHash = await bcrypt.hash(validatedData.password, 12);

    const newUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                email: validatedData.email,
                passwordHash,
                role: 'USER',
            },
        });

        await tx.donorProfile.create({
            data: {
                userId:         user.id,
                nik:            validatedData.nik,
                fullName:       validatedData.fullName,
                whatsappNumber: validatedData.whatsappNumber,
                bloodType:      validatedData.bloodType,
                gender:         validatedData.gender,
                birthDate:      validatedData.birthDate,
                birthPlace:     validatedData.birthPlace,
                job:            validatedData.job,
                maritalStatus:  validatedData.maritalStatus,
                address:        validatedData.address,
                village:        validatedData.village,
                subdistrict:    validatedData.subdistrict,
                city:           validatedData.city,
            },
        });

        return user;
    });

    logger.success(CTX, `Admin berhasil mendaftarkan pendonor baru → userId: ${newUser.id}`);

    ApiResponse.created(res, 'Pendonor berhasil ditambahkan oleh admin.', {
        userId: newUser.id,
        email: newUser.email,
        fullName: validatedData.fullName,
    });
};

// ── POST /api/v1/users/:userId/donorin — Admin mendaftar user ke Event/Region ────
export const adminDonorin = async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const adminId = (req as any).user?.id;
    
    const validatedData = adminDonorinSchema.parse(req.body);
    const { targetType, targetId } = validatedData;

    try {
        // 1. Dapatkan Profil Relawan
        const profile = await prisma.donorProfile.findUnique({ where: { userId } });
        if (!profile || !profile.gender || !profile.birthDate || !profile.address) {
            return void ApiResponse.error(res, 'Profil relawan belum lengkap! Pendonor tidak bisa didaftarkan.', 403);
        }

        // 2. Cek Masa Pemulihan (60 hari)
        if (profile.lastDonationDate) {
            const daysSinceLast = Math.floor((Date.now() - new Date(profile.lastDonationDate).getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceLast < 60) {
                return void ApiResponse.error(res, 'Relawan masih dalam masa pemulihan (belum 60 hari sejak donor terakhir).', 403);
            }
        }

        // 3. Daftarkan
        if (targetType === 'REGION') {
            const reg = await regionService.joinUddRegion(userId, targetId);
            logger.success(CTX, `Admin ${adminId} berhasil mendaftarkan userId ${userId} ke antrean UDD ${targetId}`);
            return void ApiResponse.created(res, 'Berhasil mendaftarkan relawan ke antrean harian markas.', reg);
        }

        if (targetType === 'EVENT') {
            const existing = await prisma.eventParticipant.findUnique({
                where: { userId_eventId: { userId, eventId: targetId } }
            });
            if (existing) {
                return void ApiResponse.error(res, 'Relawan sudah terdaftar di event keliling ini.', 409);
            }

            const participant = await prisma.eventParticipant.create({
                data: { userId, eventId: targetId, status: 'REGISTERED' }
            });

            logger.success(CTX, `Admin ${adminId} berhasil mendaftarkan userId ${userId} ke event ${targetId}`);
            return void ApiResponse.created(res, 'Berhasil mendaftarkan relawan ke kegiatan event keliling!', participant);
        }

    } catch (error: any) {
        if (error.message === 'ALREADY_REGISTERED') {
            return void ApiResponse.error(res, 'Relawan ini sudah terdaftar di antrean markas UDD tersebut untuk hari ini.', 409);
        }
        throw error;
    }
};
