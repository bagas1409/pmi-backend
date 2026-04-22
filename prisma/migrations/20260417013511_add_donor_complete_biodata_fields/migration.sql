-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- AlterTable
ALTER TABLE "donor_profiles" ADD COLUMN     "address" TEXT,
ADD COLUMN     "birth_date" TIMESTAMP(3),
ADD COLUMN     "birth_place" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "job" TEXT,
ADD COLUMN     "marital_status" TEXT,
ADD COLUMN     "subdistrict" TEXT,
ADD COLUMN     "village" TEXT;
