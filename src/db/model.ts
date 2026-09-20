/**
 * Pure transforms and predicates for the SQLite data layer. This module deliberately imports
 * NO Bun-only builtins (e.g. `bun:sqlite`) so it can be unit-tested under Vitest/Node. The
 * `schema.ts`/`queries.ts` modules that touch the database import these helpers.
 */
import { COLOR_BIT, PIP_COLORS, type PipColor } from "../constants.ts";

/** A row in the `cards` table. */
export type CardRow = {
  readonly ci_mask: number;
  readonly cmc: number;
  readonly color_identity: string;
  readonly edhrec_rank: null | number;
  readonly first_released_at: string;
  readonly game_changer: number;
  readonly keywords: string;
  readonly last_released_at: string;
  readonly mana_cost: string;
  readonly name: string;
  readonly name_lower: string;
  readonly oracle_id: string;
  readonly oracle_text: string;
  readonly paper_available: number;
  readonly price_usd: null | number;
  /**
   * Best-effort set code from the oracle bulk (a single representative printing), so `--set`
   * has something to filter on. NOT authoritative for reprints — see the cookbook caveat.
   */
  readonly set_code: string;
  readonly set_name: string;
  readonly set_type: string;
  readonly type_line: string;
};

/** Printing-level fields aggregated from Scryfall's `default_cards` export. */
export type PrintingSummary = {
  readonly firstReleasedAt: string;
  readonly lastReleasedAt: string;
  readonly paperAvailable: boolean;
  readonly priceUsd: null | number;
};

/** A row in the `tags` table (taggings are stored separately in `card_tags`). */
export type TagRow = {
  readonly aliases: string;
  readonly child_ids: string;
  readonly description: string;
  readonly id: string;
  readonly label: string;
  readonly parent_ids: string;
  readonly slug: string;
};

const isPipColor = (value: string): value is PipColor =>
  (PIP_COLORS as readonly string[]).includes(value);

type RawCard = {
  cmc?: unknown;
  color_identity?: unknown;
  edhrec_rank?: unknown;
  game_changer?: unknown;
  games?: unknown;
  keywords?: unknown;
  mana_cost?: unknown;
  name?: unknown;
  oracle_id?: unknown;
  oracle_text?: unknown;
  prices?: { usd?: unknown };
  released_at?: unknown;
  set?: unknown;
  set_name?: unknown;
  set_type?: unknown;
  type_line?: unknown;
};

type RawPrinting = {
  games?: unknown;
  oracle_id?: unknown;
  prices?: { usd?: unknown };
  released_at?: unknown;
  set_type?: unknown;
};

const DIGITAL_ONLY_SET_TYPES = new Set([
  "alchemy",
  "funny",
  "memorabilia",
  "token",
]);

/**
 * Whether a card's identity mask is a subset of a requested identity mask.
 * @param cardMask - The card's `ci_mask`.
 * @param requestedMask - The allowed identity mask (e.g. from `--id gu`).
 * @returns `true` if the card fits within the requested colors.
 */
export function ciSubsetOf(cardMask: number, requestedMask: number): boolean {
  return (cardMask & ~requestedMask) === 0;
}

/**
 * Normalise a color-identity array to a stable, alphabetically-sorted string.
 * @param colors - Color letters such as `["U","G"]`.
 * @returns A sorted identity string, e.g. `"GU"` (empty string for colorless).
 */
export function colorIdentityString(colors: readonly string[]): string {
  return [...colors]
    .map((color) => color.toUpperCase())
    .filter((color): color is PipColor => isPipColor(color))
    .sort()
    .join("");
}

/**
 * Compute the WUBRG bitmask for a color-identity array.
 * @param colors - Color letters such as `["G","U"]`.
 * @returns The OR of each color's bit (W=1,U=2,B=4,R=8,G=16).
 */
export function colorMask(colors: readonly string[]): number {
  let mask = 0;
  for (const color of colors) {
    const upper = color.toUpperCase();
    if (isPipColor(upper)) mask |= COLOR_BIT[upper];
  }
  return mask;
}

/**
 * Fold one printing into an oracle-level price, availability, and release-date summary.
 * Digital-only and novelty printings do not affect any of the paper-facing fields.
 */
export function mergePrintingSummary(
  current: PrintingSummary | undefined,
  record: RawPrinting,
): PrintingSummary {
  const paperPrinting = isPaperPrinting(record);
  const releasedAt = paperPrinting ? asString(record.released_at) : "";
  const priceUsd = paperPrinting ? priceToNumber(record.prices?.usd) : null;
  let firstReleasedAt = current?.firstReleasedAt ?? "";
  if (
    firstReleasedAt === "" ||
    (releasedAt !== "" && releasedAt < firstReleasedAt)
  ) {
    firstReleasedAt = releasedAt;
  }
  let cheapestPrice = current?.priceUsd ?? null;
  if (priceUsd !== null) {
    cheapestPrice =
      cheapestPrice === null ? priceUsd : Math.min(priceUsd, cheapestPrice);
  }
  return {
    firstReleasedAt,
    lastReleasedAt:
      current === undefined || releasedAt > current.lastReleasedAt
        ? releasedAt
        : current.lastReleasedAt,
    paperAvailable: (current?.paperAvailable ?? false) || paperPrinting,
    priceUsd: cheapestPrice,
  };
}

