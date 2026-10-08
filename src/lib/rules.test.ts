import { describe, expect, it } from "vitest";
import { canAcceptQuote, canQuote, canReview, canTailorSeeJob, contactShared } from "./rules";

const tailor = { id: "t1", userId: "u-t1", clubStatus: "ACTIVE" as const };
const lapsed = { ...tailor, clubStatus: "CANCELED" as const };
const job = { id: "j1", customerId: "u-c1", status: "OPEN" as const };

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
  const paid = { customerId: "u-c1", status: "CONFIRMED" as const, paidAt: new Date() };
  it("allows the paying customer once", () => {
    expect(canReview("u-c1", paid, false).ok).toBe(true);
    expect(canReview("u-c1", paid, true).ok).toBe(false);
  });
  it("blocks anyone else", () => expect(canReview("u-x", paid, false).ok).toBe(false));
  it("blocks unpaid bookings", () => expect(canReview("u-c1", { ...paid, status: "PENDING_PAYMENT", paidAt: null }, false).ok).toBe(false));
});

it("contact details are shared only after payment", () => {
  expect(contactShared({ status: "PENDING_PAYMENT" })).toBe(false);
  expect(contactShared({ status: "CONFIRMED" })).toBe(true);
  expect(contactShared(null)).toBe(false);
});
