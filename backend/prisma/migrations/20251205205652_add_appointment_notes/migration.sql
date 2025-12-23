-- CreateTable
CREATE TABLE "appointment_notes" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_notes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "appointment_notes" ADD CONSTRAINT "appointment_notes_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_notes" ADD CONSTRAINT "appointment_notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
