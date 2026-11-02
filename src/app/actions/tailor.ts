"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTailor } from "@/lib/auth";
import { isValidAbn, lookupAbn, normaliseAbn } from "@/lib/abn";
import { MAX_PORTFOLIO_PHOTOS, isCategory } from "@/lib/catalog";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { billingPortalUrl, changeClubTier, clubCheckoutUrl, paymentsMode } from "@/lib/payments";
import { canQuote, isClubMember, isPlus, isSuspended } from "@/lib/rules";
import { MAX_PHOTO_BYTES, savePhoto, sniffImage } from "@/lib/storage";
import { contactRefusal, findContactDetails } from "@/lib/contact-filter";
import { findSuburb } from "@/lib/suburbs";
import { canRecordFit, parseFit } from "@/lib/fit";

const back = (path: string, error: string): never => redirect(`${path}?error=${encodeURIComponent(error)}`);

const ProfileIn = z.object({
  businessName: z.string().trim().min(2, "Enter your business name.").max(80),
  suburb: z.string().trim(),
  bio: z.string().trim().max(800),
  yearsExperience: z.union([z.literal(""), z.coerce.number().int().min(0).max(80)]),
  languages: z.string().trim().max(200),
  openingHours: z.string().trim().max(200),
  shopAddress: z.string().trim().max(200),
  phone: z.string().trim().max(30),
  abn: z.string().trim().max(20),
  pickupFee: z.union([z.literal(""), z.coerce.number().min(0).max(200)]).optional(),
  pickupRadiusKm: z.coerce.number().int().min(1).max(30).optional(),
  pickupNote: z.string().trim().max(120).optional(),
});

export async function saveProfile(form: FormData) {
  const { user, tailor } = await requireTailor("/tailor/profile");
  const parsed = ProfileIn.safeParse(Object.fromEntries(form));
  if (!parsed.success) back("/tailor/profile", parsed.error.issues[0].message);
  const d = parsed.data!;
  // These show on the public profile, so no contact details (the shop address and phone only show after booking).
  for (const [field, label] of [["businessName", "business name"], ["bio", "intro"], ["openingHours", "opening hours"], ["pickupNote", "pickup times"]] as const) {
    const found = findContactDetails(d[field]);
    if (found) back("/tailor/profile", contactRefusal(label, found));
  }
  if (form.get("offersPickup") === "on" && (d.pickupFee === "" || d.pickupFee == null))
    back("/tailor/profile", "Set your pickup & delivery fee (0 if it’s free).");
  const suburb = findSuburb(d.suburb);
  if (!suburb) back("/tailor/profile", "Choose a Sydney suburb from the list.");
  const categories = form.getAll("categories").map(String).filter(isCategory);

  // ABN: checksum always; ABN Lookup when configured; otherwise an admin checks it.
  let abnData = {};
  const abn = d.abn ? normaliseAbn(d.abn) : null;
  if (abn !== tailor.abn) {
    if (abn && !isValidAbn(abn)) back("/tailor/profile", "That ABN doesn’t look right. Check the 11 digits.");
    const found = abn ? await lookupAbn(abn) : null;
    abnData = {
      abn,
      abnStatus: found ? (found.active ? "CHECKED" : "FAILED") : "UNCHECKED",
      abnCheckedAt: found ? new Date() : null,
      abnEntityName: found?.entityName ?? null,
    };
  }

  await db.$transaction([
    db.tailorProfile.update({
      where: { id: tailor.id },
      data: {
        businessName: d.businessName,
        suburb: suburb!,
        bio: d.bio,
        yearsExperience: d.yearsExperience === "" ? null : d.yearsExperience,
        languages: d.languages.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8),
        categories,
        comesToCustomer: form.get("comesToCustomer") === "on",
        sameDay: form.get("sameDay") === "on",
        offersPickup: form.get("offersPickup") === "on",
        pickupFeeCents: d.pickupFee === "" || d.pickupFee == null ? null : Math.round(d.pickupFee * 100),
        pickupRadiusKm: d.pickupRadiusKm ?? 8,
        pickupNote: d.pickupNote || null,
        openingHours: d.openingHours || null,
        shopAddress: d.shopAddress || null,
        ...abnData,
      },
    }),
    db.user.update({ where: { id: user.id }, data: { phone: d.phone || null } }),
  ]);
  redirect("/tailor/profile?saved=1");
}

const ServiceRow = z.object({ name: z.string().trim().max(80), note: z.string().trim().max(80), price: z.string().trim().max(12) });

