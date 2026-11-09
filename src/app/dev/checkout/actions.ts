"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { paymentsMode } from "@/lib/payments";
import { TIERS } from "@/lib/plans";
import { confirmExtraJobs } from "@/lib/bookings";
import type { ClubTier } from "@prisma/client";

// Local stand-in for Stripe Billing. paymentsMode() throws unless APP_URL is localhost.

export async function simulateClubPayment(form: FormData) {
  if (paymentsMode() !== "simulate") redirect("/");
  const user = await requireUser();
  if (!user.tailor) redirect("/");
  const asked = String(form.get("tier")).toUpperCase() as ClubTier;
  const clubTier = TIERS.includes(asked) ? asked : "STARTER";
  await db.tailorProfile.update({
    where: { id: user.tailor.id },
    data: { clubStatus: "ACTIVE", clubTier, clubRenewsAt: new Date(Date.now() + 30 * 864e5), clubSince: user.tailor.clubSince ?? new Date() },
  });
  redirect("/tailor?club=1");
}

export async function simulateFeaturedPayment() {
  if (paymentsMode() !== "simulate") redirect("/");
  const user = await requireUser();
  if (!user.tailor) redirect("/");
  await db.tailorProfile.update({ where: { id: user.tailor.id }, data: { featuredStatus: "ACTIVE", featuredRenewsAt: new Date(Date.now() + 30 * 864e5) } });
  redirect("/tailor?featured=1");
}

export async function simulateExtrasPayment(form: FormData) {
  if (paymentsMode() !== "simulate") redirect("/");
  const user = await requireUser();
  const purchase = await db.extraJobsPurchase.findUnique({ where: { id: String(form.get("purchase")) } });
  if (!purchase || purchase.tailorId !== user.tailor?.id) redirect("/tailor");
  await confirmExtraJobs(purchase.id);
  redirect("/tailor?extras=1");
}
