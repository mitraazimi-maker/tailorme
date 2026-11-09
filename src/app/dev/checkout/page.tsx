import Link from "next/link";
import { notFound } from "next/navigation";
import type { ClubTier } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { paymentsMode } from "@/lib/payments";
import { PLANS, TIERS, planJobsLabel, planPriceLabel } from "@/lib/plans";
import { simulateClubPayment } from "./actions";

export const metadata = { title: "Simulated checkout" };

export default async function DevCheckout({ searchParams }: { searchParams: Promise<{ club?: string }> }) {
  if (paymentsMode() !== "simulate") notFound();
  const { club } = await searchParams;
  const user = await requireUser();
  const tier = TIERS.find((t) => t === club?.toUpperCase()) as ClubTier | undefined;

  return (
    <div className="wrap page narrow">
      <p className="notice bad" style={{ marginBottom: 16 }}>Simulated payment for local development. No money moves. Set PAYMENTS_MODE=stripe to use real Stripe Billing.</p>
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
            <Link className="btn btn-ghost" href="/tailor">Cancel</Link>
          </>
        ) : (
          <p>Nothing to pay.</p>
        )}
      </div>
    </div>
  );
}
