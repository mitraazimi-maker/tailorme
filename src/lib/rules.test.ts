import { describe, expect, it } from "vitest";
import { canAcceptQuote, canQuote, canReview, canTailorSeeJob, contactShared, isClubMember, isFeatured } from "./rules";

const tailor = { id: "t1", userId: "u-t1", clubStatus: "ACTIVE" as const, clubTier: "STARTER" as const };
const plus = { ...tailor, id: "t-plus", featuredStatus: "ACTIVE" as const };
const lapsed = { ...tailor, clubStatus: "CANCELED" as const };
// Posted an hour ago, so the Featured head start has passed.
const job = { id: "j1", customerId: "u-c1", status: "OPEN" as const, createdAt: new Date(Date.now() - 3600_000) };

describe("canQuote", () => {
  it("allows a Club member on an open job", () => expect(canQuote(tailor, job, 0, false).ok).toBe(true));
  it("requires Club membership", () => expect(canQuote(lapsed, job, 0, false).ok).toBe(false));
  it("caps at three quotes", () => expect(canQuote(tailor, job, 3, false).ok).toBe(false));
  it("one quote per tailor", () => expect(canQuote(tailor, job, 1, true).ok).toBe(false));
  it("not on closed jobs", () => expect(canQuote(tailor, { ...job, status: "BOOKED" }, 0, false).ok).toBe(false));
  it("not on your own job", () => expect(canQuote(tailor, { ...job, customerId: "u-t1" }, 0, false).ok).toBe(false));
});

describe("canTailorSeeJob", () => {
  it("lapsed members can't see open jobs", () => expect(canTailorSeeJob(lapsed, job, null).ok).toBe(false));
  it("the booked tailor keeps access", () => expect(canTailorSeeJob(lapsed, { ...job, status: "BOOKED" }, "t1").ok).toBe(true));
  it("other tailors lose access once booked", () => expect(canTailorSeeJob(tailor, { ...job, status: "BOOKED" }, "t2").ok).toBe(false));
});

describe("canAcceptQuote", () => {
  const quote = { jobId: "j1", status: "PENDING" as const };
  it("only the job's customer", () => {
    expect(canAcceptQuote("u-c1", job, quote).ok).toBe(true);
    expect(canAcceptQuote("someone-else", job, quote).ok).toBe(false);
  });
  it("not a quote from another job", () => expect(canAcceptQuote("u-c1", job, { ...quote, jobId: "j2" }).ok).toBe(false));
  it("not a withdrawn quote", () => expect(canAcceptQuote("u-c1", job, { ...quote, status: "WITHDRAWN" }).ok).toBe(false));
});

describe("canReview (rule 6)", () => {
  const paid = { customerId: "u-c1", status: "CONFIRMED" as const };
  it("allows the paying customer once", () => {
    expect(canReview("u-c1", paid, false).ok).toBe(true);
    expect(canReview("u-c1", paid, true).ok).toBe(false);
  });
  it("blocks anyone else", () => expect(canReview("u-x", paid, false).ok).toBe(false));
  it("blocks cancelled bookings", () => expect(canReview("u-c1", { ...paid, status: "CANCELLED" }, false).ok).toBe(false));
});

it("contact details are shared only after payment", () => {
  expect(contactShared({ status: "CANCELLED" })).toBe(false);
  expect(contactShared({ status: "CONFIRMED" })).toBe(true);
  expect(contactShared(null)).toBe(false);
});

