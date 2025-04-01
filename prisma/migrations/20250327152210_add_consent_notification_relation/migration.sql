-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "consent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
