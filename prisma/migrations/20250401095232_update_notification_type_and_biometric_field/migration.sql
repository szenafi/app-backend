/*
  Warnings:

  - Made the column `biometricValidated` on table `consent` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'BIOMETRIC_CONFIRMATION';

-- AlterTable
ALTER TABLE "consent" ALTER COLUMN "biometricValidated" SET NOT NULL,
ALTER COLUMN "biometricValidated" SET DEFAULT false;
