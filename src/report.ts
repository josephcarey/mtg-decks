/**
 * Pure formatting helpers for the analyzer's `[a]`–`[g]` report card and the discovery/tag
 * outputs. Kept side-effect free (they return strings) so the CLI is a thin I/O shell and the
 * formatting is unit-testable.
 */
import type { AffinityRow } from "./affinity.ts";
import type {
  BasicsAudit,
  CurveSummary,
  PipCounts,
  TagCount,
} from "./analysis.ts";
import type {
  AffinityResult,
  Candidate,
  DeckCardRow,
  TagListItem,
} from "./db/queries.ts";

import { PIP_COLORS, TARGET_DECK_SIZE } from "./constants.ts";

const bar = (n: number, max: number, width = 24): string => {
  if (max <= 0) return "";
  return "█".repeat(Math.max(0, Math.round((n / max) * width)));
};

/**
 * Format the `[d]` fetch-vs-basics audit.
 * @param audit - The basic-land audit.
 * @returns Multi-line basics output.
 */
export function formatBasics(audit: BasicsAudit): string {
  const entries = [...audit.basics.entries()].sort((a, b) => b[1] - a[1]);
  const lines = entries.map(([name, count]) => `    ${count}x ${name}`);
  return [
    `[d] Lands: ${audit.totalLands} total, ${audit.totalBasics} basics`,
    ...lines,
  ].join("\n");
}

/**
 * Format the `[a]` card-count line with a pass/fail flag against {@link TARGET_DECK_SIZE}.
 * @param total - Total card count.
 * @returns A single formatted line.
 */
export function formatCount(total: number): string {
  const flag = total === TARGET_DECK_SIZE ? "✓" : "⚠";
  return `[a] Card count: ${total}/${TARGET_DECK_SIZE} ${flag}`;
}

/**
 * Format the `[b]` mana-curve section.
 * @param curve - The computed curve summary.
 * @returns Multi-line curve output.
 */
export function formatCurve(curve: CurveSummary): string {
  const buckets = new Map<number, number>();
  for (const [mv, count] of curve.histogram) {
    const bucket = Math.min(mv, 7);
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + count);
  }
  const keys = [...buckets.keys()].sort((a, b) => a - b);
  const max = Math.max(1, ...buckets.values());
  const lines = keys.map((mv) => {
    const count = buckets.get(mv) ?? 0;
    const label = mv >= 7 ? "7+" : String(mv);
    return `    MV ${label.padStart(2)} | ${String(count).padStart(2)} ${bar(count, max)}`;
  });
  return [
    `[b] Mana curve: avg MV ${curve.averageMv.toFixed(2)} over ${curve.nonlandCount} nonland cards; ${curve.countAtFivePlus} at MV 5+`,
    ...lines,
  ].join("\n");
}

/**
 * Format the `[g]` Game-Changers lint line.
 * @param names - Names of any Game Changers found in the deck.
 * @returns A single formatted line (clean pass when empty).
 */
export function formatGameChangerLint(names: readonly string[]): string {
  if (names.length === 0) return "[g] Game Changers: none ✓";
  return `[g] Game Changers present ⚠ (${names.length}): ${names.join(", ")}`;
}

/**
 * Format the `[c]` color-pip ratio section.
 * @param pips - Total per-color pip counts.
 * @returns A single formatted line with per-color counts and percentages.
 */
export function formatPips(pips: PipCounts): string {
  const total = PIP_COLORS.reduce((sum, color) => sum + pips[color], 0);
  const parts = PIP_COLORS.filter((color) => pips[color] > 0).map((color) => {
    const pct = total === 0 ? 0 : Math.round((pips[color] / total) * 100);
    return `${color} ${pips[color]} (${pct}%)`;
  });
  return `[c] Color pips (${total} total): ${parts.join("  ")}`;
}

/**
 * Format the `[e]` price section.
 * @param totalUsd - Summed USD price of resolved cards.
 * @param missing - Count of cards with no price data.
 * @returns A single formatted line.
 */
export function formatPrice(totalUsd: number, missing: number): string {
  const suffix = missing > 0 ? ` (${missing} without price data)` : "";
  return `[e] Approx. deck price: $${totalUsd.toFixed(2)}${suffix}`;
}

