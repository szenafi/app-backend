-- AlterTable
ALTER TABLE "consent" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "isSubscribed" BOOLEAN NOT NULL DEFAULT false;
