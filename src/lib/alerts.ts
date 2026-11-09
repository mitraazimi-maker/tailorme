import "server-only";
import type { Job } from "@prisma/client";
import { HEAD_START_MINUTES } from "./catalog";
import { db } from "./db";
import { notify } from "./notify";
import { activeMemberWhere, headStartEnds, isFeatured } from "./rules";
import { distanceKm } from "./suburbs";

/** Radius within which tailors are told about a new job. */
const ALERT_KM = 15;

async function matchingTailors(job: Job) {
  const tailors = await db.tailorProfile.findMany({
    where: { AND: [activeMemberWhere(), { OR: [{ categories: { has: job.category } }, { id: job.requestedTailorId ?? "" }] }] },
    include: { user: { select: { email: true } } },
  });
  return tailors.filter((t) => {
    if (t.userId === job.customerId) return false;
    if (t.id === job.requestedTailorId) return true;
    if (job.exclusive) return false;
    const km = distanceKm(t.suburb, job.suburb);
    return km == null || km <= ALERT_KM;
  });
}

const send = (email: string, job: Job) =>
  notify(email, `New job near you: ${job.work} · ${job.garment}`, `${job.suburb}. See it and quote at /tailor/jobs/${job.id}`);

/**
 * On posting. Featured tailors and any tailor the customer asked for hear straight away.
 * If no Featured tailor matches, there's no head start: everyone is told now.
 * `from` is when the job became open to everyone (later than posting for a rebook that was opened up).
 */
export async function alertOnPost(job: Job, from: Date = job.createdAt) {
  const tailors = await matchingTailors(job);
  const anyFeatured = tailors.some((t) => isFeatured(t) && t.id !== job.requestedTailorId);
  const now = new Date();
  await db.job.update({
    where: { id: job.id },
    data: anyFeatured ? { openToAllAt: headStartEnds(from) } : { openToAllAt: from, clubNotifiedAt: now },
  });
  for (const t of tailors) if (!anyFeatured || isFeatured(t) || t.id === job.requestedTailorId) await send(t.user.email, job);
}

/** Run every few minutes: alerts standard Club members once a job's head start is over. */
export async function alertAfterHeadStart(now = new Date()) {
  const due = await db.job.findMany({
    where: {
      status: "OPEN",
      exclusive: false,
      clubNotifiedAt: null,
      OR: [{ openToAllAt: { lte: now } }, { openToAllAt: null, createdAt: { lte: new Date(now.getTime() - HEAD_START_MINUTES * 60_000) } }],
    },
    take: 200,
  });
  for (const job of due) {
    // Claim the job first so overlapping runs don't email twice.
    const claimed = await db.job.updateMany({ where: { id: job.id, clubNotifiedAt: null }, data: { clubNotifiedAt: now } });
    if (!claimed.count) continue;
    for (const t of await matchingTailors(job)) if (!isFeatured(t) && t.id !== job.requestedTailorId) await send(t.user.email, job);
  }
  return due.length;
}
