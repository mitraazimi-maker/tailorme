import type Stripe from "stripe";
import { clubStatusFromStripe, confirmExtraJobs } from "@/lib/bookings";
import { db } from "@/lib/db";
import { stripe, tierForPriceId } from "@/lib/payments";

// Stripe webhook: Club plans, the Featured add-on and extra jobs (booking is free). Configure the endpoint for:
//   checkout.session.completed, customer.subscription.created,
//   customer.subscription.updated, customer.subscription.deleted
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook secret not configured", { status: 500 });
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return new Response("Bad signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      if (s.metadata?.kind === "extras" && s.payment_status === "paid") await confirmExtraJobs(s.metadata.purchaseId);
      if ((s.metadata?.kind === "club" || s.metadata?.kind === "featured") && typeof s.subscription === "string") {
        const sub = await stripe().subscriptions.retrieve(s.subscription);
        await syncSubscription(sub, s.metadata.tailorId);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object, event.data.object.metadata?.tailorId);
      break;
  }
  return new Response("ok");
}

async function syncSubscription(sub: Stripe.Subscription, tailorId: string | undefined) {
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const where = tailorId ? { id: tailorId } : { stripeCustomerId: customer };
  const item = sub.items.data[0];
  const periodEnd = item?.current_period_end;
  // The Featured add-on is its own subscription; it never changes the plan.
  if (sub.metadata?.addon === "featured") {
    await db.tailorProfile.updateMany({
      where,
      data: { featuredStatus: clubStatusFromStripe(sub.status), featuredSubscriptionId: sub.id, featuredRenewsAt: periodEnd ? new Date(periodEnd * 1000) : null, stripeCustomerId: customer },
    });
    return;
  }
  await db.tailorProfile.updateMany({
    where,
    data: {
      clubStatus: clubStatusFromStripe(sub.status),
      clubTier: tierForPriceId(item?.price.id),
      stripeCustomerId: customer,
      stripeSubscriptionId: sub.id,
      clubRenewsAt: periodEnd ? new Date(periodEnd * 1000) : null,
      // A pilot tailor's free period is a Stripe trial.
      ...(sub.trial_end ? { freeUntil: new Date(sub.trial_end * 1000) } : {}),
    },
  });
  // First time active: start the clock for rolling over unused jobs.
  if (clubStatusFromStripe(sub.status) === "ACTIVE") await db.tailorProfile.updateMany({ where: { ...where, clubSince: null }, data: { clubSince: new Date() } });
}
