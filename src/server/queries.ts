import "server-only";
import { prisma } from "./db";
import { levelFromXp, rankTitle } from "@/lib/progression";
import type { ActivityKind, Rarity } from "@/lib/enums";

export type LeaderboardTab =
  | "richest"
  | "biggest-wins"
  | "most-wagered"
  | "games-played"
  | "battles";

export type LeaderboardRange = "weekly" | "all-time";

export type LeaderboardRow = {
  rank: number;
  userId: string;
  username: string;
  minecraftUsername: string | null;
  level: number;
  title: string;
  value: number;
  /** Secondary metric shown under the primary value. */
  detail: string;
};

const TAB_LABELS: Record<LeaderboardTab, string> = {
  richest: "Saldo",
  "biggest-wins": "Suurin voitto",
  "most-wagered": "Panostettu",
  "games-played": "Pelejä",
  battles: "Battle-voitot",
};

export function leaderboardValueLabel(tab: LeaderboardTab): string {
  return TAB_LABELS[tab];
}

/**
 * Weekly boards are computed from the ledger and round history rather than the
 * denormalised counters, so they stay correct without a scheduled reset job.
 */
export async function getLeaderboard(
  tab: LeaderboardTab,
  range: LeaderboardRange,
  limit = 50,
): Promise<LeaderboardRow[]> {
  const since = range === "weekly" ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : null;

  if (!since) {
    return allTimeLeaderboard(tab, limit);
  }

  if (tab === "richest") {
    // "Richest" has no meaningful weekly variant — fall back to net profit.
    const rounds = await prisma.gameRound.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: since } },
      _sum: { payout: true, bet: true },
    });
    const ranked = rounds
      .map((row) => ({
        userId: row.userId,
        value: (row._sum.payout ?? 0) - (row._sum.bet ?? 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
    return hydrate(ranked, (v) => `${v >= 0 ? "netto" : "tappio"}`);
  }

  if (tab === "battles") {
    const wins = await prisma.battleParticipant.groupBy({
      by: ["userId"],
      where: { isWinner: true, userId: { not: null }, battle: { finishedAt: { gte: since } } },
      _count: { _all: true },
    });
    const ranked = wins
      .filter((row) => row.userId)
      .map((row) => ({ userId: row.userId as string, value: row._count._all }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
    return hydrate(ranked, () => "voittoa");
  }

  const rounds = await prisma.gameRound.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: since } },
    _sum: { bet: true },
    _max: { payout: true },
    _count: { _all: true },
  });

  const ranked = rounds
    .map((row) => ({
      userId: row.userId,
      value:
        tab === "most-wagered"
          ? row._sum.bet ?? 0
          : tab === "games-played"
            ? row._count._all
            : row._max.payout ?? 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

  return hydrate(ranked, () => (tab === "games-played" ? "peliä" : "coins"));
}

async function allTimeLeaderboard(tab: LeaderboardTab, limit: number): Promise<LeaderboardRow[]> {
  if (tab === "richest") {
    const wallets = await prisma.wallet.findMany({
      orderBy: { balance: "desc" },
      take: limit,
      include: { user: { select: { id: true, username: true, minecraftUsername: true, xp: true, status: true } } },
    });
    return wallets
      .filter((w) => w.user.status === "ACTIVE")
      .map((wallet, index) => {
        const level = levelFromXp(wallet.user.xp).level;
        return {
          rank: index + 1,
          userId: wallet.user.id,
          username: wallet.user.username,
          minecraftUsername: wallet.user.minecraftUsername,
          level,
          title: rankTitle(level),
          value: wallet.balance,
          detail: "coins",
        };
      });
  }

  const field =
    tab === "biggest-wins"
      ? "biggestWin"
      : tab === "most-wagered"
        ? "totalWagered"
        : tab === "games-played"
          ? "gamesPlayed"
          : "battlesWon";

  const stats = await prisma.userStats.findMany({
    orderBy: { [field]: "desc" },
    take: limit,
    include: { user: { select: { id: true, username: true, minecraftUsername: true, xp: true, status: true } } },
  });

  return stats
    .filter((row) => row.user.status === "ACTIVE")
    .map((row, index) => {
      const level = levelFromXp(row.user.xp).level;
      const value = row[field as keyof typeof row] as number;
      return {
        rank: index + 1,
        userId: row.user.id,
        username: row.user.username,
        minecraftUsername: row.user.minecraftUsername,
        level,
        title: rankTitle(level),
        value,
        detail:
          tab === "games-played" ? "peliä" : tab === "battles" ? "voittoa" : "coins",
      };
    });
}

async function hydrate(
  ranked: { userId: string; value: number }[],
  detail: (value: number) => string,
): Promise<LeaderboardRow[]> {
  if (ranked.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: ranked.map((r) => r.userId) }, status: "ACTIVE" },
    select: { id: true, username: true, minecraftUsername: true, xp: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  return ranked
    .filter((row) => byId.has(row.userId))
    .map((row, index) => {
      const user = byId.get(row.userId)!;
      const level = levelFromXp(user.xp).level;
      return {
        rank: index + 1,
        userId: user.id,
        username: user.username,
        minecraftUsername: user.minecraftUsername,
        level,
        title: rankTitle(level),
        value: row.value,
        detail: detail(row.value),
      };
    });
}

/** Where a specific player sits on the all-time richest board. */
export async function getLeaderboardRank(userId: string): Promise<number | null> {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) return null;
  const ahead = await prisma.wallet.count({ where: { balance: { gt: wallet.balance } } });
  return ahead + 1;
}

export type FeedItem = {
  id: string;
  kind: ActivityKind;
  username: string;
  minecraftUsername: string | null;
  label: string;
  amount: number | null;
  rarity: Rarity | null;
  createdAt: string;
};

/** Public feed. Selects only fields that are safe to show to everyone. */
export async function getActivityFeed(limit = 12): Promise<FeedItem[]> {
  const events = await prisma.activityEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      kind: true,
      label: true,
      amount: true,
      rarity: true,
      createdAt: true,
      user: { select: { username: true, minecraftUsername: true } },
    },
  });

  return events.map((event) => ({
    id: event.id,
    kind: event.kind as ActivityKind,
    username: event.user.username,
    minecraftUsername: event.user.minecraftUsername,
    label: event.label,
    amount: event.amount,
    rarity: event.rarity as Rarity | null,
    createdAt: event.createdAt.toISOString(),
  }));
}

