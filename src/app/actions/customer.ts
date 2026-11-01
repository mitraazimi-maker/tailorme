"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { alertOnPost } from "@/lib/alerts";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { bookedTailorIds, confirmBooking, spendablePoints } from "@/lib/bookings";
import { voucherFor } from "@/lib/rewards";
import { quoteBookingFeeCents } from "@/lib/catalog";
import { db } from "@/lib/db";
import { bookingCheckoutUrl } from "@/lib/payments";
import { canAcceptQuote, canReview } from "@/lib/rules";
import { findSuburb } from "@/lib/suburbs";

export async function toggleMyTailor(form: FormData) {
  const slug = String(form.get("slug"));
  const user = await requireUser(`/tailors/${slug}`);
  const tailorId = String(form.get("tailorId"));
  const key = { customerId_tailorId: { customerId: user.id, tailorId } };
  if (await db.myTailor.findUnique({ where: key })) await db.myTailor.delete({ where: key });
  else await db.myTailor.create({ data: { customerId: user.id, tailorId } });
  revalidatePath(`/tailors/${slug}`);
}

/** Accepting a quote creates a booking and sends the customer to pay the booking fee (15% of the quote, min $5). */
export async function acceptQuote(form: FormData) {
  const quoteId = String(form.get("quoteId"));
  const quote = await db.quote.findUnique({ where: { id: quoteId }, include: { job: true, tailor: true } });
  if (!quote) redirect("/jobs");
  const user = await requireUser(`/jobs/${quote.jobId}`);
  const verdict = canAcceptQuote(user.id, quote.job, quote);
  if (!verdict.ok) redirect(`/jobs/${quote.jobId}?error=${encodeURIComponent(verdict.reason)}`);

  // A job has at most one booking. An unpaid one from an abandoned checkout is reused.
  const existing = await db.booking.findUnique({ where: { jobId: quote.jobId } });
  if (existing && existing.status !== "PENDING_PAYMENT") redirect(`/jobs/${quote.jobId}`);
  const isRepeat = (await bookedTailorIds(user.id, quote.jobId)).has(quote.tailorId);
  const feeCents = quoteBookingFeeCents(quote, isRepeat);
  // A rewards voucher comes off automatically when the customer has enough points.
  const voucherCents = voucherFor(await spendablePoints(user.id, existing?.id), feeCents);
  const data = { quoteId: quote.id, tailorId: quote.tailorId, customerId: user.id, feeCents, voucherCents, isRepeat };
  const booking = existing
    ? await db.booking.update({ where: { id: existing.id }, data: { ...data, stripeCheckoutSessionId: null } })
    : await db.booking.create({ data: { ...data, jobId: quote.jobId } });

  // Fully covered by a voucher: nothing to pay, so confirm without a checkout.
  if (feeCents - voucherCents <= 0) {
    await confirmBooking(booking.id);
    redirect(`/jobs/${quote.jobId}?booked=1`);
  }

  const { url, sessionId } = await bookingCheckoutUrl({
    bookingId: booking.id,
    jobId: quote.jobId,
    email: user.email,
    jobRef: quote.job.ref,
    tailorName: quote.tailor.businessName,
    feeCents: feeCents - voucherCents,
  });
  if (sessionId) await db.booking.update({ where: { id: booking.id }, data: { stripeCheckoutSessionId: sessionId } });
  redirect(url);
}

export async function cancelJob(form: FormData) {
  const user = await requireUser();
  const jobId = String(form.get("jobId"));
  await db.job.updateMany({ where: { id: jobId, customerId: user.id, status: "OPEN" }, data: { status: "CANCELLED" } });
  await db.quote.updateMany({ where: { jobId, status: "PENDING" }, data: { status: "DECLINED" } });
  revalidatePath(`/jobs/${jobId}`);
}

const score = z.coerce.number().int().min(1).max(5);
const ReviewIn = z.object({
  bookingId: z.string(),
  rating: score,
  fitFinish: score,
  onTime: score,
  quoteAccuracy: score,
  body: z.string().trim().min(10, "Write at least a sentence.").max(2000),
});

