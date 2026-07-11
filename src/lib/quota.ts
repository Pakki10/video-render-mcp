import { prisma } from "./db";

const DAILY_QUOTA = Number(process.env.DAILY_RENDER_QUOTA || 20);

export interface QuotaSnapshot {
  used: number;
  limit: number;
  remaining: number;
  resetAt: Date;
}

/** Successful renders today (UTC) for a given user. */
export async function readDailyUsage(userId: string): Promise<QuotaSnapshot> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const resetAt = new Date(startOfDay);
  resetAt.setUTCDate(resetAt.getUTCDate() + 1);

  const used = await prisma.renderJob.count({
    where: {
      userId,
      status: "success",
      createdAt: { gte: startOfDay },
    },
  });
  return {
    used,
    limit: DAILY_QUOTA,
    remaining: Math.max(0, DAILY_QUOTA - used),
    resetAt,
  };
}