export async function getUserOverview(userId: string) {
  const [user, stats, rank, achievements, recentRounds] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { wallet: true },
    }),
    prisma.userStats.findUnique({ where: { userId } }),
    getLeaderboardRank(userId),
    prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { achievement: { sortOrder: "asc" } },
    }),
    prisma.gameRound.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const progress = levelFromXp(user.xp);

  return {
    user,
    stats,
    rank,
    achievements,
    recentRounds,
    progress,
    title: rankTitle(progress.level),
  };
}

export async function getEconomySnapshot(days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [wagered, won, caseSpend, caseReward, dailyPaid, adminAdjust, activeUsers, rounds] =
    await Promise.all([
      prisma.transaction.aggregate({ where: { type: "GAME_BET", createdAt: { gte: since } }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: "GAME_WIN", createdAt: { gte: since } }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: "CASE_PURCHASE", createdAt: { gte: since } }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: "CASE_REWARD", createdAt: { gte: since } }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: "DAILY_REWARD", createdAt: { gte: since } }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: "ADMIN_ADJUSTMENT", createdAt: { gte: since } }, _sum: { amount: true } }),
      prisma.user.count({ where: { lastSeenAt: { gte: since } } }),
      prisma.gameRound.count({ where: { createdAt: { gte: since } } }),
    ]);

  const totalWagered = Math.abs(wagered._sum.amount ?? 0);
  const totalPayout = won._sum.amount ?? 0;

  return {
    totalWagered,
    totalPayout,
    gameDelta: totalWagered - totalPayout,
    caseSpend: Math.abs(caseSpend._sum.amount ?? 0),
    caseReward: caseReward._sum.amount ?? 0,
    dailyPaid: dailyPaid._sum.amount ?? 0,
    adminAdjust: adminAdjust._sum.amount ?? 0,
    activeUsers,
    rounds,
    roundsPerUser: activeUsers > 0 ? rounds / activeUsers : 0,
  };
}
