import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { grant } from "@/lib/credits";

export const runtime = "nodejs";

/**
 * POST /api/stripe/webhook
 *
 * Stripe → us on every event we subscribe to. In production we care about
 * `checkout.session.completed` — that's when the customer has paid and we
 * grant the credits from the session metadata.
 *
 * Signature verification is REQUIRED — anyone can POST here otherwise and
 * mint themselves free credits.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "billing_disabled" }, { status: 503 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `bad signature: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const credits = Number(session.metadata?.credits);
    const packId = session.metadata?.packId;
    if (!userId || !credits) {
      // Log + acknowledge — do NOT 500, or Stripe will retry forever.
      console.error("[stripe] checkout.completed missing metadata", session.id);
      return NextResponse.json({ received: true });
    }
    await grant(userId, credits, "purchase", {
      stripeSessionId: session.id,
      packId,
      priceUsd: (session.amount_total ?? 0) / 100,
    });
  }

  return NextResponse.json({ received: true });
}
