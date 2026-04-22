-- CreateTable
CREATE TABLE "udd_registrations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'REGISTERED',
    "scheduled_for" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "udd_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "udd_registrations_user_id_region_id_key" ON "udd_registrations"("user_id", "region_id");

-- AddForeignKey
ALTER TABLE "udd_registrations" ADD CONSTRAINT "udd_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "udd_registrations" ADD CONSTRAINT "udd_registrations_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "udd_regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
