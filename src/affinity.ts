/**
 * Pure tag-affinity ranking. Given raw seed/universe co-occurrence counts, compute each tag's
 * share (of the seed) and lift (enrichment vs. the universe base rate), then filter and sort.
 * Side-effect free so the ranking is unit-testable; the SQLite fetching lives in `db/queries.ts`.
 *
 * Concepts:
 *   - universe: every card passing the color-identity / Game-Changer filters.
 *   - seed:     the universe cards matching the theme (a tag, or a deck's cards).
 *   - share = seedCount / seedN     (what fraction of the seed carries the co-tag)
 *   - lift  = share / (univCount / univN)   (how enriched the co-tag is vs. baseline)
 */

/** A ranked co-occurring tag. */
export type AffinityRow = {
  readonly lift: number;
  readonly seedCount: number;
  readonly share: number;
  readonly slug: string;
  readonly univCount: number;
};

/** How to rank affinity rows. */
export type AffinitySort = "count" | "lift" | "share";

/** Raw per-tag counts fed in from the query layer. */
export type RawTagCount = {
  readonly seedCount: number;
  readonly slug: string;
  readonly univCount: number;
};

/** Options controlling {@link rankAffinity}. */
type RankOptions = {
  readonly exclude?: ReadonlySet<string>;
  readonly limit: number;
  readonly minCount: number;
  readonly sort: AffinitySort;
};

/**
 * Rank co-occurring tags for a seed by share/lift/count.
 * @param raw - Per-tag seed + universe counts.
 * @param seedN - Number of cards in the seed.
 * @param univN - Number of cards in the universe.
 * @param options - Filtering + sorting {@link RankOptions}.
 * @returns Ranked {@link AffinityRow}s, filtered by `minCount`/`exclude` and capped at `limit`.
 */
export function rankAffinity(
  raw: readonly RawTagCount[],
  seedN: number,
  univN: number,
  options: RankOptions,
): AffinityRow[] {
  if (seedN <= 0 || univN <= 0) return [];
  const exclude = options.exclude ?? new Set<string>();
  const rows: AffinityRow[] = [];
  for (const entry of raw) {
    if (exclude.has(entry.slug)) continue;
    if (entry.seedCount < options.minCount) continue;
    if (entry.univCount <= 0) continue;
    const share = entry.seedCount / seedN;
    const baseRate = entry.univCount / univN;
    rows.push({
      lift: share / baseRate,
      seedCount: entry.seedCount,
      share,
      slug: entry.slug,
      univCount: entry.univCount,
    });
  }
  rows.sort(comparator(options.sort));
  return rows.slice(0, options.limit);
}

function comparator(
  sort: AffinitySort,
): (a: AffinityRow, b: AffinityRow) => number {
  return (a, b) => {
    let primary: number;
    if (sort === "count") {
      primary = b.seedCount - a.seedCount || b.lift - a.lift;
    } else if (sort === "share") {
      primary = b.share - a.share || b.lift - a.lift;
    } else {
      primary = b.lift - a.lift || b.seedCount - a.seedCount;
    }
    return primary || a.slug.localeCompare(b.slug);
  };
}
