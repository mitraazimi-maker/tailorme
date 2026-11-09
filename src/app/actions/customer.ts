"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { alertOnPost } from "@/lib/alerts";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { bookQuote, bookedTailorIds } from "@/lib/bookings";
import { db } from "@/lib/db";
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

/** Accepting a quote books the tailor. Free for the customer; contact details are shared straight away. */
export async function acceptQuote(form: FormData) {
  const quoteId = String(form.get("quoteId"));
  const quote = await db.quote.findUnique({ where: { id: quoteId }, include: { job: true } });
  if (!quote) redirect("/jobs");
  const user = await requireUser(`/jobs/${quote.jobId}`);
  const verdict = canAcceptQuote(user.id, quote.job, quote);
  if (!verdict.ok) redirect(`/jobs/${quote.jobId}?error=${encodeURIComponent(verdict.reason)}`);
  // A rebook (a tailor they've booked before) doesn't use one of the tailor's monthly jobs.
  const isRepeat = (await bookedTailorIds(user.id, quote.jobId)).has(quote.tailorId);
  await bookQuote({ quoteId: quote.id, jobId: quote.jobId, customerId: user.id, tailorId: quote.tailorId, isRepeat });
  redirect(`/jobs/${quote.jobId}?booked=1`);
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

/** Customers can remove any entry from their fit record (but never edit what a tailor wrote). */
export async function deleteFitEntry(form: FormData) {
  const user = await requireUser("/jobs/profile");
  await db.fitRecord.deleteMany({ where: { id: String(form.get("id")), customerId: user.id } });
  redirect("/jobs/profile?removed=1#fit-record");
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
 * Only the customer who booked can report it, which keeps out rivals and spam. An admin decides.
 */
export async function reportOffPlatform(form: FormData) {
  const user = await requireUser();
  const parsed = ReportIn.safeParse(Object.fromEntries(form));
  const booking = await db.booking.findUnique({ where: { id: String(form.get("bookingId")) }, include: { tailor: true, job: true } });
  if (!booking || booking.customerId !== user.id || booking.status === "CANCELLED") redirect("/jobs");
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
