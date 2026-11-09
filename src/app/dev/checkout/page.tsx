import Link from "next/link";
import { notFound } from "next/navigation";
import type { ClubTier } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { paymentsMode } from "@/lib/payments";
import { FEATURED, PLANS, TIERS, money0, planJobsLabel, planPriceLabel } from "@/lib/plans";
import { simulateClubPayment, simulateExtrasPayment, simulateFeaturedPayment } from "./actions";

export const metadata = { title: "Simulated checkout" };

export default async function DevCheckout({ searchParams }: { searchParams: Promise<{ club?: string; featured?: string; extras?: string }> }) {
  if (paymentsMode() !== "simulate") notFound();
  const { club, featured, extras } = await searchParams;
  const user = await requireUser();
  const tier = TIERS.find((t) => t === club?.toUpperCase()) as ClubTier | undefined;
  const purchase = extras ? await db.extraJobsPurchase.findUnique({ where: { id: extras } }) : null;

  return (
    <div className="wrap page narrow">
      <p className="notice bad" style={{ marginBottom: 16 }}>Simulated payment for local development. No money moves. Set PAYMENTS_MODE=stripe to use real Stripe.</p>
      <div className="panel stack">
        {tier && user.tailor ? (
          <>
            <h2>tailor me Club · {PLANS[tier].name}</h2>
            <p className="num" style={{ fontSize: 32 }}>{planPriceLabel(tier)}</p>
            <p className="muted">{planJobsLabel(tier)}</p>
            <form action={simulateClubPayment}>
              <input type="hidden" name="tier" value={tier} />
              <button className="btn btn-primary" style={{ width: "100%" }}>Subscribe</button>
            </form>
          </>
        ) : featured && user.tailor ? (
          <>
            <h2>Featured add-on</h2>
            <p className="num" style={{ fontSize: 32 }}>{money0(FEATURED.priceCents)}/month</p>
            <form action={simulateFeaturedPayment}><button className="btn btn-primary" style={{ width: "100%" }}>Subscribe</button></form>
          </>
        ) : purchase && purchase.tailorId === user.tailor?.id ? (
          <>
            <h2>{purchase.jobs} extra job{purchase.jobs === 1 ? "" : "s"}</h2>
            <p className="num" style={{ fontSize: 32 }}>{money0(purchase.amountCents)}</p>
            <p className="muted">Valid until the end of this month.</p>
            <form action={simulateExtrasPayment}>
              <input type="hidden" name="purchase" value={purchase.id} />
              <button className="btn btn-primary" style={{ width: "100%" }}>Pay {money0(purchase.amountCents)}</button>
            </form>
          </>
        ) : (
          <p>Nothing to pay.</p>
        )}
        <Link className="btn btn-ghost" href="/tailor">Cancel</Link>
      </div>
    </div>
  );
}
