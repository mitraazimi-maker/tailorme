-- 9 Nov 2026: booking is free for customers; tailors pay by Club tier (Starter, Pro, Unlimited).

-- Bookings: unpaid checkouts never became bookings, so drop them (their quotes stay pending).
DELETE FROM "Booking" WHERE "status" = 'PENDING_PAYMENT';
ALTER TABLE "Booking" ADD COLUMN "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "Booking" SET "bookedAt" = COALESCE("paidAt", "createdAt");
DROP INDEX "Booking_stripeCheckoutSessionId_key";
ALTER TABLE "Booking" DROP COLUMN "feeCents",
DROP COLUMN "paidAt",
DROP COLUMN "stripeCheckoutSessionId",
DROP COLUMN "voucherCents";

BEGIN;
CREATE TYPE "BookingStatus_new" AS ENUM ('CONFIRMED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "Booking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Booking" ALTER COLUMN "status" TYPE "BookingStatus_new" USING ("status"::text::"BookingStatus_new");
ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";
ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";
DROP TYPE "BookingStatus_old";
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';
COMMIT;

-- Tiers: Club ($10) becomes Starter, Club Plus becomes Unlimited (it had the same perks).
BEGIN;
CREATE TYPE "ClubTier_new" AS ENUM ('STARTER', 'PRO', 'UNLIMITED');
ALTER TABLE "TailorProfile" ALTER COLUMN "clubTier" DROP DEFAULT;
ALTER TABLE "TailorProfile" ALTER COLUMN "clubTier" TYPE "ClubTier_new"
  USING (CASE "clubTier"::text WHEN 'PLUS' THEN 'UNLIMITED' ELSE 'STARTER' END)::"ClubTier_new";
ALTER TYPE "ClubTier" RENAME TO "ClubTier_old";
ALTER TYPE "ClubTier_new" RENAME TO "ClubTier";
DROP TYPE "ClubTier_old";
ALTER TABLE "TailorProfile" ALTER COLUMN "clubTier" SET DEFAULT 'STARTER';
COMMIT;

-- Rewards only ever reduced the customer booking fee, which no longer exists.
DROP TABLE "PointsEntry";

-- When a tailor joined, so unused jobs only roll over from months they were a member.
ALTER TABLE "TailorProfile" ADD COLUMN "clubSince" TIMESTAMP(3);
UPDATE "TailorProfile" SET "clubSince" = "createdAt" WHERE "clubStatus" <> 'NONE';
