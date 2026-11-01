import { describe, expect, it } from "vitest";
import { pickupPriceLabel, picksUpFrom } from "./pickup";

const mariam = { offersPickup: true, pickupFeeCents: 1500, pickupRadiusKm: 5, suburb: "Paddington" };

describe("picksUpFrom", () => {
  it("collects within the tailor's radius", () => expect(picksUpFrom(mariam, "Surry Hills")).toBe(true));
  it("not beyond it", () => expect(picksUpFrom(mariam, "Parramatta")).toBe(false));
  it("not when the tailor doesn't offer pickup", () => expect(picksUpFrom({ ...mariam, offersPickup: false }, "Paddington")).toBe(false));
  it("not for an unknown suburb", () => expect(picksUpFrom(mariam, "Atlantis")).toBe(false));
});

it("labels the price", () => {
  expect(pickupPriceLabel(1500)).toBe("$15");
  expect(pickupPriceLabel(0)).toBe("free");
  expect(pickupPriceLabel(null)).toBe("free");
});
