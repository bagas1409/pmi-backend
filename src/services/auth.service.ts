// src/services/auth.service.ts
// Layer bisnis untuk autentikasi. Controller TIDAK boleh langsung akses database.
// Semua kalkulasi, hashing, dan query Prisma dilakukan di sini.

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import { RegisterInput, LoginInput } from '../utils/validators/auth.validator';

const CTX = 'AuthService'; // Context label untuk logger

// ── Helper: Buat JWT Token ──────────────────────────────────────────
const signToken = (payload: { id: string; email: string; role: string }): string => {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

// ── 1. Register ────────────────────────────────────────────────────
export const registerService = async (data: RegisterInput) => {
  logger.info(CTX, `Mencoba registrasi akun baru → email: ${data.email}`);

  // Cek duplikasi email
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) {
    logger.warn(CTX, `Registrasi gagal — email sudah terdaftar: ${data.email}`);
    throw new Error('EMAIL_TAKEN');
  }

  // Cek duplikasi NIK
  const existingNik = await prisma.donorProfile.findUnique({ where: { nik: data.nik } });
  if (existingNik) {
    logger.warn(CTX, `Registrasi gagal — NIK sudah terdaftar: ${data.nik}`);
    throw new Error('NIK_TAKEN');
  }

  // Hash password (salt rounds = 12 untuk keamanan production)
  const passwordHash = await bcrypt.hash(data.password, 12);
  logger.debug(CTX, `Password berhasil di-hash untuk: ${data.email}`);

  // Buat user + profil donor dalam satu transaksi atomik
  // Jika salah satu gagal, keduanya di-rollback
  const newUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: 'USER',
      },
    });

    await tx.donorProfile.create({
      data: {
        userId:          user.id,
        nik:             data.nik,
        fullName:        data.fullName,
        whatsappNumber:  data.whatsappNumber,
        bloodType:       data.bloodType,
      },
    });

    return user;
  });

  logger.success(CTX, `Registrasi berhasil → userId: ${newUser.id} | email: ${newUser.email}`);

  const token = signToken({ id: newUser.id, email: newUser.email, role: newUser.role });

  return {
    token,
    user: {
      id:    newUser.id,
      email: newUser.email,
      role:  newUser.role,
    },
  };
};

// ── 2. Login ────────────────────────────────────────────────────────
export const loginService = async (data: LoginInput) => {
  logger.info(CTX, `Percobaan login → email: ${data.email}`);

  // Cari user + sertakan profil donor (jika ada)
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: {
      donorProfile: {
        select: {
          fullName:        true,
          nik:             true,
          whatsappNumber:  true,
          bloodType:       true,
          gender:          true,
          birthPlace:      true,
          birthDate:       true,
          address:         true,
          village:         true,
          subdistrict:     true,
          city:            true,
          job:             true,
          maritalStatus:   true,
          totalDonations:  true,
          lastDonationDate:true,
        },
      },
    },
  });

  if (!user) {
    logger.warn(CTX, `Login gagal — email tidak ditemukan: ${data.email}`);
    throw new Error('INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    logger.warn(CTX, `Login gagal — akun dinonaktifkan: ${data.email}`);
    throw new Error('ACCOUNT_INACTIVE');
  }

  // Bandingkan password plain-text dengan hash di database
  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
  if (!isPasswordValid) {
    logger.warn(CTX, `Login gagal — password salah untuk: ${data.email}`);
    throw new Error('INVALID_CREDENTIALS');
  }

  logger.success(CTX, `Login berhasil → userId: ${user.id} | role: ${user.role}`);

  const token = signToken({ id: user.id, email: user.email, role: user.role });

  return {
    token,
    user: {
      id:        user.id,
      email:     user.email,
      role:      user.role,
      isActive:  user.isActive,
      donorProfile: user.donorProfile ?? null,
    },
  };
};

// ── 3. Me (Get Current User) ────────────────────────────────────────
export const getMeService = async (userId: string) => {
  logger.info(CTX, `Mengambil data profil → userId: ${userId}`);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id:        true,
      email:     true,
      role:      true,
      isActive:  true,
      createdAt: true,
      donorProfile: {
        select: {
          fullName:         true,
          nik:              true,
          whatsappNumber:   true,
          bloodType:        true,
          gender:           true,
          birthPlace:       true,
          birthDate:        true,
          address:          true,
          village:          true,
          subdistrict:      true,
          city:             true,
          job:              true,
          maritalStatus:    true,
          lastDonationDate: true,
          totalDonations:   true,
        },
      },
    },
  });

  if (!user) {
    logger.warn(CTX, `Profil tidak ditemukan untuk userId: ${userId}`);
    throw new Error('USER_NOT_FOUND');
  }

  return user;
};
