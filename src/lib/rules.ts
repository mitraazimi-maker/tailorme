// Pure permission rules, kept free of I/O so they can be unit tested.
import type { BookingStatus, ClubStatus, JobStatus, QuoteStatus } from "@prisma/client";
import { HEAD_START_MINUTES, MAX_QUOTES_PER_JOB } from "./catalog";
import { type Credits, hasCredit, resetLabel } from "./plans";

export type Verdict = { ok: true } | { ok: false; reason: string };
const ok: Verdict = { ok: true };
const no = (reason: string): Verdict => ({ ok: false, reason });

type TailorLike = { id: string; userId: string; clubStatus: ClubStatus; featuredStatus?: ClubStatus; suspendedUntil?: Date | null };
type MemberLike = { clubStatus: ClubStatus; suspendedUntil?: Date | null };
type JobLike = {
  id: string;
  customerId: string;
  status: JobStatus;
  createdAt: Date;
  requestedTailorId?: string | null;
  openToAllAt?: Date | null;
  exclusive?: boolean;
};

export const isSuspended = (t: { suspendedUntil?: Date | null } | null | undefined, now = new Date()) =>
  !!t?.suspendedUntil && t.suspendedUntil > now;
/** A paying member who isn't suspended. Everything Club-only checks this. */
export const isClubMember = (t: MemberLike | null | undefined, now = new Date()) => t?.clubStatus === "ACTIVE" && !isSuspended(t, now);
/** The Featured add-on (on any plan): featured placement, the head start and a portfolio. Needs a live Club membership too. */
export const isFeatured = (t: (MemberLike & { featuredStatus?: ClubStatus }) | null | undefined) => isClubMember(t) && t?.featuredStatus === "ACTIVE";

/** Prisma filter matching isClubMember, for queries. */
export const activeMemberWhere = (now = new Date()) => ({
  clubStatus: "ACTIVE" as const,
  OR: [{ suspendedUntil: null }, { suspendedUntil: { lte: now } }],
});

/** End of the Featured head start for a job when one or more Featured tailors match it. */
export const headStartEnds = (createdAt: Date) => new Date(createdAt.getTime() + HEAD_START_MINUTES * 60_000);

/**
 * When a tailor can first see a job. Featured tailors and a tailor the customer asked for see it at once;
 * everyone else sees it at openToAllAt (straight away when no Featured tailor matched).
 */
export function visibleFrom(tailor: TailorLike, job: Pick<JobLike, "createdAt" | "requestedTailorId" | "openToAllAt">): Date {
  if (isFeatured(tailor) || job.requestedTailorId === tailor.id) return job.createdAt;
  return job.openToAllAt ?? headStartEnds(job.createdAt);
}

/** A rebook stays with the customer's own tailor until the customer opens it to others. */
const exclusiveTo = (tailor: TailorLike, job: JobLike) => !!job.exclusive && job.requestedTailorId !== tailor.id;

const headStartMessage = (tailor: TailorLike, job: JobLike, now: Date) => {
  const mins = Math.ceil((visibleFrom(tailor, job).getTime() - now.getTime()) / 60_000);
  return mins > 0 ? `Featured tailors get first look at new jobs. This one opens to you in ${mins} min.` : null;
};

/**
 * `credits` = the tailor's jobs left this month (null when not loaded, e.g. in a feed).
 * A rebook sent to this tailor never needs one: rebooks are free.
 */
export function canQuote(tailor: TailorLike, job: JobLike, quoteCount: number, alreadyQuoted: boolean, credits: Credits | null = null, now = new Date()): Verdict {
  if (isSuspended(tailor, now)) return no("Your Club membership is suspended.");
  if (!isClubMember(tailor)) return no("Join the tailor me Club to quote on jobs.");
  if (job.customerId === tailor.userId) return no("You can’t quote on your own job.");
  if (job.status !== "OPEN") return no("This job is no longer taking quotes.");
  if (exclusiveTo(tailor, job)) return no("The customer sent this job to their own tailor.");
  const wait = headStartMessage(tailor, job, now);
  if (wait) return no(wait);
  if (alreadyQuoted) return no("You’ve already quoted on this job.");
  if (quoteCount >= MAX_QUOTES_PER_JOB) return no("This job already has three quotes.");
  const isTheirRebook = !!job.exclusive && job.requestedTailorId === tailor.id;
  if (credits && !hasCredit(credits) && !isTheirRebook)
    return no(`You’ve used this month’s jobs. Buy extra jobs or upgrade your plan to keep quoting now, or they reset on ${resetLabel(now)}. Rebooks from your own customers are always free.`);
  return ok;
}

/** Tailors see open jobs only while they're Club members; the booked tailor keeps access. */
export function canTailorSeeJob(tailor: TailorLike, job: JobLike, bookedTailorId: string | null, now = new Date()): Verdict {
  if (bookedTailorId === tailor.id) return ok;
  if (job.status !== "OPEN") return no("This job is closed.");
  if (!isClubMember(tailor)) return no("Join the tailor me Club to see job details.");
  if (exclusiveTo(tailor, job)) return no("The customer sent this job to their own tailor.");
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

/** Rule 6: reviews only from customers who booked through tailor me. */
export function canReview(userId: string, booking: { customerId: string; status: BookingStatus }, hasReview: boolean): Verdict {
  if (booking.customerId !== userId) return no("Only the customer who booked can leave a review.");
  if (booking.status !== "CONFIRMED" && booking.status !== "COMPLETED") return no("You can review once the booking is confirmed.");
  if (hasReview) return no("You’ve already reviewed this booking. Reviews can’t be edited.");
  return ok;
}

/** Contact details are only shared once the customer has booked (a live booking). */
export const contactShared = (b: { status: BookingStatus } | null | undefined) =>
  !!b && (b.status === "CONFIRMED" || b.status === "COMPLETED");