/**
 * Parse a Scryfall USD price (string or null) into a number.
 * @param usd - The `prices.usd` field.
 * @returns The numeric price, or `null` if unavailable/unparseable.
 */
export function priceToNumber(usd: unknown): null | number {
  if (typeof usd !== "string") return null;
  const value = Number.parseFloat(usd);
  return Number.isFinite(value) ? value : null;
}

/** Whether a printing is a physical, non-novelty card usable by paper deck builders. */
function isPaperPrinting(record: RawPrinting): boolean {
  const games = asStringArray(record.games);
  const setType = asString(record.set_type).toLowerCase();
  return games.includes("paper") && !DIGITAL_ONLY_SET_TYPES.has(setType);
}

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";
const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];

type RawTag = {
  aliases?: unknown;
  child_ids?: unknown;
  description?: unknown;
  id?: unknown;
  label?: unknown;
  parent_ids?: unknown;
  slug?: unknown;
};

/**
 * Map a raw oracle_cards JSON record to a {@link CardRow}. Returns `null` for records that
 * lack the two identifying fields (oracle_id + name) we require.
 * @param record - A parsed JSON object from the oracle_cards bulk export.
 * @returns A normalised {@link CardRow}, or `null` if the record is unusable.
 */
export function buildCardRow(
  record: RawCard,
  printing?: PrintingSummary,
): CardRow | null {
  const oracleId = asString(record.oracle_id);
  const name = asString(record.name);
  if (oracleId === "" || name === "") return null;

  const colors = asStringArray(record.color_identity);
  const fallbackPaper = isPaperPrinting(record);
  return {
    ci_mask: colorMask(colors),
    cmc: typeof record.cmc === "number" ? record.cmc : 0,
    color_identity: colorIdentityString(colors),
    edhrec_rank:
      typeof record.edhrec_rank === "number" ? record.edhrec_rank : null,
    first_released_at:
      printing?.firstReleasedAt ?? asString(record.released_at),
    game_changer: record.game_changer === true ? 1 : 0,
    keywords: JSON.stringify(asStringArray(record.keywords)),
    last_released_at: printing?.lastReleasedAt ?? asString(record.released_at),
    mana_cost: asString(record.mana_cost),
    name,
    name_lower: name.toLowerCase(),
    oracle_id: oracleId,
    oracle_text: asString(record.oracle_text),
    paper_available:
      printing?.paperAvailable === true ||
      (printing === undefined && fallbackPaper)
        ? 1
        : 0,
    price_usd:
      printing === undefined && fallbackPaper
        ? priceToNumber(record.prices?.usd)
        : (printing?.priceUsd ?? null),
    set_code: asString(record.set),
    set_name: asString(record.set_name),
    set_type: asString(record.set_type),
    type_line: asString(record.type_line),
  };
}

/**
 * Map a raw oracle_tags JSON record to a {@link TagRow}. Returns `null` if it lacks id+slug.
 * @param record - A parsed JSON object from the oracle_tags bulk export.
 * @returns A normalised {@link TagRow}, or `null` if the record is unusable.
 */
export function buildTagRow(record: RawTag): null | TagRow {
  const id = asString(record.id);
  const slug = asString(record.slug);
  if (id === "" || slug === "") return null;

  return {
    aliases: JSON.stringify(asStringArray(record.aliases)),
    child_ids: JSON.stringify(asStringArray(record.child_ids)),
    description: asString(record.description),
    id,
    label: asString(record.label) || slug,
    parent_ids: JSON.stringify(asStringArray(record.parent_ids)),
    slug,
  };
}

/**
 * Sanitise free-text input into a safe FTS5 MATCH query: each whitespace-delimited term is
 * quoted so punctuation in card text can't break the FTS grammar; terms are AND-ed.
 * @param input - Raw user search text.
 * @returns An FTS5 MATCH expression, or `null` if the input has no usable terms.
 */
export function ftsMatchQuery(input: string): null | string {
  const terms = input
    .split(/\s+/)
    .map((term) => term.replaceAll(/["*]/g, "").trim())
    .filter((term) => term.length > 0);
  if (terms.length === 0) return null;
  return terms.map((term) => `"${term}"`).join(" AND ");
}

const WRITE_KEYWORDS =
  /\b(insert|update|delete|drop|alter|create|attach|detach|replace|pragma|vacuum|reindex|begin|commit|rollback)\b/i;

/**
 * Whether a SQL string is a single read-only statement safe for the `deck sql` passthrough.
 * Rejects write/DDL keywords and multiple statements; allows a single trailing `;`.
 * @param sql - The user-supplied SQL.
 * @returns `true` if the statement is a lone read-only query.
 */
export function isReadOnlySql(sql: string): boolean {
  const trimmed = sql.trim().replace(/;\s*$/, "");
  if (trimmed.length === 0) return false;
  if (trimmed.includes(";")) return false;
  if (WRITE_KEYWORDS.test(trimmed)) return false;
  return /^(select|with|explain)\b/i.test(trimmed);
}
