import Stripe from "stripe";

/**
 * Lazy singleton — Stripe SDK isn't imported into any client bundle because
 * next.config.ts marks it as a server-external package. If the env var is
 * missing, `getStripe()` returns null so the checkout endpoints can degrade
 * gracefully (dashboard shows "coming soon" instead of crashing).
 */
let _client: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (_client !== undefined) return _client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    _client = null;
    return null;
  }
  _client = new Stripe(key, { apiVersion: "2026-06-24.dahlia" });
  return _client;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
