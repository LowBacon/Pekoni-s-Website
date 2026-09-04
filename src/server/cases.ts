import "server-only";
import { prisma, type Tx } from "./db";
import { fairWeightedPick } from "./rng";
import { applyLedgerEntry, claimIdempotencyKey, storeIdempotentResult } from "./wallet";
import {
  awardXp,
  pushActivity,
  recordAchievementProgress,
  updateStats,
  type UnlockedAchievement,
} from "./progression";
import { XP_RULES } from "@/lib/progression";
import type { Rarity } from "@/lib/enums";

export type DrawnItem = {
  id: string;
  name: string;
  rarity: Rarity;
  icon: string;
  value: number;
};

/**
 * Picks a case item from the fair stream. The reel the client animates is
 * cosmetic — the landing item is decided here, before any pixels move.
 */
export function drawItem(
  items: { id: string; name: string; rarity: string; icon: string; value: number; weight: number }[],
  roll: number,
): DrawnItem {
  const picked = fairWeightedPick(items, roll);
  return {
    id: picked.id,
    name: picked.name,
    rarity: picked.rarity as Rarity,
    icon: picked.icon,
    value: picked.value,
  };
}

export type CaseOpenResult = {
  balance: number;
  item: DrawnItem;
  cost: number;
  profit: number;
  openingId: string;
  /** Reel strip the client scrolls through; the winner sits at `winningIndex`. */
  reel: DrawnItem[];
  winningIndex: number;
  level: number;
  leveledUp: boolean;
  unlocked: UnlockedAchievement[];
};

const REEL_LENGTH = 60;
const WINNING_INDEX = 52;

/** Builds the visual strip. Decoration only — never influences the outcome. */
function buildReel(
  items: { id: string; name: string; rarity: string; icon: string; value: number; weight: number }[],
  winner: DrawnItem,
  rng: { next(): number },
): DrawnItem[] {
  const reel: DrawnItem[] = [];
  for (let i = 0; i < REEL_LENGTH; i += 1) {
    reel.push(i === WINNING_INDEX ? winner : drawItem(items, rng.next()));
  }
  return reel;
}

export async function openCase(input: {
  userId: string;
  caseId: string;
  idempotencyKey?: string;
}): Promise<CaseOpenResult> {
  return prisma.$transaction(
    async (tx) => {
      if (input.idempotencyKey) {
        const claim = await claimIdempotencyKey(tx, input.idempotencyKey, input.userId, "case:open");
        if (!claim.fresh) return claim.result as CaseOpenResult;
      }

      const theCase = await tx.case.findUnique({
        where: { id: input.caseId },
        include: { items: true },
      });
      if (!theCase || !theCase.active) throw new Error("Casea ei löytynyt.");
      if (theCase.kind === "DAILY") throw new Error("Daily Case avataan omalta sivultaan.");
      if (theCase.items.length === 0) throw new Error("Case on tyhjä.");

      const user = await tx.user.update({
        where: { id: input.userId },
        data: { nonce: { increment: 1 } },
        select: { serverSeed: true, clientSeed: true, nonce: true },
      });

      await applyLedgerEntry(tx, input.userId, {
        type: "CASE_PURCHASE",
        amount: theCase.price,
        source: `case:${theCase.slug}`,
        metadata: { caseId: theCase.id },
      });

      const { fairStream } = await import("./rng");
      const rng = fairStream(user.serverSeed, user.clientSeed, user.nonce);

      const item = drawItem(theCase.items, rng.next());
      const reel = buildReel(theCase.items, item, rng);

      if (item.value > 0) {
        await applyLedgerEntry(tx, input.userId, {
          type: "CASE_REWARD",
          amount: item.value,
          source: `case:${theCase.slug}`,
          metadata: { itemId: item.id, rarity: item.rarity },
        });
      }

      const opening = await tx.caseOpening.create({
        data: {
          userId: input.userId,
          caseId: theCase.id,
          itemId: item.id,
          cost: theCase.price,
          value: item.value,
          source: "SHOP",
        },
        select: { id: true },
      });

      const profit = item.value - theCase.price;

      await updateStats(tx, input.userId, {
        casesOpened: 1,
        biggestWin: profit > 0 ? profit : 0,
      });

      const xp = await awardXp(tx, input.userId, XP_RULES.caseOpen);

      const unlocked = await recordAchievementProgress(tx, input.userId, [
        { slug: "case-collector", value: 1, mode: "increment" },
        ...(item.rarity === "LEGENDARY" || item.rarity === "MYTHIC"
          ? [{ slug: "lucky", value: 1, mode: "increment" as const }]
          : []),
      ]);

      await pushActivity(tx, input.userId, {
        kind: "CASE_OPEN",
        label: `avasi ${theCase.name} — ${item.name}`,
        amount: item.value,
        rarity: item.rarity,
      });

      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: input.userId } });

      const response: CaseOpenResult = {
        balance: wallet.balance,
        item,
        cost: theCase.price,
        profit,
        openingId: opening.id,
        reel,
        winningIndex: WINNING_INDEX,
        level: xp.level,
        leveledUp: xp.leveledUp,
        unlocked,
      };

      if (input.idempotencyKey) {
        await storeIdempotentResult(tx, input.idempotencyKey, response);
      }

      return response;
    },
    { timeout: 15_000 },
  );
}

/** Aggregate odds shown on the case page. Derived from the live item weights. */
export function rarityOdds(
  items: { rarity: string; weight: number }[],
): { rarity: Rarity; chance: number }[] {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  const grouped = new Map<string, number>();
  for (const item of items) {
    grouped.set(item.rarity, (grouped.get(item.rarity) ?? 0) + item.weight);
  }
  return [...grouped.entries()]
    .map(([rarity, weight]) => ({ rarity: rarity as Rarity, chance: weight / total }))
    .sort((a, b) => b.chance - a.chance);
}

export function expectedValue(items: { value: number; weight: number }[]): number {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (total === 0) return 0;
  return items.reduce((sum, item) => sum + item.value * item.weight, 0) / total;
}

/** Used by the daily case so it shares one draw implementation. */
export async function drawFromCaseSlug(tx: Tx, slug: string, roll: number) {
  const theCase = await tx.case.findUnique({ where: { slug }, include: { items: true } });
  if (!theCase || theCase.items.length === 0) throw new Error("Casea ei löytynyt.");
  return { case: theCase, item: drawItem(theCase.items, roll) };
}
