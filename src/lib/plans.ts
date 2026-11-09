// tailor me Club tiers (decided 9 Nov 2026; Busy added and Unlimited raised to $299 the same day; Studio, 80 jobs at $219, added to soften the step to Unlimited). Customers pay nothing; tailors pay a
// monthly membership that includes a number of jobs won. A job is "used" only
// when a customer books the tailor (never for a quote that loses), and rebooks
// from a customer who booked them before are always free. Unused jobs roll over
// for one month. Pure, unit tested.
import type { ClubTier } from "@prisma/client";

export type Plan = { tier: ClubTier; name: string; priceCents: number; jobs: number | null; perks: string[] };

export const PLANS: Record<ClubTier, Plan> = {
  STARTER: { tier: "STARTER", name: "Starter", priceCents: 2900, jobs: 5, perks: [] },
  PRO: { tier: "PRO", name: "Pro", priceCents: 5900, jobs: 15, perks: [] },
  BUSY: { tier: "BUSY", name: "Busy", priceCents: 14900, jobs: 40, perks: [] },
  STUDIO: { tier: "STUDIO", name: "Studio", priceCents: 21900, jobs: 80, perks: [] },
  UNLIMITED: {
    tier: "UNLIMITED",
    name: "Unlimited",
    priceCents: 29900,
    jobs: null,
    perks: ["Featured first in search (labelled as paid placement)", "15-minute head start on new matching jobs", "Portfolio gallery, up to 12 photos"],
  },
};
export const TIERS: ClubTier[] = ["STARTER", "PRO", "BUSY", "STUDIO", "UNLIMITED"];

export const planPriceLabel = (tier: ClubTier) => `$${PLANS[tier].priceCents / 100}/month`;
export const planJobsLabel = (tier: ClubTier) => {
  const n = PLANS[tier].jobs;
  return n == null ? "Unlimited jobs" : `${n} jobs a month`;
};

/** Sydney calendar month, e.g. "2026-11". Credits reset on the 1st. */
export function monthKey(d: Date): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit" }).formatToParts(d);
  return `${p.find((x) => x.type === "year")!.value}-${p.find((x) => x.type === "month")!.value}`;
}
export const prevMonthKey = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};
const nextMonthKey = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};

/** The instant a Sydney month starts (handles AEST/AEDT). */
export function monthStart(key: string): Date {
  const [y, m] = key.split("-").map(Number);
  // Try both Sydney offsets; keep the one that lands on local midnight of the 1st.
  for (const offsetH of [11, 10]) {
    const d = new Date(Date.UTC(y, m - 1, 1, -offsetH));
    if (monthKey(d) === key && monthKey(new Date(d.getTime() - 1)) !== key) return d;
  }
  throw new Error(`can't place the start of ${key}`);
}
export const monthEnd = (key: string) => monthStart(nextMonthKey(key));
/** "1 Dec": when credits next reset. */
export const resetLabel = (now = new Date()) =>
  monthEnd(monthKey(now)).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Sydney" });

/**
 * Unused jobs carried from last month. Last month's wins use its own carried-over
 * jobs first, and whatever carries never exceeds one month's allowance.
 */
export function rollover(allowance: number, usedLastMonth: number, carriedIntoLastMonth: number): number {
  const fromOwn = Math.max(0, usedLastMonth - carriedIntoLastMonth);
  return Math.max(0, Math.min(allowance, allowance - fromOwn));
}

export type Credits = { unlimited: true } | { unlimited: false; allowance: number; carried: number; used: number; left: number };

/**
 * Jobs left this month. Uses the tailor's current tier for the months before
 * (an upgrade takes effect at once). `used` counts are new bookings won, not rebooks.
 * Only months the tailor was a member carry anything over (`clubSince`).
 */
export function creditsFor(
  tier: ClubTier,
  used: { thisMonth: number; lastMonth: number; monthBefore: number },
  clubSince: Date | null,
  now = new Date(),
): Credits {
  const allowance = PLANS[tier].jobs;
  if (allowance == null) return { unlimited: true };
  const thisKey = monthKey(now);
  const lastKey = prevMonthKey(thisKey);
  const joined = clubSince ? monthKey(clubSince) : thisKey;
  const memberIn = (key: string) => joined <= key;
  const carriedIntoLast = memberIn(prevMonthKey(lastKey)) ? rollover(allowance, used.monthBefore, 0) : 0;
  const carried = memberIn(lastKey) ? rollover(allowance, used.lastMonth, carriedIntoLast) : 0;
  const left = Math.max(0, allowance + carried - used.thisMonth);
  return { unlimited: false, allowance, carried, used: used.thisMonth, left };
}

export const hasCredit = (c: Credits) => c.unlimited || c.left > 0;

/** Featured placement, the head start and the portfolio come with Unlimited. */
export const hasTopPerks = (tier: ClubTier) => tier === "UNLIMITED";
