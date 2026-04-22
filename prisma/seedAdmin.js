require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL tidak ditemukan di .env');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('⚙️  Memulai proses injeksi Akun Admin PMI...');

  const adminEmail = '  ';
  const plainPassword = 'password123'; // Ubah sesuai kebutuhan sebelum go-public

  // Periksa apakah admin sudah ada
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('⚠️  Akun Admin sudah terdaftar di dalam database.');
    console.log(`Email: ${existingAdmin.email} | Role: ${existingAdmin.role}`);
    return;
  }

  // Melakukan hashing password standar bcrypt
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(plainPassword, salt);

  // Buat admin di tabel users (tanpa donorProfile karena dia adalah instansi)
  const newAdmin = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      role: 'ADMIN_PMI',
      isActive: true,
    },
  });

  console.log('✅ Akun Admin berhasil dibuat secara permanen!');
  console.log('-------------------------------------------');
  console.log(`📧 Email    : ${newAdmin.email}`);
  console.log(`🔑 Password : ${plainPassword}`);
  console.log('-------------------------------------------');
  console.log('Silakan login di portal frontend: http://localhost:5173');
}

main()
  .catch((e) => {
    console.error('❌ Gagal menjalankan seedAdmin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
