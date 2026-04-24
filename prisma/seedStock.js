// Script Seed Tangguh untuk Prisma v7 (Wajib Driver Adapter)
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL tidak ditemukan di .env');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('🚀 Memulai pengisian stok darah (Mode Driver Adapter)...');

  try {
    const regions = await prisma.uddRegion.findMany();
    const bloodTypes = ['A', 'B', 'AB', 'O'];
    const productTypes = ['WB', 'PRC', 'TC', 'FFP'];

    for (const region of regions) {
      console.log(`\nInisialisasi Stok untuk: ${region.name}`);
      for (const bt of bloodTypes) {
        for (const pt of productTypes) {
          const qty = (pt === 'WB') ? 50 : 10;
          await prisma.bloodStock.upsert({
            where: {
              regionId_bloodType_productType: {
                regionId: region.id,
                bloodType: bt,
                productType: pt
              }
            },
            update: { quantity: qty },
            create: {
              regionId: region.id,
              bloodType: bt,
              productType: pt,
              quantity: qty
            }
          });
        }
        process.stdout.write(`.` );
      }
    }
    console.log('\n\n✅ SELESAI! Stok berhasil diisi.');
  } catch (err) {
    console.error('❌ Terjadi Kesalahan:', err.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
