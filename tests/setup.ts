import { beforeAll, afterAll } from '@jest/globals';
import { prisma } from '../src/config/prisma';

// Email khusus testing yang aman untuk dihapus
export const TEST_EMAIL = 'jest.test@pmi.id';
export const TEST_NIK = '0000000000000000';

beforeAll(async () => {
  // Membersihkan sisa uji dari skrip sebelumnya yang mungkin gagal/crash
  await cleanupTestUser();
});

afterAll(async () => {
  // Pembersihan pasca-uji agar database bersih
  await cleanupTestUser();
  
  // Tutup koneksi prisma agar Jest bisa stop ('forceExit' kadang masih warning)
  await prisma.$disconnect();
});

const cleanupTestUser = async () => {
  // Menghapus data spesifik berdasarkan email testing.
  // Cascade delete akan otomatis menghapus DonorProfile terkait.
  try {
    const user = await prisma.user.findUnique({
      where: { email: TEST_EMAIL }
    });
    
    if (user) {
      await prisma.user.delete({
        where: { id: user.id }
      });
    }
  } catch (error) {
    console.error('Test cleanup failed', error);
  }
};
