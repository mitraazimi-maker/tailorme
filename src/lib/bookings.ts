import "server-only";
import type { ClubStatus } from "@prisma/client";
import { db } from "./db";
import { notify } from "./notify";

/**
 * Books a quote. Free for the customer, so it confirms at once: contact details
 * are shared, the other quotes are declined, and (unless it's a rebook) the
 * tailor uses one of their monthly jobs. Safe to call twice for the same job.
 */
export async function bookQuote(args: { quoteId: string; jobId: string; customerId: string; tailorId: string; isRepeat: boolean }) {
  const booking = await db.$transaction(async (tx) => {
    // A job has at most one booking (jobId is unique); a double click finds the first.
    if (await tx.booking.findUnique({ where: { jobId: args.jobId } })) return null;
    const created = await tx.booking.create({ data: { ...args, status: "CONFIRMED", bookedAt: new Date() } });
    await tx.quote.update({ where: { id: args.quoteId }, data: { status: "ACCEPTED" } });
    await tx.quote.updateMany({ where: { jobId: args.jobId, id: { not: args.quoteId }, status: "PENDING" }, data: { status: "DECLINED" } });
    await tx.job.update({ where: { id: args.jobId }, data: { status: "BOOKED" } });
    return created;
  });
  if (!booking) return null;
  const full = await db.booking.findUniqueOrThrow({
    where: { id: booking.id },
    include: { job: true, customer: true, tailor: { include: { user: true } } },
  });
  await notify(full.tailor.user.email, `Booked: job ${full.job.ref}`, `${full.customer.firstName} booked you for "${full.job.work} · ${full.job.garment}". Their contact details are on the job page.`);
  await notify(full.customer.email, `You're booked with ${full.tailor.businessName}`, `Your booking for job ${full.job.ref} is confirmed. The tailor's contact details are on your job page.`);
  return booking;
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

/** Tailors this customer has booked through tailor me: rebooking them is free for the tailor too. */
export async function bookedTailorIds(customerId: string, exceptJobId?: string) {
  const rows = await db.booking.findMany({
    where: { customerId, status: { in: ["CONFIRMED", "COMPLETED"] }, ...(exceptJobId && { jobId: { not: exceptJobId } }) },
    select: { tailorId: true },
    distinct: ["tailorId"],
  });
  return new Set(rows.map((r) => r.tailorId));
}

/** Marks extra jobs paid. Idempotent: Stripe may deliver the webhook twice. */
export async function confirmExtraJobs(purchaseId: string) {
  await db.extraJobsPurchase.updateMany({ where: { id: purchaseId, status: "PENDING" }, data: { status: "PAID", paidAt: new Date() } });
}
