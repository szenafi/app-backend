-- AlterTable
ALTER TABLE "consent" ADD COLUMN     "biometricValidated" BOOLEAN,
ADD COLUMN     "biometricValidatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PackConsentement" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackConsentement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackConsentement_userId_key" ON "PackConsentement"("userId");

-- AddForeignKey
ALTER TABLE "PackConsentement" ADD CONSTRAINT "PackConsentement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
