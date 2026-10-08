import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser, hashPassword, roleForNewUser, startSession } from "@/lib/auth";
import { FITTING, GARMENTS, MAX_PHOTOS, TIMING, WORK, categoryFor } from "@/lib/catalog";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { MAX_PHOTO_BYTES, savePhoto, sniffImage } from "@/lib/storage";
import { distanceKm, findSuburb } from "@/lib/suburbs";

const oneOf = (opts: [string, string][]) => z.string().refine((v) => opts.some(([o]) => o === v), "Pick one of the options.");

const JobIn = z.object({
  garment: oneOf(GARMENTS),
  work: oneOf(WORK),
  description: z.string().trim().min(10, "Describe the job in a sentence or two (fabric and measurement help).").max(2000),
  fitting: oneOf(FITTING).optional().or(z.literal("")),
  timing: oneOf(TIMING),
  suburb: z.string().trim().min(1, "Enter your suburb."),
  ack: z.literal("on", { errorMap: () => ({ message: "Tick the box to confirm you understand how quotes and bookings work." }) }),
  tailor: z.string().optional(),
});

const NewCustomer = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters for your password.").max(200),
});

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** Radius within which tailors are told about a new job. */
const NOTIFY_KM = 15;

export async function POST(req: Request) {
  const form = await req.formData();
  const fields = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = JobIn.safeParse(fields);
  if (!parsed.success) return bad(parsed.error.issues[0].message);
  const d = parsed.data;
  const suburb = findSuburb(d.suburb);
  if (!suburb) return bad("Choose a Sydney suburb from the list.");

  // Rule 1: at least one photo, and we check they really are images.
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return bad("Add at least one photo of the garment. Tailors can’t quote without one.");
  if (files.length > MAX_PHOTOS) return bad(`Up to ${MAX_PHOTOS} photos per job.`);
  const photos: { buf: Uint8Array; mime: string }[] = [];
  for (const f of files) {
    if (f.size > MAX_PHOTO_BYTES) return bad("Each photo must be under 10 MB.");
    const buf = new Uint8Array(await f.arrayBuffer());
    const mime = sniffImage(buf);
    if (!mime) return bad("Photos must be JPEG, PNG or WebP. On iPhone, choose “Most Compatible” in Camera settings.");
    photos.push({ buf, mime });
  }

  let user = await getUser();
  if (!user) {
    const nc = NewCustomer.safeParse(fields);
    if (!nc.success) return bad(nc.error.issues[0].message);
    if (await db.user.findUnique({ where: { email: nc.data.email } }))
      return bad("There’s already an account with that email. Log in first, and your job will be kept.", 409);
    const created = await db.user.create({
      data: {
        firstName: nc.data.firstName,
        email: nc.data.email,
        passwordHash: await hashPassword(nc.data.password),
        suburb,
        role: roleForNewUser(nc.data.email, "CUSTOMER"),
      },
      include: { tailor: true },
    });
    await startSession(created.id);
    user = created;
  } else if (!user.suburb) {
    await db.user.update({ where: { id: user.id }, data: { suburb } });
  }

  const requested = d.tailor ? await db.tailorProfile.findUnique({ where: { slug: d.tailor }, select: { id: true } }) : null;
  const keys = await Promise.all(photos.map((p) => savePhoto(p.buf, p.mime)));

  let job;
  for (let attempt = 0; ; attempt++) {
    try {
      job = await db.job.create({
        data: {
          ref: `TM-${randomInt(10000, 99999)}`,
          customerId: user.id,
          garment: d.garment,
          work: d.work,
          category: categoryFor(d.garment, d.work),
          description: d.description,
          fitting: d.fitting || null,
          timing: d.timing,
          suburb,
          acknowledgedAt: new Date(),
          requestedTailorId: requested?.id ?? null,
          photos: { create: keys.map((storageKey, i) => ({ storageKey, mime: photos[i].mime, bytes: photos[i].buf.length })) },
        },
      });
      break;
    } catch (e) {
      // Retry on a ref collision only.
      if (attempt < 5 && (e as { code?: string }).code === "P2002") continue;
      throw e;
    }
  }

  const tailors = await db.tailorProfile.findMany({
    where: { clubStatus: "ACTIVE", OR: [{ categories: { has: job.category } }, { id: requested?.id ?? "" }] },
    include: { user: { select: { email: true } } },
  });
  for (const t of tailors) {
    const km = distanceKm(t.suburb, suburb);
    if (t.id === requested?.id || km == null || km <= NOTIFY_KM)
      await notify(t.user.email, `New job near you: ${job.work} · ${job.garment}`, `${job.suburb}. See it and quote at /tailor/jobs/${job.id}`);
  }

  return NextResponse.json({ id: job.id, ref: job.ref });
}
