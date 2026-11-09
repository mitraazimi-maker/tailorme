import { describe, expect, it } from "vitest";
import { EXTRA_JOB_CENTS, FEATURED, PILOT, PLANS, TIERS, getsPilotTrial, inFreePeriod, pilotFreeUntil, cheapestFor, creditsFor, featuredSpotsLeft, hasCredit, monthEnd, monthKey, monthStart, prevMonthKey, rollover } from "./plans";

it("prices and allowances are as decided", () => {
  expect(TIERS.map((t) => [PLANS[t].jobs, PLANS[t].priceCents])).toEqual([[5, 2900], [12, 5900], [25, 12900], [50, 23900]]);
  expect(EXTRA_JOB_CENTS).toBe(700);
  expect([FEATURED.priceCents, FEATURED.perSuburb]).toEqual([7900, 3]);
});

describe("extra jobs never undercut the next plan for regular overflow", () => {
  it("each plan + extras up to the next allowance costs at least the next plan", () => {
    for (let i = 0; i < TIERS.length - 1; i++) {
      const here = PLANS[TIERS.at(i)!], next = PLANS[TIERS.at(i + 1)!];
      expect(here.priceCents + (next.jobs - here.jobs) * EXTRA_JOB_CENTS).toBeGreaterThanOrEqual(next.priceCents);
    }
  });
  it("picks the cheapest mix", () => {
    expect(cheapestFor(4)).toMatchObject({ tier: "STARTER", extras: 0, cents: 2900 });
    expect(cheapestFor(18)).toMatchObject({ tier: "PRO", extras: 6, cents: 5900 + 6 * 700 });
    expect(cheapestFor(45)).toMatchObject({ tier: "STUDIO", extras: 0 });
    expect(cheapestFor(90)).toMatchObject({ tier: "STUDIO", extras: 40, cents: 23900 + 40 * 700 });
  });
});

it("Featured is capped per suburb", () => {
  expect(featuredSpotsLeft(0)).toBe(3);
  expect(featuredSpotsLeft(2)).toBe(1);
  expect(featuredSpotsLeft(5)).toBe(0);
});

describe("Sydney months", () => {
  it("uses Sydney time, not UTC", () => {
    // 31 Oct 14:00 UTC is 1 Nov 01:00 in Sydney (AEDT).
    expect(monthKey(new Date("2026-10-31T14:00:00Z"))).toBe("2026-11");
  });
  it("starts at Sydney midnight in summer and winter", () => {
    expect(monthStart("2026-11").toISOString()).toBe("2026-10-31T13:00:00.000Z"); // AEDT +11
    expect(monthStart("2026-07").toISOString()).toBe("2026-06-30T14:00:00.000Z"); // AEST +10
    expect(monthEnd("2026-12").toISOString()).toBe("2026-12-31T13:00:00.000Z");
  });
  it("wraps the year", () => expect(prevMonthKey("2027-01")).toBe("2026-12"));
});

describe("rollover", () => {
  it("carries what wasn't used", () => expect(rollover(5, 2, 0)).toBe(3));
  it("nothing when all used", () => expect(rollover(5, 7, 0)).toBe(0));
  it("last month's wins use its carried jobs first", () => expect(rollover(5, 4, 3)).toBe(5 - 1));
  it("never more than one month's allowance", () => expect(rollover(5, 0, 5)).toBe(5));
});

describe("creditsFor", () => {
  const now = new Date("2026-11-15T02:00:00Z");
  const longAgo = new Date("2026-01-01T02:00:00Z");
  const u = (thisMonth: number, lastMonth: number, monthBefore: number) => ({ thisMonth, lastMonth, monthBefore });
  it("a tailor who joined this month has exactly their allowance", () =>
    expect(creditsFor("STARTER", u(0, 0, 0), new Date("2026-11-03T02:00:00Z"), now)).toMatchObject({ carried: 0, left: 5 }));
  it("joined last month: carries last month's unused only", () =>
    expect(creditsFor("STARTER", u(0, 2, 0), new Date("2026-10-20T02:00:00Z"), now)).toMatchObject({ carried: 3, left: 8 }));
  it("counts down as jobs are won", () => {
    const c = creditsFor("STARTER", u(4, 5, 5), longAgo, now);
    expect(c).toMatchObject({ allowance: 5, carried: 0, left: 1 });
    expect(hasCredit(c)).toBe(true);
  });
  it("runs out", () => expect(hasCredit(creditsFor("STARTER", u(5, 5, 5), longAgo, now))).toBe(false));
  it("extra jobs bought this month add to what's left", () =>
    expect(creditsFor("STARTER", u(5, 5, 5), longAgo, now, 5)).toMatchObject({ extras: 5, left: 5 }));
  it("adds last month's unused", () => expect(creditsFor("PRO", u(0, 8, 12), longAgo, now)).toMatchObject({ carried: 4, left: 16 }));
  it("a month that ran on extras carries nothing", () => expect(creditsFor("PRO", u(0, 20, 12), longAgo, now)).toMatchObject({ carried: 0, left: 12 }));
  it("rollover lasts one month only", () =>
    // Used nothing for two months: the carry is capped at one month's allowance.
    expect(creditsFor("STARTER", u(0, 0, 0), longAgo, now)).toMatchObject({ carried: 5, left: 10 }));
  it("Studio has 50", () => expect(creditsFor("STUDIO", u(49, 50, 50), longAgo, now)).toMatchObject({ allowance: 50, left: 1 }));
});

describe("pilot tailors", () => {
  const now = new Date("2026-11-15T02:00:00Z");
  it("two months (60 days) free, max 15 tailors", () => {
    expect(PILOT).toEqual({ freeDays: 60, maxTailors: 15 });
    expect(pilotFreeUntil(now).toISOString()).toBe("2027-01-14T02:00:00.000Z");
  });
  it("free until the date, then paid", () => {
    expect(inFreePeriod(pilotFreeUntil(now), now)).toBe(true);
    expect(inFreePeriod(now, new Date(now.getTime() + 1))).toBe(false);
    expect(inFreePeriod(null, now)).toBe(false);
  });
  it("the trial is given once", () => {
    expect(getsPilotTrial({ pilot: true, freeUntil: null })).toBe(true);
    expect(getsPilotTrial({ pilot: true, freeUntil: now })).toBe(false);
    expect(getsPilotTrial({ pilot: false, freeUntil: null })).toBe(false);
  });
});
