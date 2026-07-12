import { prisma } from "./db";
import type { ScenePlan } from "./scene-plan";

/**
 * Credit economics — one place to change if the pricing changes.
 *
 * Standard voice (free msedge-tts): 1 credit per 3 seconds of output.
 * Premium voice (ElevenLabs): 3× multiplier (covers our per-call cost).
 * Word-timed captions: +25% surcharge on premium (they cost real API budget).
 */
const CREDITS_PER_3_SEC_STANDARD = 1;
const PREMIUM_MULTIPLIER = 3;
const CAPTIONS_SURCHARGE_MULT = 1.25;

export interface QuoteBreakdown {
  totalCredits: number;
  standardCost: number;
  premiumSurcharge: number;
  captionsSurcharge: number;
  isPremium: boolean;
}

/**
 * Predict how many credits a render will cost. Called before starting the
 * render so we can reject early with a helpful error instead of burning
 * ElevenLabs API calls the user can't pay for.
 */
export function quoteCredits(plan: ScenePlan, actualDurationSec?: number): QuoteBreakdown {
  const durationSec = actualDurationSec ?? plan.targetDurationSec;
  const isPremium = plan.voice.startsWith("premium-");
  const standardCost = Math.ceil((durationSec / 3) * CREDITS_PER_3_SEC_STANDARD);
  const withPremium = isPremium ? standardCost * PREMIUM_MULTIPLIER : standardCost;
  const wantsCaptions = isPremium && plan.captions !== false;
  const withCaptions = wantsCaptions
    ? Math.ceil(withPremium * CAPTIONS_SURCHARGE_MULT)
    : withPremium;
  return {
    totalCredits: withCaptions,
    standardCost,
    premiumSurcharge: withPremium - standardCost,
    captionsSurcharge: withCaptions - withPremium,
    isPremium,
  };
}

/**
 * Atomically check + deduct. Returns the new balance on success, or null if
 * the user doesn't have enough credits. Race-safe because the where-clause
 * on `creditBalance` makes the UPDATE a compare-and-swap.
 */
export async function tryDeduct(
  userId: string,
  cost: number,
  reason: string,
  jobId?: string
): Promise<number | null> {
  if (cost <= 0) {
    // No charge — still log for auditability.
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true },
    });
    return u?.creditBalance ?? 0;
  }
  const result = await prisma.$transaction(async (tx) => {
    const upd = await tx.user.updateMany({
      where: { id: userId, creditBalance: { gte: cost } },
      data: { creditBalance: { decrement: cost } },
    });
    if (upd.count === 0) return null;
    await tx.creditTransaction.create({
      data: { userId, delta: -cost, reason, jobId },
    });
    const fresh = await tx.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true },
    });
    return fresh?.creditBalance ?? 0;
  });
  return result;
}

/**
 * Refund credits when a render fails after we've already deducted.
 * Never blocks — logs internally on failure so a Stripe webhook can retry.
 */
export async function refund(userId: string, amount: number, jobId?: string): Promise<void> {
  if (amount <= 0) return;
  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { creditBalance: { increment: amount } },
      }),
      prisma.creditTransaction.create({
        data: { userId, delta: amount, reason: "refund", jobId },
      }),
    ]);
  } catch (err) {
    console.error("[credits] refund failed for user", userId, err);
  }
}

export async function readBalance(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true },
  });
  return u?.creditBalance ?? 0;
}

/** Add credits (used by Stripe webhook + admin grants). */
export async function grant(
  userId: string,
  amount: number,
  reason: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (amount <= 0) return;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { creditBalance: { increment: amount } },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        delta: amount,
        reason,
        // Prisma's JSON input is a stricter type; JSON.parse(JSON.stringify) is
        // the standard "widen unknown into JSON-safe" idiom.
        metadata: metadata
          ? (JSON.parse(JSON.stringify(metadata)) as object)
          : undefined,
      },
    }),
  ]);
}

/**
 * Fixed credit packs — priced so that the smallest pack covers ~5 short
 * premium videos and each larger pack is a better deal per credit.
 */
export const CREDIT_PACKS = [
  { id: "pack_starter", priceUsd: 2, credits: 1700, bonusLabel: null },
  { id: "pack_regular", priceUsd: 5, credits: 5500, bonusLabel: "10% bonus" },
  { id: "pack_bulk", priceUsd: 20, credits: 25000, bonusLabel: "33% bonus" },
] as const;

export type CreditPackId = (typeof CREDIT_PACKS)[number]["id"];
export function findPack(id: string) {
  return CREDIT_PACKS.find((p) => p.id === id);
}
