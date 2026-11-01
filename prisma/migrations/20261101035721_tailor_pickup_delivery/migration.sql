-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "wantsPickup" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "pickupFeeCents" INTEGER;

-- AlterTable
ALTER TABLE "TailorProfile" ADD COLUMN     "offersPickup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pickupFeeCents" INTEGER,
ADD COLUMN     "pickupNote" TEXT,
ADD COLUMN     "pickupRadiusKm" INTEGER NOT NULL DEFAULT 8;
