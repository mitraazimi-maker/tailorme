-- CreateEnum
CREATE TYPE "ClubTier" AS ENUM ('CLUB', 'PLUS');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "clubNotifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TailorProfile" ADD COLUMN     "clubTier" "ClubTier" NOT NULL DEFAULT 'CLUB';

-- CreateTable
CREATE TABLE "PortfolioPhoto" (
    "id" TEXT NOT NULL,
    "tailorId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioPhoto_storageKey_key" ON "PortfolioPhoto"("storageKey");

-- CreateIndex
CREATE INDEX "PortfolioPhoto_tailorId_idx" ON "PortfolioPhoto"("tailorId");

-- AddForeignKey
ALTER TABLE "PortfolioPhoto" ADD CONSTRAINT "PortfolioPhoto_tailorId_fkey" FOREIGN KEY ("tailorId") REFERENCES "TailorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