export async function saveServices(form: FormData) {
  const { tailor } = await requireTailor("/tailor/profile");
  const names = form.getAll("name"), notes = form.getAll("note"), prices = form.getAll("price");
  const rows = names
    .map((_, i) => ServiceRow.parse({ name: names[i], note: notes[i] ?? "", price: prices[i] ?? "" }))
    .filter((r) => r.name);
  for (const r of rows) {
    const found = findContactDetails(`${r.name} ${r.note}`);
    if (found) back("/tailor/profile", contactRefusal("prices list", found));
  }
  const data = rows.map((r, i) => {
    const n = Number(r.price.replace(/^\$/, ""));
    const fixed = r.price !== "" && Number.isFinite(n) && n >= 0;
    return { tailorId: tailor.id, name: r.name, note: r.note || null, priceCents: fixed ? Math.round(n * 100) : null, priceText: fixed ? null : r.price || null, sortOrder: i };
  });
  await db.$transaction([db.service.deleteMany({ where: { tailorId: tailor.id } }), db.service.createMany({ data })]);
  redirect("/tailor/profile?saved=1#services");
}

const QuoteIn = z.object({
  jobId: z.string(),
  price: z.coerce.number().positive("Enter a guide price.").max(5000),
  readyBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a ready date."),
  message: z.string().trim().max(600),
  pickupFee: z.union([z.literal(""), z.coerce.number().min(0).max(200)]).optional(),
});

