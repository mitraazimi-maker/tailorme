import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/fabric";
import { paymentsMode } from "@/lib/payments";
import { simulateBookingPayment, simulateClubPayment } from "./actions";

export const metadata = { title: "Simulated checkout" };

export default async function DevCheckout({ searchParams }: { searchParams: Promise<{ booking?: string; club?: string }> }) {
  if (paymentsMode() !== "simulate") notFound();
  const { booking: bookingId, club } = await searchParams;
  const user = await requireUser();
  const booking = bookingId ? await db.booking.findUnique({ where: { id: bookingId }, include: { job: true, tailor: true } }) : null;
  if (bookingId && (!booking || booking.customerId !== user.id)) notFound();

  return (
    <div className="wrap page narrow">
      <p className="notice bad" style={{ marginBottom: 16 }}>Simulated payment for local development. No money moves. Set PAYMENTS_MODE=stripe to use real Stripe Checkout.</p>
      <div className="panel stack">
        {booking ? (
          <>
            <h2>tailor me booking fee</h2>
            <p className="muted">Job {booking.job.ref} with {booking.tailor.businessName}</p>
            <p className="num" style={{ fontSize: 32 }}>{money(booking.feeCents)}</p>
            <form action={simulateBookingPayment}>
              <input type="hidden" name="booking" value={booking.id} />
              <button className="btn btn-primary" style={{ width: "100%" }}>Pay {money(booking.feeCents)}</button>
            </form>
            <Link className="btn btn-ghost" href={`/jobs/${booking.jobId}?cancelled=1`}>Cancel</Link>
          </>
        ) : club && user.tailor ? (
          <>
            <h2>tailor me Club</h2>
            <p className="num" style={{ fontSize: 32 }}>$10 / month</p>
            <form action={simulateClubPayment}><button className="btn btn-primary" style={{ width: "100%" }}>Subscribe</button></form>
            <Link className="btn btn-ghost" href="/tailor">Cancel</Link>
          </>
        ) : (
          <p>Nothing to pay.</p>
        )}
      </div>
    </div>
  );
}
