-- CreateTable
CREATE TABLE "appointment_attendees" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_by_id" TEXT NOT NULL,

    CONSTRAINT "appointment_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "appointment_attendees_appointment_id_user_id_key" ON "appointment_attendees"("appointment_id", "user_id");

-- AddForeignKey
ALTER TABLE "appointment_attendees" ADD CONSTRAINT "appointment_attendees_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_attendees" ADD CONSTRAINT "appointment_attendees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_attendees" ADD CONSTRAINT "appointment_attendees_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