export async function submitQuote(form: FormData) {
  const { tailor } = await requireTailor("/tailor/jobs");
  const jobId = String(form.get("jobId"));
  const path = `/tailor/jobs/${jobId}`;
  const parsed = QuoteIn.safeParse(Object.fromEntries(form));
  if (!parsed.success) back(path, parsed.error.issues[0].message);
  const d = parsed.data!;
  const leak = findContactDetails(d.message);
  if (leak) back(path, contactRefusal("quote message", leak));
  const readyBy = new Date(`${d.readyBy}T17:00:00+10:00`);
  if (readyBy.getTime() < Date.now() - 864e5) back(path, "The ready date can’t be in the past.");

  const job = await db.job.findUnique({ where: { id: jobId }, include: { customer: { select: { email: true } } } });
  if (!job) redirect("/tailor/jobs");
  try {
    await db.$transaction(
      async (tx) => {
        const [count, mine] = await Promise.all([
          tx.quote.count({ where: { jobId, status: { in: ["PENDING", "ACCEPTED"] } } }),
          tx.quote.findUnique({ where: { jobId_tailorId: { jobId, tailorId: tailor.id } } }),
        ]);
        const verdict = canQuote(tailor, job, count, !!mine);
        if (!verdict.ok) throw new QuoteRefused(verdict.reason);
        // Pickup is only quoted when the customer asked for it and the tailor offers it.
        const pickupFeeCents =
          job.wantsPickup && tailor.offersPickup && d.pickupFee !== "" && d.pickupFee != null ? Math.round(d.pickupFee * 100) : null;
        await tx.quote.create({ data: { jobId, tailorId: tailor.id, priceCents: Math.round(d.price * 100), readyBy, message: d.message, pickupFeeCents } });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (e) {
    if (e instanceof QuoteRefused) back(path, e.message);
    if ((e as { code?: string }).code === "P2034" || (e as { code?: string }).code === "P2002") back(path, "Someone quoted at the same moment. Please try again.");
    throw e;
  }
  await notify(job.customer.email, `New quote for ${job.work} · ${job.garment}`, `${tailor.businessName} quoted $${d.price}. Compare quotes at /jobs/${job.id}`);
  redirect(`${path}?quoted=1`);
}
class QuoteRefused extends Error {}

export async function withdrawQuote(form: FormData) {
  const { tailor } = await requireTailor("/tailor/jobs");
  const jobId = String(form.get("jobId"));
  await db.quote.updateMany({ where: { jobId, tailorId: tailor.id, status: "PENDING" }, data: { status: "WITHDRAWN" } });
  revalidatePath(`/tailor/jobs/${jobId}`);
}

export async function markCompleted(form: FormData) {
  const { tailor } = await requireTailor("/tailor");
  const bookingId = String(form.get("bookingId"));
  const b = await db.booking.updateMany({ where: { id: bookingId, tailorId: tailor.id, status: "CONFIRMED" }, data: { status: "COMPLETED", completedAt: new Date() } });
  if (b.count) {
    const full = await db.booking.findUnique({ where: { id: bookingId }, include: { customer: true, job: true } });
    if (full) await notify(full.customer.email, `How did ${tailor.businessName} go?`, `Leave a review for job ${full.job.ref} at /jobs/${full.jobId}#review`);
  }
  revalidatePath(`/tailor/jobs/${String(form.get("jobId"))}`);
}

/** The tailor records the fit after the pinning. One entry per booking; they can correct their own. */
export async function recordFit(form: FormData) {
  const { tailor } = await requireTailor("/tailor");
  const jobId = String(form.get("jobId"));
  const path = `/tailor/jobs/${jobId}`;
  const booking = await db.booking.findUnique({ where: { jobId }, include: { job: { select: { garment: true } } } });
  const verdict = canRecordFit(tailor.id, booking);
  if (!verdict.ok) back(path, verdict.reason);
  const parsed = parseFit(booking!.job.garment, Object.fromEntries(form));
  if (!parsed.ok) back(path, parsed.reason);
  const { measurements, notes } = parsed as Extract<typeof parsed, { ok: true }>;
  await db.fitRecord.upsert({
    where: { bookingId: booking!.id },
    create: { bookingId: booking!.id, customerId: booking!.customerId, tailorId: tailor.id, garment: booking!.job.garment, measurements, notes },
    update: { measurements, notes },
  });
  redirect(`${path}?fit=1#fit`);
}

const tierFrom = (form: FormData) => (form.get("tier") === "PLUS" ? "PLUS" : "CLUB") as "PLUS" | "CLUB";

export async function joinClub(form: FormData) {
  const { user, tailor } = await requireTailor("/tailor");
  if (tailor.clubStatus === "ACTIVE" || isSuspended(tailor)) redirect("/tailor");
  redirect(await clubCheckoutUrl({ tailorId: tailor.id, email: user.email, stripeCustomerId: tailor.stripeCustomerId, tier: tierFrom(form) }));
}

/** Upgrade to Club Plus or move back to Club, for a tailor who's already a member. */
export async function changeTier(form: FormData) {
  const { tailor } = await requireTailor("/tailor");
  const tier = tierFrom(form);
  if (!isClubMember(tailor) || tailor.clubTier === tier) redirect("/tailor");
  if (paymentsMode() === "stripe") {
    if (!tailor.stripeSubscriptionId) redirect("/tailor");
    await changeClubTier(tailor.stripeSubscriptionId, tier);
  }
  // The webhook confirms this for Stripe; set it now so the dashboard updates straight away.
  await db.tailorProfile.update({ where: { id: tailor.id }, data: { clubTier: tier } });
  redirect(`/tailor?tier=${tier.toLowerCase()}`);
}

export async function addPortfolioPhotos(form: FormData) {
  const { tailor } = await requireTailor("/tailor/profile");
  if (!isPlus(tailor)) back("/tailor/profile", "The portfolio is part of Club Plus.");
  const existing = await db.portfolioPhoto.count({ where: { tailorId: tailor.id } });
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) back("/tailor/profile", "Choose at least one photo.");
  if (existing + files.length > MAX_PORTFOLIO_PHOTOS) back("/tailor/profile", `Up to ${MAX_PORTFOLIO_PHOTOS} portfolio photos.`);
  const caption = String(form.get("caption") ?? "").trim().slice(0, 120) || null;
  const leak = findContactDetails(caption);
  if (leak) back("/tailor/profile", contactRefusal("caption", leak));
  for (const f of files) {
    if (f.size > MAX_PHOTO_BYTES) back("/tailor/profile", "Each photo must be under 10 MB.");
    const buf = new Uint8Array(await f.arrayBuffer());
    const mime = sniffImage(buf);
    if (!mime) back("/tailor/profile", "Photos must be JPEG, PNG or WebP.");
    const storageKey = await savePhoto(buf, mime!);
    await db.portfolioPhoto.create({ data: { tailorId: tailor.id, storageKey, mime: mime!, bytes: buf.length, caption } });
  }
  redirect("/tailor/profile?saved=1#portfolio");
}

export async function removePortfolioPhoto(form: FormData) {
  const { tailor } = await requireTailor("/tailor/profile");
  await db.portfolioPhoto.deleteMany({ where: { id: String(form.get("id")), tailorId: tailor.id } });
  revalidatePath("/tailor/profile");
}

export async function manageBilling() {
  const { tailor } = await requireTailor("/tailor");
  if (paymentsMode() === "simulate" || !tailor.stripeCustomerId) redirect("/tailor");
  redirect(await billingPortalUrl(tailor.stripeCustomerId));
}
