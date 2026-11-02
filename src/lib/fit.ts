// "Remembers your fit": measurements a tailor takes at the fitting, saved to the
// customer's fit record on tailor me. The record belongs to the customer: they
// can see and delete every entry, and every tailor they book through tailor me
// sees it. Only the tailor of a paid booking can write an entry for it, and
// customers can't change what a tailor wrote. Pure, unit tested.
import type { BookingStatus } from "@prisma/client";
import { findContactDetails } from "./contact-filter";

export const MEASURES = {
  neck: "Neck",
  chest: "Chest",
  bust: "Bust",
  shoulder: "Shoulder",
  sleeve: "Sleeve",
  waist: "Waist",
  hip: "Hip",
  rise: "Rise",
  thigh: "Thigh",
  inseam: "Inseam",
  outseam: "Outseam",
  length: "Finished length",
} as const;
export type MeasureKey = keyof typeof MEASURES;
export type Measurements = Partial<Record<MeasureKey, number>>;

const BY_GARMENT: Record<string, MeasureKey[]> = {
  "Trousers / jeans": ["waist", "hip", "inseam", "outseam", "rise", "thigh"],
  "Dress / skirt": ["bust", "waist", "hip", "length"],
  "Shirt / top": ["neck", "chest", "shoulder", "sleeve", "length"],
  "Jacket / coat": ["chest", "shoulder", "sleeve", "length"],
  "Knitwear / activewear": ["chest", "waist", "sleeve", "length"],
  "School / work uniform": ["chest", "waist", "sleeve", "inseam", "length"],
  Other: ["chest", "waist", "hip", "sleeve", "inseam", "length"],
};

/** The measurements worth asking for on this garment. Empty = not a fit job (curtains, bags). */
export const measuresFor = (garment: string): MeasureKey[] => BY_GARMENT[garment] ?? [];
export const fitApplies = (garment: string) => measuresFor(garment).length > 0;

export const MAX_FIT_NOTE = 500;

type BookingLike = { tailorId: string; status: BookingStatus };
type Verdict = { ok: true } | { ok: false; reason: string };

/** Only the tailor of a paid booking records the fit for it. */
export function canRecordFit(tailorId: string, booking: BookingLike | null | undefined): Verdict {
  if (!booking || booking.tailorId !== tailorId) return { ok: false, reason: "Only the tailor booked for this job can record the fit." };
  if (booking.status !== "CONFIRMED" && booking.status !== "COMPLETED") return { ok: false, reason: "You can record the fit once the booking is paid." };
  return { ok: true };
}

/** A tailor sees a customer's whole fit record (from every tailor) once that customer has a paid booking with them. */
export const canSeeFitRecord = (tailorId: string, bookedTailorIds: Set<string>) => bookedTailorIds.has(tailorId);

/**
 * Reads the fit form: cm values for the garment's measurements (blank = skip) and a note.
 * Needs at least one value or a note.
 */
export function parseFit(garment: string, fields: Record<string, unknown>): { ok: true; measurements: Measurements; notes: string | null } | { ok: false; reason: string } {
  const measurements: Measurements = {};
  for (const key of measuresFor(garment)) {
    const raw = String(fields[`m_${key}`] ?? "").trim().replace(",", ".");
    if (!raw) continue;
    const cm = Number(raw);
    if (!Number.isFinite(cm) || cm < 1 || cm > 250) return { ok: false, reason: `${MEASURES[key]} should be in centimetres, between 1 and 250.` };
    measurements[key] = Math.round(cm * 2) / 2; // nearest half centimetre
  }
  const notes = String(fields.notes ?? "").trim().slice(0, MAX_FIT_NOTE) || null;
  const leak = findContactDetails(notes);
  if (leak) return { ok: false, reason: `Please take the ${leak} out of the fit notes.` };
  if (!Object.keys(measurements).length && !notes) return { ok: false, reason: "Add at least one measurement or a note." };
  return { ok: true, measurements, notes };
}

/** "Waist 82 cm · Inseam 78.5 cm", in a steady order. */
export function describeFit(m: Measurements): [string, string][] {
  return (Object.keys(MEASURES) as MeasureKey[]).filter((k) => m[k] != null).map((k) => [MEASURES[k], `${m[k]} cm`]);
}
