import "server-only";
import type { ClubStatus } from "@prisma/client";
import { db } from "./db";
import { notify } from "./notify";
import { VOUCHER_POINTS, pointsEarned } from "./rewards";

/**
 * Marks a booking paid. Idempotent: Stripe can deliver the same webhook more
 * than once, and the simulate route can be refreshed.
 */
export async function confirmBooking(bookingId: string) {
  const booking = await db.$transaction(async (tx) => {
    const b = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!b) throw new Error(`booking ${bookingId} not found`);
    if (b.status !== "PENDING_PAYMENT") return null;
    const updated = await tx.booking.update({ where: { id: b.id }, data: { status: "CONFIRMED", paidAt: new Date() } });
    await tx.quote.update({ where: { id: b.quoteId }, data: { status: "ACCEPTED" } });
    await tx.quote.updateMany({ where: { jobId: b.jobId, id: { not: b.quoteId }, status: "PENDING" }, data: { status: "DECLINED" } });
    await tx.job.update({ where: { id: b.jobId }, data: { status: "BOOKED" } });
    // Rewards: earn on every booking made through tailor me; spend if a voucher was used.
    await tx.pointsEntry.createMany({
      data: [
        { userId: b.customerId, bookingId: b.id, reason: b.isRepeat ? "rebook" : "booking", points: pointsEarned(b.isRepeat) },
        ...(b.voucherCents > 0 ? [{ userId: b.customerId, bookingId: b.id, reason: "voucher", points: -VOUCHER_POINTS }] : []),
      ],
      skipDuplicates: true,
    });
    return updated;
  });
  if (!booking) return;
  const full = await db.booking.findUniqueOrThrow({
    where: { id: booking.id },
    include: { job: true, customer: true, tailor: { include: { user: true } } },
  });
  await notify(full.tailor.user.email, `Booked: job ${full.job.ref}`, `${full.customer.firstName} booked you for "${full.job.work} · ${full.job.garment}". Their contact details are on the job page.`);
  await notify(full.customer.email, `You're booked with ${full.tailor.businessName}`, `Your booking for job ${full.job.ref} is confirmed. The tailor's contact details are on your job page.`);
}

export function clubStatusFromStripe(status: string): ClubStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "PAST_DUE";
    default:
      return "CANCELED";
  }
}

/** Tailors this customer has a paid booking with: rebooking them costs the flat repeat fee. */
export async function bookedTailorIds(customerId: string, exceptJobId?: string) {
  const rows = await db.booking.findMany({
    where: { customerId, paidAt: { not: null }, status: { in: ["CONFIRMED", "COMPLETED"] }, ...(exceptJobId && { jobId: { not: exceptJobId } }) },
    select: { tailorId: true },
    distinct: ["tailorId"],
  });
  return new Set(rows.map((r) => r.tailorId));
}

export async function pointsBalance(userId: string) {
  const agg = await db.pointsEntry.aggregate({ where: { userId }, _sum: { points: true } });
  return agg._sum.points ?? 0;
}

/** Points not already promised to a voucher on an unpaid booking (so one voucher can't be used twice). */
export async function spendablePoints(userId: string, exceptBookingId?: string) {
  const [balance, held] = await Promise.all([
    pointsBalance(userId),
    db.booking.count({ where: { customerId: userId, status: "PENDING_PAYMENT", voucherCents: { gt: 0 }, ...(exceptBookingId && { id: { not: exceptBookingId } }) } }),
  ]);
  return balance - held * VOUCHER_POINTS;
}
