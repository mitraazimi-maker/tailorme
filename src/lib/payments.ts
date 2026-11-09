import "server-only";
import Stripe from "stripe";
import type { ClubTier } from "@prisma/client";
import { EXTRA_JOB_CENTS } from "./plans";

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

// Stripe price for each Club tier: Starter $39, Pro $79, Busy $169, Studio $309 a month.
const PRICE_ENV: Record<ClubTier, string> = {
  STARTER: "STRIPE_STARTER_PRICE_ID",
  PRO: "STRIPE_PRO_PRICE_ID",
  BUSY: "STRIPE_BUSY_PRICE_ID",
  STUDIO: "STRIPE_STUDIO_PRICE_ID",
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
export async function clubCheckoutUrl(args: { tailorId: string; email: string; stripeCustomerId: string | null; tier: ClubTier; trialDays?: number }) {
  if (paymentsMode() === "simulate") return `/dev/checkout?club=${args.tier.toLowerCase()}`;
  const price = priceIdFor(args.tier);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    ...(args.stripeCustomerId ? { customer: args.stripeCustomerId } : { customer_email: args.email }),
    client_reference_id: args.tailorId,
    metadata: { kind: "club", tailorId: args.tailorId, tier: args.tier },
    subscription_data: { metadata: { tailorId: args.tailorId }, ...(args.trialDays ? { trial_period_days: args.trialDays } : {}) },
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

/** The Featured add-on: its own $99/month subscription (STRIPE_FEATURED_PRICE_ID), on top of any plan. */
export async function featuredCheckoutUrl(args: { tailorId: string; email: string; stripeCustomerId: string | null }) {
  if (paymentsMode() === "simulate") return "/dev/checkout?featured=1";
  const price = process.env.STRIPE_FEATURED_PRICE_ID;
  if (!price) throw new Error("STRIPE_FEATURED_PRICE_ID is not set");
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    ...(args.stripeCustomerId ? { customer: args.stripeCustomerId } : { customer_email: args.email }),
    client_reference_id: args.tailorId,
    metadata: { kind: "featured", tailorId: args.tailorId },
    subscription_data: { metadata: { tailorId: args.tailorId, addon: "featured" } },
    success_url: `${appUrl()}/tailor?featured=1`,
    cancel_url: `${appUrl()}/tailor`,
  });
  return session.url!;
}

/** Stops Featured at the end of the period already paid for. */
export async function cancelFeatured(subscriptionId: string) {
  return stripe().subscriptions.update(subscriptionId, { cancel_at_period_end: true });
}

/** One-off payment for extra jobs this month ($9 each). Confirmed by the webhook. */
export async function extraJobsCheckoutUrl(args: { purchaseId: string; email: string; stripeCustomerId: string | null; jobs: number }) {
  if (paymentsMode() === "simulate") return { url: `/dev/checkout?extras=${args.purchaseId}`, sessionId: null };
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    ...(args.stripeCustomerId ? { customer: args.stripeCustomerId } : { customer_email: args.email }),
    line_items: [
      {
        quantity: args.jobs,
        price_data: { currency: "aud", unit_amount: EXTRA_JOB_CENTS, product_data: { name: "tailor me extra job", description: "Valid until the end of this month." } },
      },
    ],
    metadata: { kind: "extras", purchaseId: args.purchaseId },
    success_url: `${appUrl()}/tailor?extras=1`,
    cancel_url: `${appUrl()}/tailor`,
  });
  return { url: session.url!, sessionId: session.id };
}

/** Makes an existing Club subscription free until `until` (a pilot tailor who joined before being picked). */
export async function freeUntilOnSubscription(subscriptionId: string, until: Date) {
  return stripe().subscriptions.update(subscriptionId, { trial_end: Math.floor(until.getTime() / 1000), proration_behavior: "none" });
}