/**
 * Format the `[f]` tag-distribution section with small bars.
 * @param tags - Tag counts (already sorted by the analysis layer).
 * @returns Multi-line tag distribution output.
 */
export function formatTagDistribution(tags: readonly TagCount[]): string {
  const max = Math.max(1, ...tags.map((tag) => tag.count));
  const width = Math.max(0, ...tags.map((tag) => tag.tag.length));
  const lines = tags.map(
    (tag) =>
      `    ${tag.tag.padEnd(width)} | ${String(tag.count).padStart(2)} ${bar(tag.count, max, 20)}`,
  );
  return [`[f] Tag distribution (${tags.length} tags):`, ...lines].join("\n");
}

const money = (usd: null | number): string =>
  usd === null ? "  —  " : `$${usd.toFixed(2)}`;

/**
 * Format an affinity report: the seed's ranked co-occurring tags with share + lift, and any
 * depth-2 drill-down rendered as an indented tree under each first-order tag.
 * @param result - The resolved affinity result.
 * @param sort - The sort metric used (shown in the header for context).
 * @returns Multi-line table/tree output.
 */
export function formatAffinity(result: AffinityResult, sort: string): string {
  const header =
    `${result.seedLabel} — universe ${result.univN} cards · seed ` +
    `${result.seedN} cards · sort ${sort}`;
  if (result.rows.length === 0) {
    return `${header}\n  (no co-tags passed the min-count filter)`;
  }
  const lines = [header, `    lift   share    n   tag`];
  for (const node of result.rows) {
    lines.push(affinityLine(node, "  "));
    for (const child of node.children)
      lines.push(affinityLine(child, "      ↳ "));
  }
  return lines.join("\n");
}

/**
 * Format `deck cards <slug>` — each card with its resolved corpus function tags.
 * @param slug - The deck slug (for the header).
 * @param rows - The deck's cards with corpus tags.
 * @returns Multi-line output.
 */
export function formatDeckCards(
  slug: string,
  rows: readonly DeckCardRow[],
): string {
  const unresolved = rows.filter((row) => !row.resolved).length;
  const header = `${slug}: ${rows.length} cards (${unresolved} unresolved)`;
  const lines = rows.map((row) => {
    const marker = markerFor(row);
    const tags = row.corpusTags.length > 0 ? row.corpusTags.join(" ") : "—";
    return `  ${marker} ${row.count}x ${row.name}  [${tags}]`;
  });
  return [header, ...lines].join("\n");
}

/**
 * Format the discovery results as a ranked table. Owned cards are shown as context (marked
 * `=`) and do not consume a rank number.
 * @param description - The tag's description (header line).
 * @param slug - The tag slug.
 * @param candidates - Ranked candidates (new + owned-for-context).
 * @returns Multi-line table output.
 */
export function formatDiscoverTable(
  slug: string,
  description: string,
  candidates: readonly Candidate[],
): string {
  if (candidates.length === 0) {
    return `otag:${slug} — ${description}\n  (no candidates matched the filters)`;
  }
  let rank = 0;
  const rows = candidates.map((candidate) => {
    const marker = candidate.owned ? "  =" : String(++rank).padStart(3);
    const mv = `MV ${String(Math.trunc(candidate.cmc)).padStart(2)}`;
    return `${marker}  ${money(candidate.priceUsd).padStart(7)}  ${mv}  ${candidate.name}  — ${candidate.typeLine}`;
  });
  return [`otag:${slug} — ${description}`, ...rows].join("\n");
}

/**
 * Format `--list-tags` matches.
 * @param items - Matching tags.
 * @returns Multi-line output, or a not-found note.
 */
export function formatTagList(items: readonly TagListItem[]): string {
  if (items.length === 0) return "(no matching tags)";
  return items.map((item) => `  ${item.slug} — ${item.description}`).join("\n");
}

function affinityLine(row: AffinityRow, prefix: string): string {
  const lift = `${row.lift.toFixed(1)}×`.padStart(6);
  const share = `${(row.share * 100).toFixed(1)}%`.padStart(6);
  const count = String(row.seedCount).padStart(4);
  return `${prefix}${lift} ${share} ${count}   ${row.slug}`;
}

function markerFor(row: DeckCardRow): string {
  if (row.isCommander) return "★";
  return row.resolved ? " " : "?";
}
