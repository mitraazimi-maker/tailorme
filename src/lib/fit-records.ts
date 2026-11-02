import "server-only";
import { db } from "./db";
import type { Measurements } from "./fit";

export type FitEntry = { id: string; bookingId: string; garment: string; measurements: Measurements; notes: string | null; date: Date; tailorName: string; tailorId: string };

/** A customer's fit record, newest first. Callers check who may see it (canSeeFitRecord). */
export async function fitRecordFor(customerId: string, take = 20): Promise<FitEntry[]> {
  const rows = await db.fitRecord.findMany({
    where: { customerId },
    include: { tailor: { select: { businessName: true } } },
    orderBy: { updatedAt: "desc" },
    take,
  });
  return rows.map((r) => ({
    id: r.id,
    bookingId: r.bookingId,
    garment: r.garment,
    measurements: (r.measurements ?? {}) as Measurements,
    notes: r.notes,
    date: r.updatedAt,
    tailorName: r.tailor.businessName,
    tailorId: r.tailorId,
  }));
}
