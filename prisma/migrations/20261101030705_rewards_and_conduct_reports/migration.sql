-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'DISMISSED', 'WARNED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "isRepeat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "voucherCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TailorProfile" ADD COLUMN     "suspendedUntil" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT;

-- CreateTable
CREATE TABLE "PointsEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConductReport" (
    "id" TEXT NOT NULL,
    "tailorId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "bookingId" TEXT,
    "details" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ConductReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PointsEntry_userId_idx" ON "PointsEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PointsEntry_bookingId_reason_key" ON "PointsEntry"("bookingId", "reason");

-- CreateIndex
CREATE INDEX "ConductReport_status_idx" ON "ConductReport"("status");

-- CreateIndex
CREATE INDEX "ConductReport_tailorId_idx" ON "ConductReport"("tailorId");

-- AddForeignKey
ALTER TABLE "PointsEntry" ADD CONSTRAINT "PointsEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConductReport" ADD CONSTRAINT "ConductReport_tailorId_fkey" FOREIGN KEY ("tailorId") REFERENCES "TailorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConductReport" ADD CONSTRAINT "ConductReport_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConductReport" ADD CONSTRAINT "ConductReport_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
