// tailor me Club tiers (decided 9 Nov 2026; prices raised about 30% the same day once
// Sydney's normal job was known to average about $60, not $30). Customers pay nothing; tailors pay a
// monthly plan that includes a number of jobs won. A job is "used" only when a
// customer books the tailor (never for a quote that loses), and rebooks from a
// customer who booked them before are always free. Unused plan jobs roll over for
// one month. There's no unlimited plan: past the allowance a tailor buys extra jobs
// at EXTRA_JOB_CENTS each, valid for that month. Featured is a separate add-on on
// any plan, capped per suburb. Pure, unit tested.
import type { ClubTier } from "@prisma/client";

export type Plan = { tier: ClubTier; name: string; priceCents: number; jobs: number };

export const PLANS: Record<ClubTier, Plan> = {
  STARTER: { tier: "STARTER", name: "Starter", priceCents: 3900, jobs: 5 },
  PRO: { tier: "PRO", name: "Pro", priceCents: 7900, jobs: 12 },
  BUSY: { tier: "BUSY", name: "Busy", priceCents: 16900, jobs: 25 },
  STUDIO: { tier: "STUDIO", name: "Studio", priceCents: 30900, jobs: 50 },
};
export const TIERS: ClubTier[] = ["STARTER", "PRO", "BUSY", "STUDIO"];

/** One extra job, bought when the plan's jobs run out. Set just above the next plan's rate, so upgrading is the better deal for regular overflow. */
export const EXTRA_JOB_CENTS = 900;
export const EXTRA_JOB_PACKS = [1, 5, 10] as const;
export const extraJobsCents = (jobs: number) => jobs * EXTRA_JOB_CENTS;

/** Pilot tailors: the Club plan (not extra jobs or Featured) is free for the first 2 months. */
export const PILOT = { freeDays: 60, maxTailors: 15 } as const;
export const pilotFreeUntil = (from: Date) => new Date(from.getTime() + PILOT.freeDays * 864e5);
/** Whether the plan is in its free period right now. */
export const inFreePeriod = (freeUntil: Date | null | undefined, now = new Date()) => !!freeUntil && freeUntil > now;
/** A pilot tailor who hasn't started their free period yet gets it when they join. */
export const getsPilotTrial = (t: { pilot: boolean; freeUntil: Date | null }) => t.pilot && !t.freeUntil;

/** The Featured add-on: featured placement, the head start and the portfolio. */
export const FEATURED = {
  priceCents: 9900,
  perSuburb: 3,
  perks: ["Featured first in search (labelled as paid placement)", "15-minute head start on new matching jobs", "Portfolio gallery, up to 12 photos"],
} as const;
/** Spots left for Featured in a suburb, given how many other tailors there already have it. */
export const featuredSpotsLeft = (othersFeaturedInSuburb: number) => Math.max(0, FEATURED.perSuburb - othersFeaturedInSuburb);

export const money0 = (cents: number) => `$${(cents / 100).toLocaleString("en-AU")}`;
export const planPriceLabel = (tier: ClubTier) => `${money0(PLANS[tier].priceCents)}/month`;
export const planJobsLabel = (tier: ClubTier) => `${PLANS[tier].jobs} jobs a month`;

/** The cheapest way to cover `jobs` new jobs in a month: a plan plus any extra jobs. */
export function cheapestFor(jobs: number): { tier: ClubTier; extras: number; cents: number } {
  return TIERS.map((tier) => {
    const extras = Math.max(0, jobs - PLANS[tier].jobs);
    return { tier, extras, cents: PLANS[tier].priceCents + extraJobsCents(extras) };
  }).reduce((best, x) => (x.cents < best.cents ? x : best));
}

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

export type Credits = { allowance: number; carried: number; extras: number; used: number; left: number };

/**
 * Jobs left this month: the plan's allowance, plus unused plan jobs from last month,
 * plus extra jobs bought this month, less new bookings won. Uses the tailor's current
 * tier for the months before (an upgrade takes effect at once). `used` counts are new
 * bookings won, not rebooks. Only months the tailor was a member carry anything over.
 */
export function creditsFor(
  tier: ClubTier,
  used: { thisMonth: number; lastMonth: number; monthBefore: number },
  clubSince: Date | null,
  now = new Date(),
  extras = 0,
): Credits {
  const allowance = PLANS[tier].jobs;
  const thisKey = monthKey(now);
  const lastKey = prevMonthKey(thisKey);
  const joined = clubSince ? monthKey(clubSince) : thisKey;
  const memberIn = (key: string) => joined <= key;
  const carriedIntoLast = memberIn(prevMonthKey(lastKey)) ? rollover(allowance, used.monthBefore, 0) : 0;
  const carried = memberIn(lastKey) ? rollover(allowance, used.lastMonth, carriedIntoLast) : 0;
  const left = Math.max(0, allowance + carried + extras - used.thisMonth);
  return { allowance, carried, extras, used: used.thisMonth, left };
}

export const hasCredit = (c: Credits) => c.left > 0;
