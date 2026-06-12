ALTER TABLE "Playmate" ADD COLUMN "discordId" TEXT;

ALTER TABLE "Appointment" ADD COLUMN "rating" INTEGER;
ALTER TABLE "Appointment" ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Playmate_discordId_key" ON "Playmate"("discordId");