describe("Featured head start", () => {
  const fresh = { ...job, createdAt: new Date() };
  const later = new Date(Date.now() + 16 * 60_000);
  it("Featured members can see and quote a brand-new job", () => {
    expect(canTailorSeeJob(plus, fresh, null).ok).toBe(true);
    expect(canQuote(plus, fresh, 0, false).ok).toBe(true);
  });
  it("standard members wait 15 minutes", () => {
    const v = canTailorSeeJob(tailor, fresh, null);
    expect(v.ok).toBe(false);
    expect(!v.ok && v.reason).toMatch(/15 min/);
    expect(canQuote(tailor, fresh, 0, false).ok).toBe(false);
    expect(canTailorSeeJob(tailor, fresh, null, later).ok).toBe(true);
    expect(canQuote(tailor, fresh, 0, false, null, later).ok).toBe(true);
  });
  it("a tailor the customer asked for skips the wait", () =>
    expect(canTailorSeeJob(tailor, { ...fresh, requestedTailorId: "t1" }, null).ok).toBe(true));
  it("Featured perks need an active membership", () => {
    expect(isFeatured(plus)).toBe(true);
    expect(isFeatured({ ...plus, clubStatus: "PAST_DUE" })).toBe(false);
    expect(isFeatured(tailor)).toBe(false);
  });
});

describe("head start only when an Featured member matches", () => {
  const fresh = { ...job, createdAt: new Date() };
  it("no Featured match: Starter/Pro members see the job straight away", () =>
    expect(canTailorSeeJob(tailor, { ...fresh, openToAllAt: fresh.createdAt }, null).ok).toBe(true));
  it("Featured match: Starter/Pro members wait until openToAllAt", () =>
    expect(canTailorSeeJob(tailor, { ...fresh, openToAllAt: new Date(Date.now() + 15 * 60_000) }, null).ok).toBe(false));
});

describe("exclusive rebooks", () => {
  const rebook = { ...job, exclusive: true, requestedTailorId: "t1" };
  it("the customer's own tailor can see and quote", () => {
    expect(canTailorSeeJob(tailor, rebook, null).ok).toBe(true);
    expect(canQuote(tailor, rebook, 0, false).ok).toBe(true);
  });
  it("other tailors, even Featured, can't", () => {
    expect(canTailorSeeJob(plus, rebook, null).ok).toBe(false);
    expect(canQuote(plus, rebook, 0, false).ok).toBe(false);
  });
  it("once opened up, everyone can", () => expect(canQuote(plus, { ...rebook, exclusive: false }, 0, false).ok).toBe(true));
});

describe("suspension", () => {
  const suspended = { ...plus, suspendedUntil: new Date(Date.now() + 864e5) };
  it("a suspended tailor isn't a member and can't quote or see jobs", () => {
    expect(isClubMember(suspended)).toBe(false);
    expect(isFeatured(suspended)).toBe(false);
    const v = canQuote(suspended, job, 0, false);
    expect(!v.ok && v.reason).toMatch(/suspended/);
    expect(canTailorSeeJob(suspended, job, null).ok).toBe(false);
  });
  it("membership counts again once the suspension ends", () =>
    expect(isClubMember({ ...plus, suspendedUntil: new Date(Date.now() - 1000) })).toBe(true));
  it("a suspended tailor keeps access to jobs they're already booked on", () =>
    expect(canTailorSeeJob(suspended, { ...job, status: "BOOKED" }, suspended.id).ok).toBe(true));
});

describe("monthly jobs", () => {
  const out = { allowance: 5, carried: 0, extras: 0, used: 5, left: 0 };
  const some = { ...out, used: 4, left: 1 };
  it("quotes while jobs are left", () => expect(canQuote(tailor, job, 0, false, some).ok).toBe(true));
  it("blocks new quotes when they're used up, and says how to fix it", () => {
    const v = canQuote(tailor, job, 0, false, out);
    expect(v.ok).toBe(false);
    expect(!v.ok && v.reason).toMatch(/Buy extra jobs or upgrade/);
  });
  it("a rebook from their own customer is always free", () =>
    expect(canQuote(tailor, { ...job, exclusive: true, requestedTailorId: tailor.id }, 0, false, out).ok).toBe(true));
  it("extra jobs let them quote again", () => expect(canQuote(tailor, job, 0, false, { ...out, extras: 5, left: 5 }).ok).toBe(true));
});