export async function leaveReview(form: FormData) {
  const user = await requireUser();
  const parsed = ReviewIn.safeParse(Object.fromEntries(form));
  const jobId = String(form.get("jobId"));
  if (!parsed.success) redirect(`/jobs/${jobId}?error=${encodeURIComponent(parsed.error.issues[0].message)}#review`);
  const d = parsed.data;
  const booking = await db.booking.findUnique({ where: { id: d.bookingId }, include: { review: { select: { id: true } } } });
  if (!booking) redirect("/jobs");
  const verdict = canReview(user.id, booking, !!booking.review);
  if (!verdict.ok) redirect(`/jobs/${booking.jobId}?error=${encodeURIComponent(verdict.reason)}`);
  if (form.get("offPlatform") === "on")
    await fileReport(user.id, booking.id, booking.tailorId, "Flagged when leaving a review: the tailor suggested booking or paying outside tailor me.", `Review of booking ${booking.id}`);
  await db.review.create({
    data: { bookingId: booking.id, tailorId: booking.tailorId, customerId: user.id, rating: d.rating, fitFinish: d.fitFinish, onTime: d.onTime, quoteAccuracy: d.quoteAccuracy, body: d.body },
  });
  redirect(`/jobs/${booking.jobId}?reviewed=1`);
}

export async function saveFitProfile(form: FormData) {
  const user = await requireUser("/jobs/profile");
  const fitNotes = String(form.get("fitNotes") ?? "").slice(0, 4000);
  const phone = String(form.get("phone") ?? "").trim().slice(0, 30) || null;
  const suburb = findSuburb(String(form.get("suburb") ?? "")) ?? user.suburb;
  await db.user.update({ where: { id: user.id }, data: { fitNotes, phone, suburb } });
  redirect("/jobs/profile?saved=1");
}

/** Opens an exclusive rebook up to other tailors (with the usual Plus head start). */
export async function openJobToAll(form: FormData) {
  const user = await requireUser();
  const jobId = String(form.get("jobId"));
  const updated = await db.job.updateMany({ where: { id: jobId, customerId: user.id, status: "OPEN", exclusive: true }, data: { exclusive: false, clubNotifiedAt: null } });
  if (updated.count) await alertOnPost(await db.job.findUniqueOrThrow({ where: { id: jobId } }), new Date());
  redirect(`/jobs/${jobId}?opened=1`);
}

const ReportIn = z.object({
  bookingId: z.string(),
  details: z.string().trim().min(10, "Tell us what happened in a sentence or two.").max(2000),
});

/**
 * A customer reports that their tailor arranged, or asked to arrange, work outside tailor me.
 * Only the customer on a paid booking can report it, which keeps out rivals and spam. An admin decides.
 */
export async function reportOffPlatform(form: FormData) {
  const user = await requireUser();
  const parsed = ReportIn.safeParse(Object.fromEntries(form));
  const booking = await db.booking.findUnique({ where: { id: String(form.get("bookingId")) }, include: { tailor: true, job: true } });
  if (!booking || booking.customerId !== user.id || !booking.paidAt) redirect("/jobs");
  if (!parsed.success) redirect(`/jobs/${booking.jobId}?error=${encodeURIComponent(parsed.error.issues[0].message)}#report`);
  await fileReport(user.id, booking.id, booking.tailorId, parsed.data.details, `${booking.tailor.businessName} (job ${booking.job.ref})`);
  redirect(`/jobs/${booking.jobId}?reported=1`);
}

async function fileReport(customerId: string, bookingId: string, tailorId: string, details: string, label: string) {
  const open = await db.conductReport.findFirst({ where: { bookingId, status: "OPEN" } });
  if (open) await db.conductReport.update({ where: { id: open.id }, data: { details: `${open.details}\n\n${details}` } });
  else await db.conductReport.create({ data: { customerId, bookingId, tailorId, details } });
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  for (const a of admins) await notify(a, `Report: booking outside tailor me`, `${label}. Review it at /admin#reports`);
}
