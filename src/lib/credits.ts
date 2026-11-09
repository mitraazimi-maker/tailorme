import "server-only";
import type { ClubTier } from "@prisma/client";
import { db } from "./db";
import { creditsFor, monthEnd, monthKey, monthStart, prevMonthKey, type Credits } from "./plans";

/** New bookings this tailor won in a Sydney month. Rebooks and cancelled bookings don't count. */
async function wonIn(tailorId: string, key: string) {
  return db.booking.count({
    where: { tailorId, isRepeat: false, status: { in: ["CONFIRMED", "COMPLETED"] }, bookedAt: { gte: monthStart(key), lt: monthEnd(key) } },
  });
}

export async function creditsForTailor(t: { id: string; clubTier: ClubTier; clubSince: Date | null }, now = new Date()): Promise<Credits> {
  if (t.clubTier === "UNLIMITED") return { unlimited: true };
  const thisKey = monthKey(now);
  const lastKey = prevMonthKey(thisKey);
  const [thisMonth, lastMonth, monthBefore] = await Promise.all([wonIn(t.id, thisKey), wonIn(t.id, lastKey), wonIn(t.id, prevMonthKey(lastKey))]);
  return creditsFor(t.clubTier, { thisMonth, lastMonth, monthBefore }, t.clubSince, now);
}
