import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { findPack } from "@/lib/credits";

export const runtime = "nodejs";

/**
 * POST /api/credits/checkout { packId }
 * → { url }   Redirect the user's browser to Stripe Checkout.
 *
 * Returns 503 with a friendly message if the operator hasn't set
 * STRIPE_SECRET_KEY yet — the dashboard shows a "coming soon" hint.
 */
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { packId?: string };
  const pack = body.packId ? findPack(body.packId) : null;
  if (!pack) return NextResponse.json({ error: "unknown pack" }, { status: 400 });

  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error: "billing_disabled",
        message:
          "Billing isn't turned on yet on this instance. The operator needs to set STRIPE_SECRET_KEY.",
      },
      { status: 503 }
    );
  }

  const stripe = getStripe()!;
  const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || new URL(req.url).origin;

  const cs = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: userEmail ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: pack.priceUsd * 100,
          product_data: {
            name: `${pack.credits.toLocaleString()} credits`,
            description: pack.bonusLabel ?? "video-render-mcp credit pack",
          },
        },
      },
    ],
    // Everything we need to fulfil the purchase in the webhook. Includes the
    // credits count so we don't have to trust a lookup at fulfilment time.
    metadata: {
      userId,
      packId: pack.id,
      credits: String(pack.credits),
    },
    success_url: `${base}/dashboard?purchase=success`,
    cancel_url: `${base}/dashboard?purchase=cancelled`,
  });

  return NextResponse.json({ url: cs.url });
}
