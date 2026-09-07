/**
 * Pure deck-analysis functions: mana pips, curve, color ratios, tag distribution, and a
 * basic-land audit. All functions are side-effect free so they are trivial to unit test;
 * the CLI resolves card metadata from the SQLite cache and feeds plain data in.
 */
import type { DeckEntry } from "./decklist.ts";

import { BASIC_LAND_NAMES, PIP_COLORS, type PipColor } from "./constants.ts";

/** Card metadata needed for analysis, joined from the bulk cache to a decklist entry. */
export type AnalyzedCard = {
  readonly cmc: number;
  readonly count: number;
  readonly manaCost: string;
  readonly name: string;
  readonly typeLine: string;
};

/** Result of the basic-land audit. */
export type BasicsAudit = {
  readonly basics: ReadonlyMap<string, number>;
  readonly totalBasics: number;
  readonly totalLands: number;
};

/** Curve summary for the nonland portion of a deck. */
export type CurveSummary = {
  readonly averageMv: number;
  readonly countAtFivePlus: number;
  readonly histogram: ReadonlyMap<number, number>;
  readonly nonlandCount: number;
};

/** A card whose color identity falls outside the commander's — an illegal inclusion. */
export type IdentityViolation = {
  readonly identity: string;
  readonly name: string;
};

/** A per-color tally of mana pips. */
export type PipCounts = Record<PipColor, number>;

/** Budget breakdown for a decklist: totals, proxy candidates, and the priciest cards. */
export type PriceBreakdown = {
  readonly missing: number;
  readonly proxies: readonly PricedCard[];
  readonly top: readonly PricedCard[];
  readonly total: number;
  readonly totalWithoutProxies: number;
};

/** A card with its per-copy USD price (null when the cache has no price). */
export type PricedCard = {
  readonly count: number;
  readonly name: string;
  readonly priceUsd: null | number;
};

/** One tag's weighted occurrence count. */
export type TagCount = { readonly count: number; readonly tag: string };

const EMPTY_PIPS = (): PipCounts => ({ B: 0, G: 0, R: 0, U: 0, W: 0 });

/**
 * Count the colored mana pips in a single mana cost string.
 * Hybrid/Phyrexian symbols contribute to every color they can be paid with.
 * @param manaCost - A Scryfall mana cost such as `{3}{G}{G}` or `{G/U}`.
 * @returns A per-color pip tally.
 */
export function cardPips(manaCost: string): PipCounts {
  const pips = EMPTY_PIPS();
  const symbols = manaCost.match(/\{[^}]+\}/g) ?? [];
  for (const symbol of symbols) {
    const inner = new Set(symbol.slice(1, -1));
    for (const color of PIP_COLORS) {
      if (inner.has(color)) pips[color] += 1;
    }
  }
  return pips;
}

/**
 * Compute the mana curve over the nonland portion of a deck.
 * @param cards - The deck's cards with resolved type lines and CMCs.
 * @returns Average MV, a per-MV histogram, and the count of cards at MV 5+.
 */
export function computeCurve(cards: readonly AnalyzedCard[]): CurveSummary {
  const histogram = new Map<number, number>();
  let weightedMvSum = 0;
  let nonlandCount = 0;
  let countAtFivePlus = 0;

  for (const card of cards) {
    if (isLand(card.typeLine)) continue;
    const mv = Math.trunc(card.cmc);
    histogram.set(mv, (histogram.get(mv) ?? 0) + card.count);
    weightedMvSum += card.cmc * card.count;
    nonlandCount += card.count;
    if (mv >= 5) countAtFivePlus += card.count;
  }

  const averageMv = nonlandCount === 0 ? 0 : weightedMvSum / nonlandCount;
  return { averageMv, countAtFivePlus, histogram, nonlandCount };
}

/**
 * Sum colored pips across every (nonland) card, weighted by copy count.
 * @param cards - The deck's cards with resolved mana costs.
 * @returns The total per-color pip counts.
 */
export function computePips(cards: readonly AnalyzedCard[]): PipCounts {
  const total = EMPTY_PIPS();
  for (const card of cards) {
    const pips = cardPips(card.manaCost);
    for (const color of PIP_COLORS) {
      total[color] += pips[color] * card.count;
    }
  }
  return total;
}

/**
 * Audit basic lands vs. total lands in a decklist.
 * @param entries - Parsed decklist entries.
 * @returns Per-basic counts, the total basics, and the total land count.
 */
export function fetchVsBasics(entries: readonly DeckEntry[]): BasicsAudit {
  const basics = new Map<string, number>();
  let totalBasics = 0;
  let totalLands = 0;

  for (const entry of entries) {
    const isBasic = BASIC_LAND_NAMES.has(entry.name);
    const taggedLand = entry.tags.includes("land");
    if (isBasic) {
      basics.set(entry.name, (basics.get(entry.name) ?? 0) + entry.count);
      totalBasics += entry.count;
      totalLands += entry.count;
    } else if (taggedLand) {
      totalLands += entry.count;
    }
  }

  return { basics, totalBasics, totalLands };
}

/**
 * Whether a card is a land, based on its type line.
 * @param typeLine - The card's full type line (e.g. `Basic Land — Forest`).
 * @returns `true` if the type line denotes a land.
 */
export function isLand(typeLine: string): boolean {
  return /\bLand\b/.test(typeLine);
}

/**
 * Summarise a decklist's cost: total price, cards missing price data, "proxy candidate" cards
 * at or above a per-copy threshold, the total once those are removed, and the priciest cards.
 * @param cards - Priced cards (per-copy price and copy count).
 * @param options - `threshold` USD for proxy flagging and `top` count to list.
 * @returns A {@link PriceBreakdown}.
 */
export function priceBreakdown(
  cards: readonly PricedCard[],
  options: { readonly threshold: number; readonly top: number },
): PriceBreakdown {
  let total = 0;
  let proxyTotal = 0;
  let missing = 0;
  const priced: PricedCard[] = [];
  const proxies: PricedCard[] = [];
  for (const card of cards) {
    if (card.priceUsd === null) {
      missing += card.count;
      continue;
    }
    total += card.priceUsd * card.count;
    priced.push(card);
    if (card.priceUsd >= options.threshold) {
      proxies.push(card);
      proxyTotal += card.priceUsd * card.count;
    }
  }
  const byUnitDesc = (a: PricedCard, b: PricedCard): number =>
    (b.priceUsd ?? 0) - (a.priceUsd ?? 0) || a.name.localeCompare(b.name);
  return {
    missing,
    proxies: [...proxies].sort(byUnitDesc),
    top: [...priced].sort(byUnitDesc).slice(0, options.top),
    total,
    totalWithoutProxies: total - proxyTotal,
  };
}

/**
 * Weighted distribution of inline role tags across a decklist, sorted by count descending
 * (ties broken alphabetically by tag).
 * @param entries - Parsed decklist entries carrying inline tags.
 * @returns Tag counts in descending order.
 */
export function tagDistribution(entries: readonly DeckEntry[]): TagCount[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const tag of entry.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + entry.count);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ count, tag }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
