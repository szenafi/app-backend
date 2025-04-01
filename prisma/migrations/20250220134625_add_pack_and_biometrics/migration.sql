-- AlterTable
ALTER TABLE "consent" ADD COLUMN     "deletedByInitiator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deletedByPartner" BOOLEAN NOT NULL DEFAULT false;
