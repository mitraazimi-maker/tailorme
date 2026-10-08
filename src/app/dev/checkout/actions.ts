"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { confirmBooking } from "@/lib/bookings";
import { db } from "@/lib/db";
import { paymentsMode } from "@/lib/payments";

// Local stand-ins for Stripe Checkout. paymentsMode() throws unless APP_URL is localhost.

export async function simulateBookingPayment(form: FormData) {
  if (paymentsMode() !== "simulate") redirect("/");
  const user = await requireUser();
  const booking = await db.booking.findUnique({ where: { id: String(form.get("booking")) } });
  if (!booking || booking.customerId !== user.id) redirect("/jobs");
  await confirmBooking(booking.id);
  redirect(`/jobs/${booking.jobId}?booked=1`);
}

export async function simulateClubPayment() {
  if (paymentsMode() !== "simulate") redirect("/");
  const user = await requireUser();
  if (!user.tailor) redirect("/");
  await db.tailorProfile.update({
    where: { id: user.tailor.id },
    data: { clubStatus: "ACTIVE", clubRenewsAt: new Date(Date.now() + 30 * 864e5) },
  });
  redirect("/tailor?club=1");
}
