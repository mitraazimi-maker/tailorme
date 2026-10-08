import "server-only";
import type { ClubStatus } from "@prisma/client";
import { db } from "./db";
import { notify } from "./notify";

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
