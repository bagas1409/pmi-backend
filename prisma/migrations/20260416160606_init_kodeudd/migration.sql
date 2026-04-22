/*
  Warnings:

  - A unique constraint covering the columns `[kode_udd]` on the table `udd_regions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `kode_udd` to the `udd_regions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "udd_regions" ADD COLUMN     "kode_udd" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "donor_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location_name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "udd_region_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donor_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "target_users" TEXT NOT NULL DEFAULT 'ALL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "udd_regions_kode_udd_key" ON "udd_regions"("kode_udd");

-- AddForeignKey
ALTER TABLE "donor_events" ADD CONSTRAINT "donor_events_udd_region_id_fkey" FOREIGN KEY ("udd_region_id") REFERENCES "udd_regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
