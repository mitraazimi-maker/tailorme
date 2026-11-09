import { describe, expect, it } from "vitest";
import { DISCLAIMER, INTRO, categoryFor, estimate } from "./catalog";

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
