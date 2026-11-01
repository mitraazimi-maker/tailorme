import { describe, expect, it } from "vitest";
import { DISCLAIMER, INTRO, bookingFeeCents, categoryFor, estimate, quoteBookingFeeCents } from "./catalog";

describe("copy that must stay verbatim (CLAUDE.md rules 2 and 4)", () => {
  it("disclaimer", () =>
    expect(DISCLAIMER).toBe("Quotes are a guide only. The tailor must inspect the garment and how it is made before confirming the final price."));
  it("introduction notice", () =>
    expect(INTRO).toBe("tailor me introduces you to independent tailors. Any agreement, the work and payment are between you and the tailor. tailor me is not a party to that agreement."));
});

describe("categoryFor", () => {
  it("routes by garment first for uniforms and homewares", () => {
    expect(categoryFor("School / work uniform", "Shorten / hem")).toBe("uniform");
    expect(categoryFor("Curtains / homewares", "Shorten / hem")).toBe("home");
  });
  it("routes by work otherwise", () => {
    expect(categoryFor("Dress / skirt", "Take in")).toBe("fit");
    expect(categoryFor("Jacket / coat", "Replace zip")).toBe("zips");
    expect(categoryFor("Knitwear / activewear", "Patch or darn")).toBe("repair");
  });
});

describe("estimate", () => {
  it("rounds to $5 and applies garment and rush multipliers", () => {
    expect(estimate("Trousers / jeans", "Shorten / hem", "Flexible")).toEqual([15, 40]);
    expect(estimate("Jacket / coat", "Shorten / hem", "Flexible")).toEqual([20, 55]);
    expect(estimate("Trousers / jeans", "Shorten / hem", "This week")).toEqual([20, 50]);
  });
});

describe("bookingFeeCents (15%, $5 minimum, no cap)", () => {
  it("never charges less than $5", () => {
    expect(bookingFeeCents(1400)).toBe(500);
    expect(bookingFeeCents(3300)).toBe(500);
  });
  it("charges 15% above $33.33", () => {
    expect(bookingFeeCents(6000)).toBe(900);
    expect(bookingFeeCents(20000)).toBe(3000);
  });
  it("rounds to the cent", () => expect(bookingFeeCents(4567)).toBe(685));
});

describe("repeat booking fee", () => {
  it("is a flat $5 with a tailor you've booked before, whatever the quote", () => {
    expect(bookingFeeCents(20000, true)).toBe(500);
    expect(bookingFeeCents(1400, true)).toBe(500);
  });
});

describe("booking fee includes quoted pickup", () => {
  it("15% of work + pickup", () => expect(quoteBookingFeeCents({ priceCents: 3000, pickupFeeCents: 1500 })).toBe(675));
  it("still $5 minimum", () => expect(quoteBookingFeeCents({ priceCents: 1500, pickupFeeCents: 1000 })).toBe(500));
  it("no pickup: unchanged", () => expect(quoteBookingFeeCents({ priceCents: 6000, pickupFeeCents: null })).toBe(900));
  it("rebooks stay a flat $5 with pickup", () => expect(quoteBookingFeeCents({ priceCents: 20000, pickupFeeCents: 2000 }, true)).toBe(500));
});
