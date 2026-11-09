import { describe, expect, it } from "vitest";
import { PLANS, creditsFor, hasCredit, monthEnd, monthKey, monthStart, prevMonthKey, rollover } from "./plans";

it("prices and allowances are as decided", () => {
  expect([PLANS.STARTER.priceCents, PLANS.STARTER.jobs]).toEqual([2900, 5]);
  expect([PLANS.PRO.priceCents, PLANS.PRO.jobs]).toEqual([5900, 10]);
  expect([PLANS.BUSY.priceCents, PLANS.BUSY.jobs]).toEqual([14900, 25]);
  expect([PLANS.STUDIO.priceCents, PLANS.STUDIO.jobs]).toEqual([24900, 50]);
  expect([PLANS.UNLIMITED.priceCents, PLANS.UNLIMITED.jobs]).toEqual([29900, null]);
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
  it("adds last month's unused", () => expect(creditsFor("PRO", u(0, 6, 10), longAgo, now)).toMatchObject({ carried: 4, left: 14 }));
  it("rollover lasts one month only", () =>
    // Used nothing for two months: the carry is capped at one month's allowance.
    expect(creditsFor("STARTER", u(0, 0, 0), longAgo, now)).toMatchObject({ carried: 5, left: 10 }));
  it("Busy has 25", () => expect(creditsFor("BUSY", u(24, 25, 25), longAgo, now)).toMatchObject({ allowance: 25, left: 1 }));
  it("Unlimited never runs out", () => expect(hasCredit(creditsFor("UNLIMITED", u(500, 0, 0), longAgo, now))).toBe(true));
});
