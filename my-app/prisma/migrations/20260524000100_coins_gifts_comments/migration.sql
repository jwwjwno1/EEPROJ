ALTER TABLE "User" ADD COLUMN "coinBalance" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Playmate" ADD COLUMN "coinBalance" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Appointment" ADD COLUMN "coinCost" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Appointment" ADD COLUMN "lateFee" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Appointment" ADD COLUMN "chargedAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN "ratingComment" TEXT;

CREATE TABLE "GiftRecord" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "playmateId" INTEGER NOT NULL,
    "giftName" TEXT NOT NULL,
    "coinCost" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlaymateCoinTransaction" (
    "id" SERIAL NOT NULL,
    "playmateId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "appointmentId" INTEGER,
    "giftId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaymateCoinTransaction_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GiftRecord" ADD CONSTRAINT "GiftRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GiftRecord" ADD CONSTRAINT "GiftRecord_playmateId_fkey" FOREIGN KEY ("playmateId") REFERENCES "Playmate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlaymateCoinTransaction" ADD CONSTRAINT "PlaymateCoinTransaction_playmateId_fkey" FOREIGN KEY ("playmateId") REFERENCES "Playmate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
