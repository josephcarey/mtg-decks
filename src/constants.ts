/**
 * Shared constants for the deck tooling. Centralised so magic numbers/strings live in one
 * place and pure functions elsewhere can be tested against them.
 */

/** The required Commander deck size (including the commander): singleton, exactly 100. */
export const TARGET_DECK_SIZE = 100;

/** Basic land names. Snow-covered basics are intentionally excluded — none are used here. */
export const BASIC_LAND_NAMES: ReadonlySet<string> = new Set([
  "Forest",
  "Island",
  "Mountain",
  "Plains",
  "Swamp",
  "Wastes",
]);

/** The five WUBRG pip colors, in canonical order. */
export const PIP_COLORS = ["W", "U", "B", "R", "G"] as const;

/** A single WUBRG color symbol. */
export type PipColor = (typeof PIP_COLORS)[number];

/**
 * Color -> bitmask, used for fast color-identity subset checks in SQL.
 * A card's identity is a subset of the requested identity iff `(ci_mask & ~reqMask) === 0`.
 */
export const COLOR_BIT: Readonly<Record<PipColor, number>> = {
  B: 4,
  G: 16,
  R: 8,
  U: 2,
  W: 1,
};

/** The default color identity for discovery (Simic — the workspace's primary colors). */
export const DEFAULT_DISCOVER_ID = "gu";

/** Default number of NEW candidates shown by discovery. */
export const DEFAULT_DISCOVER_LIMIT = 25;

/** Per-copy USD price at or above which `deck price` flags a card as a proxy candidate. */
export const DEFAULT_PROXY_THRESHOLD_USD = 15;

/** Default number of priciest cards listed by `deck price`. */
export const DEFAULT_PRICE_TOP = 12;

/** Repo-relative path of the derived SQLite database. */
export const DEFAULT_DB_PATH = "data/mtg.db";

/** Repo-relative directory holding the downloaded Scryfall bulk exports. */
export const DATA_DIR = "data";
