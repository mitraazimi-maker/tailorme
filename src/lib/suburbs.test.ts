import { describe, expect, it } from "vitest";
import { distanceKm, findSuburb } from "./suburbs";

describe("suburbs", () => {
  it("matches loosely", () => {
    expect(findSuburb("paddington")).toBe("Paddington");
    expect(findSuburb("Paddington, NSW 2021")).toBe("Paddington");
    expect(findSuburb("Atlantis")).toBeNull();
  });
  it("computes plausible distances", () => {
    expect(distanceKm("Paddington", "Paddington")).toBe(0);
    const d = distanceKm("Paddington", "Parramatta")!;
    expect(d).toBeGreaterThan(18);
    expect(d).toBeLessThan(26);
    expect(distanceKm("Paddington", "Atlantis")).toBeNull();
  });
});
