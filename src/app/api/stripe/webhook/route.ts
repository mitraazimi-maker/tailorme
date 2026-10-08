import type Stripe from "stripe";
import { clubStatusFromStripe, confirmBooking } from "@/lib/bookings";
import { db } from "@/lib/db";
import { stripe } from "@/lib/payments";

// Stripe webhook. Configure the endpoint for:
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
      if (s.metadata?.kind === "booking" && s.payment_status === "paid") await confirmBooking(s.metadata.bookingId);
      if (s.metadata?.kind === "club" && typeof s.subscription === "string") {
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
  const periodEnd = sub.items.data[0]?.current_period_end;
  await db.tailorProfile.updateMany({
    where,
    data: {
      clubStatus: clubStatusFromStripe(sub.status),
      stripeCustomerId: customer,
      stripeSubscriptionId: sub.id,
      clubRenewsAt: periodEnd ? new Date(periodEnd * 1000) : null,
    },
  });
}
