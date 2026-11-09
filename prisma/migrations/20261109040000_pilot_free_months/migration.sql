-- Pilot tailors: the Club plan is free for the first 2 months (9 Nov 2026).
ALTER TABLE "TailorProfile" ADD COLUMN "pilot" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "freeUntil" TIMESTAMP(3);
