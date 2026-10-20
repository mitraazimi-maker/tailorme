// Pure permission rules, kept free of I/O so they can be unit tested.
import type { BookingStatus, ClubStatus, ClubTier, JobStatus, QuoteStatus } from "@prisma/client";
import { HEAD_START_MINUTES, MAX_QUOTES_PER_JOB } from "./catalog";

export type Verdict = { ok: true } | { ok: false; reason: string };
const ok: Verdict = { ok: true };
const no = (reason: string): Verdict => ({ ok: false, reason });

type TailorLike = { id: string; userId: string; clubStatus: ClubStatus; clubTier: ClubTier };
type JobLike = { id: string; customerId: string; status: JobStatus; createdAt: Date; requestedTailorId?: string | null };

export const isClubMember = (t: { clubStatus: ClubStatus } | null | undefined) => t?.clubStatus === "ACTIVE";
export const isPlus = (t: { clubStatus: ClubStatus; clubTier: ClubTier } | null | undefined) => isClubMember(t) && t?.clubTier === "PLUS";

/** When a standard Club member can first see a job. Plus members and a tailor the customer asked for see it at once. */
export function visibleFrom(tailor: TailorLike, job: Pick<JobLike, "createdAt" | "requestedTailorId">): Date {
  if (isPlus(tailor) || job.requestedTailorId === tailor.id) return job.createdAt;
  return new Date(job.createdAt.getTime() + HEAD_START_MINUTES * 60_000);
}

const headStartMessage = (tailor: TailorLike, job: JobLike, now: Date) => {
  const mins = Math.ceil((visibleFrom(tailor, job).getTime() - now.getTime()) / 60_000);
  return mins > 0 ? `Club Plus members get first look at new jobs. This one opens to you in ${mins} min.` : null;
};

export function canQuote(tailor: TailorLike, job: JobLike, quoteCount: number, alreadyQuoted: boolean, now = new Date()): Verdict {
  if (!isClubMember(tailor)) return no("Join the tailor me Club to quote on jobs.");
  if (job.customerId === tailor.userId) return no("You can’t quote on your own job.");
  if (job.status !== "OPEN") return no("This job is no longer taking quotes.");
  const wait = headStartMessage(tailor, job, now);
  if (wait) return no(wait);
  if (alreadyQuoted) return no("You’ve already quoted on this job.");
  if (quoteCount >= MAX_QUOTES_PER_JOB) return no("This job already has three quotes.");
  return ok;
}

/** Tailors see open jobs only while they're Club members; the booked tailor keeps access. */
export function canTailorSeeJob(tailor: TailorLike, job: JobLike, bookedTailorId: string | null, now = new Date()): Verdict {
  if (bookedTailorId === tailor.id) return ok;
  if (job.status !== "OPEN") return no("This job is closed.");
  if (!isClubMember(tailor)) return no("Join the tailor me Club to see job details.");
  const wait = headStartMessage(tailor, job, now);
  if (wait) return no(wait);
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

/** Contact details are only shared once the booking fee is paid. */
export const contactShared = (b: { status: BookingStatus } | null | undefined) =>
  !!b && (b.status === "CONFIRMED" || b.status === "COMPLETED");
