import "server-only";
import Stripe from "stripe";
import type { ClubTier } from "@prisma/client";

// Two modes:
//  - "stripe": real Stripe Checkout + Billing. Needs STRIPE_* env vars.
//  - "simulate": local only. Checkout redirects straight to a confirm route
//    that marks things paid. Refuses to run unless APP_URL is localhost.

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

/** Returns the URL to send the customer to for the booking fee. */
export async function bookingCheckoutUrl(args: { bookingId: string; jobId: string; email: string; jobRef: string; tailorName: string; feeCents: number }) {
  if (paymentsMode() === "simulate") return { url: `/dev/checkout?booking=${args.bookingId}`, sessionId: null };
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: args.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "aud",
          unit_amount: args.feeCents,
          product_data: {
            name: "tailor me booking fee",
            description: `Job ${args.jobRef} with ${args.tailorName}. The work itself is paid to the tailor directly.`,
          },
        },
      },
    ],
    metadata: { kind: "booking", bookingId: args.bookingId },
    success_url: `${appUrl()}/jobs/${args.jobId}?booked=1`,
    cancel_url: `${appUrl()}/jobs/${args.jobId}?cancelled=1`,
  });
  return { url: session.url!, sessionId: session.id };
}

/** Stripe price for each Club tier: $10/month Club, $29/month Club Plus. */
export function priceIdFor(tier: ClubTier) {
  const id = tier === "PLUS" ? process.env.STRIPE_CLUB_PLUS_PRICE_ID : process.env.STRIPE_CLUB_PRICE_ID;
  if (!id) throw new Error(tier === "PLUS" ? "STRIPE_CLUB_PLUS_PRICE_ID is not set" : "STRIPE_CLUB_PRICE_ID is not set");
  return id;
}

export const tierForPriceId = (priceId: string | undefined): ClubTier =>
  priceId && priceId === process.env.STRIPE_CLUB_PLUS_PRICE_ID ? "PLUS" : "CLUB";

/** Returns the URL to send a tailor to for a new Club or Club Plus subscription. */
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

/** Moves an existing subscription between Club and Club Plus, prorated. */
export async function changeClubTier(subscriptionId: string, tier: ClubTier) {
  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  const item = sub.items.data[0];
  return stripe().subscriptions.update(subscriptionId, {
    items: [{ id: item.id, price: priceIdFor(tier) }],
    proration_behavior: "create_prorations",
  });
}
