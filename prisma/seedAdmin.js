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

  const adminEmail = 'admin@pmipringsewu.org';
  const distribusiEmail = 'distribusi@pmipringsewu.org';
  const plainPassword = 'password123'; // Ubah sesuai kebutuhan sebelum go-public

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(plainPassword, salt);

  // --- SEED ADMIN PMI ---
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: 'ADMIN_PMI',
        isActive: true,
      },
    });
    console.log(`✅ [ADMIN_PMI] dibuat -> ${adminEmail}`);
  } else {
    console.log(`⚠️  [ADMIN_PMI] sudah ada -> ${adminEmail}`);
  }

  // --- SEED ADMIN DISTRIBUSI ---
  const existingDistribusi = await prisma.user.findUnique({
    where: { email: distribusiEmail },
  });

  if (!existingDistribusi) {
    await prisma.user.create({
      data: {
        email: distribusiEmail,
        passwordHash,
        role: 'ADMIN_DISTRIBUSI',
        isActive: true,
      },
    });
    console.log(`✅ [ADMIN_DISTRIBUSI] dibuat -> ${distribusiEmail}`);
  } else {
    console.log(`⚠️  [ADMIN_DISTRIBUSI] sudah ada -> ${distribusiEmail}`);
  }

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
