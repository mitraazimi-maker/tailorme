"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { paymentsMode } from "@/lib/payments";
import { TIERS } from "@/lib/plans";
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
