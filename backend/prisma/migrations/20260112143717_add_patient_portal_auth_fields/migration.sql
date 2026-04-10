-- AlterTable
ALTER TABLE "patients" ADD COLUMN "password_hash" TEXT,
ADD COLUMN "has_portal_access" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "last_login" TIMESTAMP(3),
ADD COLUMN "password_set_by_staff_id" TEXT,
ADD COLUMN "password_set_at" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_password_set_by_staff_id_fkey" FOREIGN KEY ("password_set_by_staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
