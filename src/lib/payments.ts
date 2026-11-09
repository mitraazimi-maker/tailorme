import "server-only";
import Stripe from "stripe";
import type { ClubTier } from "@prisma/client";

// Two modes:
//  - "stripe": real Stripe Checkout + Billing. Needs STRIPE_* env vars.
//  - "simulate": local only. Club checkout goes to a fake page that marks the
//    membership paid. Refuses to run unless APP_URL is localhost.

const isLocal = () => {
  try {
    return ["localhost", "127.0.0.1"].includes(new URL(process.env.APP_URL || "http://localhost:3000").hostname);
  } catch {
    return false;
  }
};

export const paymentsMode = (): "stripe" | "simulate" => {
  const mode = process.env.PAYMENTS_MODE === "stripe" ? "stripe" : "simulate";
  if (mode === "simulate" && !isLocal())
    throw new Error("PAYMENTS_MODE=simulate only works when APP_URL is localhost. Set PAYMENTS_MODE=stripe.");
  return mode;
};

let client: Stripe | null = null;
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return (client ??= new Stripe(key));
}

const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

// Stripe price for each Club tier: Starter $29, Pro $59, Unlimited $99 a month.
const PRICE_ENV: Record<ClubTier, string> = {
  STARTER: "STRIPE_STARTER_PRICE_ID",
  PRO: "STRIPE_PRO_PRICE_ID",
  UNLIMITED: "STRIPE_UNLIMITED_PRICE_ID",
};

export function priceIdFor(tier: ClubTier) {
  const id = process.env[PRICE_ENV[tier]];
  if (!id) throw new Error(`${PRICE_ENV[tier]} is not set`);
  return id;
}

/** The tier a Stripe price is for. An unknown price falls back to Starter (the smallest allowance). */
export const tierForPriceId = (priceId: string | undefined): ClubTier =>
  (Object.keys(PRICE_ENV) as ClubTier[]).find((t) => priceId && process.env[PRICE_ENV[t]] === priceId) ?? "STARTER";

/** Returns the URL to send a tailor to for a new Club subscription at the chosen tier. */
export async function clubCheckoutUrl(args: { tailorId: string; email: string; stripeCustomerId: string | null; tier: ClubTier }) {
  if (paymentsMode() === "simulate") return `/dev/checkout?club=${args.tier.toLowerCase()}`;
  const price = priceIdFor(args.tier);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    ...(args.stripeCustomerId ? { customer: args.stripeCustomerId } : { customer_email: args.email }),
    client_reference_id: args.tailorId,
    metadata: { kind: "club", tailorId: args.tailorId, tier: args.tier },
    subscription_data: { metadata: { tailorId: args.tailorId } },
    success_url: `${appUrl()}/tailor?club=1`,
    cancel_url: `${appUrl()}/tailor`,
  });
  return session.url!;
}

export async function billingPortalUrl(stripeCustomerId: string) {
  const s = await stripe().billingPortal.sessions.create({ customer: stripeCustomerId, return_url: `${appUrl()}/tailor` });
  return s.url;
}

/** Moves an existing subscription between tiers, prorated. */
export async function changeClubTier(subscriptionId: string, tier: ClubTier) {
  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  const item = sub.items.data[0];
  return stripe().subscriptions.update(subscriptionId, {
    items: [{ id: item.id, price: priceIdFor(tier) }],
    proration_behavior: "create_prorations",
  });
}
