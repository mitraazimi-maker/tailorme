-- 9 Nov 2026: no Unlimited plan. Extra jobs are bought one-off, and Featured
-- (featured placement, head start, portfolio) is its own add-on on any plan.

CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'PAID');

ALTER TABLE "TailorProfile" ADD COLUMN "featuredRenewsAt" TIMESTAMP(3),
ADD COLUMN "featuredStatus" "ClubStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "featuredSubscriptionId" TEXT;
CREATE UNIQUE INDEX "TailorProfile_featuredSubscriptionId_key" ON "TailorProfile"("featuredSubscriptionId");

-- Unlimited members keep their perks as Featured and move to Studio (50 jobs).
-- Pre-launch there are no live Stripe subscriptions on the old Unlimited price.
UPDATE "TailorProfile" SET "featuredStatus" = "clubStatus", "featuredRenewsAt" = "clubRenewsAt" WHERE "clubTier" = 'UNLIMITED';

BEGIN;
CREATE TYPE "ClubTier_new" AS ENUM ('STARTER', 'PRO', 'BUSY', 'STUDIO');
ALTER TABLE "TailorProfile" ALTER COLUMN "clubTier" DROP DEFAULT;
ALTER TABLE "TailorProfile" ALTER COLUMN "clubTier" TYPE "ClubTier_new"
  USING (CASE "clubTier"::text WHEN 'UNLIMITED' THEN 'STUDIO' ELSE "clubTier"::text END)::"ClubTier_new";
ALTER TYPE "ClubTier" RENAME TO "ClubTier_old";
ALTER TYPE "ClubTier_new" RENAME TO "ClubTier";
DROP TYPE "ClubTier_old";
ALTER TABLE "TailorProfile" ALTER COLUMN "clubTier" SET DEFAULT 'STARTER';
COMMIT;

CREATE TABLE "ExtraJobsPurchase" (
    "id" TEXT NOT NULL,
    "tailorId" TEXT NOT NULL,
    "jobs" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "stripeSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    CONSTRAINT "ExtraJobsPurchase_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExtraJobsPurchase_stripeSessionId_key" ON "ExtraJobsPurchase"("stripeSessionId");
CREATE INDEX "ExtraJobsPurchase_tailorId_month_status_idx" ON "ExtraJobsPurchase"("tailorId", "month", "status");
ALTER TABLE "ExtraJobsPurchase" ADD CONSTRAINT "ExtraJobsPurchase_tailorId_fkey" FOREIGN KEY ("tailorId") REFERENCES "TailorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
