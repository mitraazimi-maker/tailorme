"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { BOOKING_FEE_CENTS } from "@/lib/catalog";
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

/** Accepting a quote creates a booking and sends the customer to pay the $5 fee. */
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
  const data = { quoteId: quote.id, tailorId: quote.tailorId, customerId: user.id, feeCents: BOOKING_FEE_CENTS };
  const booking = existing
    ? await db.booking.update({ where: { id: existing.id }, data: { ...data, stripeCheckoutSessionId: null } })
    : await db.booking.create({ data: { ...data, jobId: quote.jobId } });

  const { url, sessionId } = await bookingCheckoutUrl({
    bookingId: booking.id,
    jobId: quote.jobId,
    email: user.email,
    jobRef: quote.job.ref,
    tailorName: quote.tailor.businessName,
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
