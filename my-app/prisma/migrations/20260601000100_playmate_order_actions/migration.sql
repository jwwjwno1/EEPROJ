ALTER TABLE "Appointment" ADD COLUMN "rejectReason" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "rejectedAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN "proofImage" TEXT;
