/*
  Warnings:

  - You are about to drop the `treatment_sessions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "treatment_sessions" DROP CONSTRAINT "treatment_sessions_appointment_id_fkey";

-- DropTable
DROP TABLE "treatment_sessions";
