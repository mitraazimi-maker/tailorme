import { describe, expect, it } from "vitest";
import { canRecordFit, canSeeFitRecord, describeFit, fitApplies, measuresFor, parseFit } from "./fit";

describe("measuresFor", () => {
  it("asks for trouser measurements on trousers", () => expect(measuresFor("Trousers / jeans")).toContain("inseam"));
  it("isn't a fit job for curtains or bags", () => {
    expect(fitApplies("Curtains / homewares")).toBe(false);
    expect(fitApplies("Bag / accessory")).toBe(false);
  });
});

describe("canRecordFit", () => {
  it("the booked tailor, once paid", () => {
    expect(canRecordFit("t1", { tailorId: "t1", status: "CONFIRMED" }).ok).toBe(true);
    expect(canRecordFit("t1", { tailorId: "t1", status: "COMPLETED" }).ok).toBe(true);
  });
  it("not on a cancelled booking", () => expect(canRecordFit("t1", { tailorId: "t1", status: "CANCELLED" }).ok).toBe(false));
  it("not another tailor", () => expect(canRecordFit("t2", { tailorId: "t1", status: "CONFIRMED" }).ok).toBe(false));
  it("not without a booking", () => expect(canRecordFit("t1", null).ok).toBe(false));
});

it("tailors see the record only once booked", () => {
  expect(canSeeFitRecord("t1", new Set(["t1"]))).toBe(true);
  expect(canSeeFitRecord("t2", new Set(["t1"]))).toBe(false);
});

describe("parseFit", () => {
  it("keeps only the garment's measurements, rounded to half a cm", () => {
    const r = parseFit("Trousers / jeans", { m_inseam: "78.3", m_waist: "82", m_sleeve: "61", notes: "" });
    expect(r).toEqual({ ok: true, measurements: { inseam: 78.5, waist: 82 }, notes: null });
  });
  it("accepts a comma decimal", () => expect(parseFit("Trousers / jeans", { m_inseam: "78,5" })).toMatchObject({ measurements: { inseam: 78.5 } }));
  it("rejects silly numbers", () => expect(parseFit("Trousers / jeans", { m_inseam: "780" }).ok).toBe(false));
  it("needs something", () => expect(parseFit("Trousers / jeans", {}).ok).toBe(false));
  it("a note on its own is fine", () => expect(parseFit("Dress / skirt", { notes: "Wears 5 cm heels" })).toMatchObject({ ok: true, notes: "Wears 5 cm heels" }));
  it("blocks contact details in notes", () => expect(parseFit("Dress / skirt", { notes: "text me 0412 345 678" }).ok).toBe(false));
});

it("describes in a steady order", () => {
  expect(describeFit({ inseam: 78, waist: 82 })).toEqual([["Waist", "82 cm"], ["Inseam", "78 cm"]]);
});
