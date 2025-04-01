-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL,
    "initiatorConfirmed" BOOLEAN NOT NULL,
    "partnerConfirmed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- AddForeignKey
ALTER TABLE "consent" ADD CONSTRAINT "consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent" ADD CONSTRAINT "consent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
