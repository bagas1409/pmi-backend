-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN_PMI', 'USER');

-- CreateEnum
CREATE TYPE "BloodType" AS ENUM ('A', 'B', 'AB', 'O');

-- CreateEnum
CREATE TYPE "Rhesus" AS ENUM ('POSITIVE', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "BloodProduct" AS ENUM ('WB', 'PRC', 'TC', 'FFP');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donor_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "whatsapp_number" TEXT NOT NULL,
    "blood_type" "BloodType",
    "rhesus" "Rhesus",
    "last_donation_date" TIMESTAMP(3),
    "total_donations" INTEGER NOT NULL DEFAULT 0,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "udd_regions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "udd_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_stocks" (
    "id" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "blood_type" "BloodType" NOT NULL,
    "product_type" "BloodProduct" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blood_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation_histories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "location_name" TEXT NOT NULL,
    "donation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donation_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "donor_profiles_user_id_key" ON "donor_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "donor_profiles_nik_key" ON "donor_profiles"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "donor_profiles_whatsapp_number_key" ON "donor_profiles"("whatsapp_number");

-- CreateIndex
CREATE INDEX "blood_stocks_blood_type_product_type_idx" ON "blood_stocks"("blood_type", "product_type");

-- CreateIndex
CREATE UNIQUE INDEX "blood_stocks_region_id_blood_type_product_type_key" ON "blood_stocks"("region_id", "blood_type", "product_type");

-- AddForeignKey
ALTER TABLE "donor_profiles" ADD CONSTRAINT "donor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_stocks" ADD CONSTRAINT "blood_stocks_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "udd_regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_histories" ADD CONSTRAINT "donation_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
