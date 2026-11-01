import { describe, expect, it } from "vitest";
import { pointsEarned, progressLabel, voucherFor } from "./rewards";

describe("rewards", () => {
  it("earns 10 per booking and 20 per rebook", () => {
    expect(pointsEarned(false)).toBe(10);
    expect(pointsEarned(true)).toBe(20);
  });
  it("applies no voucher below 50 points", () => expect(voucherFor(49, 900)).toBe(0));
  it("takes $5 off a bigger fee", () => expect(voucherFor(50, 900)).toBe(500));
  it("covers a $5 fee entirely", () => expect(voucherFor(80, 500)).toBe(500));
  it("waives a remainder under Stripe's 50c minimum", () => expect(voucherFor(50, 530)).toBe(530));
  it("charges a remainder of 50c or more", () => expect(voucherFor(50, 550)).toBe(500));
  it("describes progress", () => {
    expect(progressLabel(30)).toBe("30 of 50 points to a $5 voucher.");
    expect(progressLabel(50)).toMatch(/voucher ready/);
  });
});
