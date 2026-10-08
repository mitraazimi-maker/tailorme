// Pure permission rules, kept free of I/O so they can be unit tested.
import type { BookingStatus, ClubStatus, JobStatus, QuoteStatus } from "@prisma/client";
import { MAX_QUOTES_PER_JOB } from "./catalog";

export type Verdict = { ok: true } | { ok: false; reason: string };
const ok: Verdict = { ok: true };
const no = (reason: string): Verdict => ({ ok: false, reason });

type TailorLike = { id: string; userId: string; clubStatus: ClubStatus };
type JobLike = { id: string; customerId: string; status: JobStatus; requestedTailorId?: string | null };

export const isClubMember = (t: { clubStatus: ClubStatus } | null | undefined) => t?.clubStatus === "ACTIVE";

export function canQuote(tailor: TailorLike, job: JobLike, quoteCount: number, alreadyQuoted: boolean): Verdict {
  if (!isClubMember(tailor)) return no("Join the tailor me Club to quote on jobs.");
  if (job.customerId === tailor.userId) return no("You can’t quote on your own job.");
  if (job.status !== "OPEN") return no("This job is no longer taking quotes.");
  if (alreadyQuoted) return no("You’ve already quoted on this job.");
  if (quoteCount >= MAX_QUOTES_PER_JOB) return no("This job already has three quotes.");
  return ok;
}

/** Tailors see open jobs only while they're Club members; the booked tailor keeps access. */
export function canTailorSeeJob(tailor: TailorLike, job: JobLike, bookedTailorId: string | null): Verdict {
  if (bookedTailorId === tailor.id) return ok;
  if (job.status !== "OPEN") return no("This job is closed.");
  if (!isClubMember(tailor)) return no("Join the tailor me Club to see job details.");
  return ok;
}

export function canAcceptQuote(userId: string, job: JobLike, quote: { jobId: string; status: QuoteStatus }): Verdict {
  if (job.customerId !== userId) return no("Only the person who posted the job can book.");
  if (quote.jobId !== job.id) return no("That quote isn’t for this job.");
  if (job.status !== "OPEN") return no("This job is already booked.");
  if (quote.status !== "PENDING") return no("That quote is no longer available.");
  return ok;
}

/** Rule 6: reviews only from customers who booked (and paid the fee) through tailor me. */
export function canReview(
  userId: string,
  booking: { customerId: string; status: BookingStatus; paidAt: Date | null },
  hasReview: boolean,
): Verdict {
  if (booking.customerId !== userId) return no("Only the customer who booked can leave a review.");
  if (!booking.paidAt || (booking.status !== "CONFIRMED" && booking.status !== "COMPLETED"))
    return no("You can review once the booking is confirmed.");
  if (hasReview) return no("You’ve already reviewed this booking. Reviews can’t be edited.");
  return ok;
}

/** Contact details are only shared once the $5 booking fee is paid. */
export const contactShared = (b: { status: BookingStatus } | null | undefined) =>
  !!b && (b.status === "CONFIRMED" || b.status === "COMPLETED");
