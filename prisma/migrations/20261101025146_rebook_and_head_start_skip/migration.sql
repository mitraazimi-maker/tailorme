-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "exclusive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "openToAllAt" TIMESTAMP(3);
