/**
 * Shared constants for the deck tooling. Centralised so magic numbers/strings live in one
 * place and pure functions elsewhere can be tested against them.
 */
import { join } from "node:path";

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

/** Default number of first-order co-tags shown by `affinity`. */
export const DEFAULT_AFFINITY_LIMIT = 25;

/** Default number of depth-2 co-tags shown under each first-order tag. */
export const DEFAULT_AFFINITY_CHILD_LIMIT = 5;

/** Default minimum seed co-occurrence count for `affinity` (noise filter). */
export const DEFAULT_AFFINITY_MIN_COUNT = 5;

/** Default drill-down depth for `affinity` (1 = first-order only, 2 = path drill-down). */
export const DEFAULT_AFFINITY_DEPTH = 1;

/** Directory holding downloaded and derived data; override for isolated/test caches. */
export const DATA_DIR = process.env.MTG_DATA_DIR?.trim() || "data";

/** Path of the derived SQLite database inside {@link DATA_DIR}. */
export const DEFAULT_DB_PATH = join(DATA_DIR, "mtg.db");
