-- CreateTable
CREATE TABLE "FitRecord" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tailorId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "garment" TEXT NOT NULL,
    "measurements" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FitRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FitRecord_bookingId_key" ON "FitRecord"("bookingId");

-- CreateIndex
CREATE INDEX "FitRecord_customerId_createdAt_idx" ON "FitRecord"("customerId", "createdAt");

-- AddForeignKey
ALTER TABLE "FitRecord" ADD CONSTRAINT "FitRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitRecord" ADD CONSTRAINT "FitRecord_tailorId_fkey" FOREIGN KEY ("tailorId") REFERENCES "TailorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitRecord" ADD CONSTRAINT "FitRecord_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
