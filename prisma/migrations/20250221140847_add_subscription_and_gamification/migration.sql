-- AlterTable
ALTER TABLE "user" ADD COLUMN     "badges" TEXT,
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0;
