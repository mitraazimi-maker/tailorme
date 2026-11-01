"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SUSPENSION_MONTHS } from "@/lib/catalog";
import { notify } from "@/lib/notify";
import { paymentsMode, stripe } from "@/lib/payments";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

/** Records the result of checking a tailor's ABN on ABN Lookup by hand. */
export async function setAbnStatus(form: FormData) {
  await requireAdmin();
  const status = String(form.get("status"));
  if (status !== "CHECKED" && status !== "FAILED" && status !== "UNCHECKED") return;
  await db.tailorProfile.update({
    where: { id: String(form.get("tailorId")) },
    data: { abnStatus: status, abnCheckedAt: status === "UNCHECKED" ? null : new Date() },
  });
  revalidatePath("/admin");
}

const addMonths = (d: Date, n: number) => {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
};

/**
 * Decide a report of arranging work outside tailor me: dismiss, warn, or suspend
 * for six months. The tailor is told the outcome and the reason (not who reported it).
 */
export async function resolveReport(form: FormData) {
  await requireAdmin();
  const decision = String(form.get("decision"));
  const note = String(form.get("note") ?? "").trim().slice(0, 1000);
  if (decision !== "DISMISSED" && decision !== "WARNED" && decision !== "SUSPENDED") return;
  if (decision !== "DISMISSED" && note.length < 10) redirect("/admin?error=" + encodeURIComponent("Write the reason the tailor will see (at least a sentence).") + "#reports");

  const report = await db.conductReport.findUnique({ where: { id: String(form.get("reportId")) }, include: { tailor: { include: { user: true } } } });
  if (!report || report.status !== "OPEN") redirect("/admin#reports");
  const { tailor } = report;

  await db.conductReport.update({ where: { id: report.id }, data: { status: decision, adminNote: note || null, resolvedAt: new Date() } });

  if (decision === "WARNED") {
    await notify(tailor.user.email, "A warning about booking outside tailor me", `${note}\n\nCustomers introduced through tailor me should rebook you through tailor me. A further upheld report means a ${SUSPENSION_MONTHS}-month suspension from the Club.`);
  }
  if (decision === "SUSPENDED") {
    const until = addMonths(new Date(), SUSPENSION_MONTHS);
    await db.$transaction([
      db.tailorProfile.update({ where: { id: tailor.id }, data: { suspendedUntil: until, suspensionReason: note } }),
      // Customers can't book them while suspended.
      db.quote.updateMany({ where: { tailorId: tailor.id, status: "PENDING" }, data: { status: "WITHDRAWN" } }),
    ]);
    // Stop billing. The webhook then marks the membership cancelled.
    if (paymentsMode() === "stripe" && tailor.stripeSubscriptionId) await stripe().subscriptions.cancel(tailor.stripeSubscriptionId);
    await notify(tailor.user.email, `Your tailor me Club membership is suspended until ${until.toLocaleDateString("en-AU")}`, `${note}\n\nYou won't appear in search or receive jobs until then, and your Club billing has stopped. Bookings you already have still stand.`);
  }
  revalidatePath("/admin");
}

export async function liftSuspension(form: FormData) {
  await requireAdmin();
  await db.tailorProfile.update({ where: { id: String(form.get("tailorId")) }, data: { suspendedUntil: null, suspensionReason: null } });
  revalidatePath("/admin");
}
