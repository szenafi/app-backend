/*
  Warnings:

  - The `status` column on the `consent` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `paymentStatus` column on the `consent` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `badges` on the `user` table. All the data in the column will be lost.
  - Changed the type of `type` on the `notification` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REFUSED', 'REVOKED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CONSENT_REQUEST', 'CONSENT_ACCEPTED', 'CONSENT_REFUSED', 'SYSTEM');

-- AlterTable
ALTER TABLE "PackConsentement" ADD COLUMN     "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "consent" DROP COLUMN "status",
ADD COLUMN     "status" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
DROP COLUMN "paymentStatus",
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "initiatorConfirmed" SET DEFAULT false,
ALTER COLUMN "partnerConfirmed" SET DEFAULT false;

-- AlterTable
ALTER TABLE "notification" ADD COLUMN     "metadata" JSONB,
DROP COLUMN "type",
ADD COLUMN     "type" "NotificationType" NOT NULL;

-- AlterTable
ALTER TABLE "user" DROP COLUMN "badges",
ADD COLUMN     "subscriptionEndDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "badge" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserBadges" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_UserBadges_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "badge_name_key" ON "badge"("name");

-- CreateIndex
CREATE INDEX "_UserBadges_B_index" ON "_UserBadges"("B");

-- AddForeignKey
ALTER TABLE "_UserBadges" ADD CONSTRAINT "_UserBadges_A_fkey" FOREIGN KEY ("A") REFERENCES "badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserBadges" ADD CONSTRAINT "_UserBadges_B_fkey" FOREIGN KEY ("B") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
