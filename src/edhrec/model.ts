/**
 * Pure EDHREC helpers: commander-name slugging, defensive parsing of EDHREC's static page JSON,
 * and cross-referencing its recommendations against a deck. This module imports NO Bun builtins
 * and performs NO network I/O, so it is fully unit-testable; {@link "./client.ts"} handles fetch
 * + disk cache and the CLI wires the two together.
 *
 * EDHREC has no official API. The stable static JSON lives at
 * `https://json.edhrec.com/pages/commanders/<slug>.json` and is keyed by a **name-slug**, not by
 * Scryfall `oracle_id`, so callers resolve recommended names back to the local card corpus.
 */
import type { CardRow } from "../db/model.ts";

import { ciSubsetOf } from "../db/model.ts";

/** A single recommended card as it appears in an EDHREC cardlist. */
export type EdhrecCardView = {
  /** Card name as printed. */
  readonly name: string;
  /** Number of sampled decks running the card. */
  readonly numDecks: number;
  /** Decks that could run the card (denominator for inclusion %). */
  readonly potentialDecks: number;
  /** EDHREC synergy score (fraction above the format-wide base rate); may be negative. */
  readonly synergy: number;
};

/** A theme (a.k.a. tag) a commander is played with, from the page's `tag_counts`. */
export type EdhrecTheme = {
  /** Number of sampled decks on this theme. */
  readonly count: number;
  /** Display label, e.g. "Theft". */
  readonly label: string;
  /** Theme slug used for the subpage URL, e.g. "theft". */
  readonly slug: string;
};

/** A cross-referenced recommendation, joined against the local corpus where possible. */
export type Recommendation = {
  /** Fraction of potential decks running the card, in `[0,1]` (from EDHREC sample). */
  readonly inclusion: number;
  readonly name: string;
  readonly numDecks: number;
  /** Corpus price in USD, when the card resolved locally. */
  readonly priceUsd: null | number;
  /** Whether the name resolved to a card in the local corpus. */
  readonly resolved: boolean;
  readonly synergy: number;
  /** Corpus type line, when the card resolved locally. */
  readonly typeLine: null | string;
};

/** A named list of recommendations (e.g. "High Synergy Cards", "Top Cards"). */
type EdhrecCardlist = {
  readonly cards: readonly EdhrecCardView[];
  readonly header: string;
  readonly tag: string;
};

/** A parsed EDHREC commander page. */
type EdhrecPage = {
  readonly cardlists: readonly EdhrecCardlist[];
};

/** Cardlist tags used by default when surfacing "what am I missing" recommendations. */
const DEFAULT_EDHREC_TAGS: readonly string[] = ["highsynergycards", "topcards"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asNumber = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

/** Options controlling {@link crossReference}. */
type CrossReferenceOptions = {
  /** Requested color-identity mask; recommendations outside it are dropped when resolved. */
  readonly idMask: number;
  /** Keep cards flagged as Game Changers (default excludes them). */
  readonly includeGameChangers: boolean;
  /** Maximum recommendations to return. */
  readonly limit: number;
  /** Lowercased names already in the deck, which are skipped. */
  readonly owned: ReadonlySet<string>;
  /** Resolve a lowercased card name to a local corpus row, if present. */
  readonly resolve: (nameLower: string) => CardRow | undefined;
};

/**
 * Convert a commander name to its EDHREC page slug.
 *
 * Diacritics are stripped, the front face of a double-faced name (`A // B`) is used, apostrophes
 * are dropped, and every other run of non-alphanumerics collapses to a single hyphen.
 * @param name - Commander card name, e.g. `"Wort, the Raidmother"`.
 * @returns The EDHREC slug, e.g. `"wort-the-raidmother"`.
 */
export function commanderSlug(name: string): string {
  const front = name.split("//")[0] ?? name;
  return front
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036F]/g, "")
    .toLowerCase()
    .replaceAll("'", "")
    .replaceAll("\u2019", "")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

/**
 * Cross-reference EDHREC recommendations against a deck and the local corpus.
 *
 * Owned cards are skipped. Resolved cards are filtered to the requested color identity and (by
 * default) exclude Game Changers, honouring the workspace guardrail. Unresolved names are kept
 * (flagged) so a corpus gap is visible rather than silently dropped.
 * @param cardviews - Candidate recommendations (e.g. from {@link selectCardviews}).
 * @param options - Filtering + resolution options.
 * @returns Up to `limit` recommendations in the input order.
 */
export function crossReference(
  cardviews: readonly EdhrecCardView[],
  options: CrossReferenceOptions,
): Recommendation[] {
  const out: Recommendation[] = [];
  for (const view of cardviews) {
    if (out.length >= options.limit) break;
    const key = view.name.toLowerCase();
    if (options.owned.has(key)) continue;
    const row = options.resolve(key);
    if (row !== undefined) {
      if (!ciSubsetOf(row.ci_mask, options.idMask)) continue;
      if (row.game_changer === 1 && !options.includeGameChangers) continue;
    }
    out.push({
      inclusion:
        view.potentialDecks > 0 ? view.numDecks / view.potentialDecks : 0,
      name: view.name,
      numDecks: view.numDecks,
      priceUsd: row?.price_usd ?? null,
      resolved: row !== undefined,
      synergy: view.synergy,
      typeLine: row?.type_line ?? null,
    });
  }
  return out;
}

/**
 * Defensively parse EDHREC's page JSON into an {@link EdhrecPage}.
 *
 * Only the fields this tool needs are extracted; anything malformed is skipped rather than
 * throwing, so an EDHREC shape change degrades gracefully instead of crashing the CLI.
 * @param json - The raw parsed JSON body from an EDHREC commander page.
 * @returns A normalised page, or `null` if no cardlists could be found.
 */
export function parseEdhrecPage(json: unknown): EdhrecPage | null {
  if (!isRecord(json)) return null;
  const container = json.container;
  if (!isRecord(container)) return null;
  const jsonDict = container.json_dict;
  if (!isRecord(jsonDict)) return null;
  const rawLists = jsonDict.cardlists;
  if (!Array.isArray(rawLists)) return null;

  const cardlists: EdhrecCardlist[] = [];
  for (const rawList of rawLists) {
    if (!isRecord(rawList)) continue;
    const rawCards = Array.isArray(rawList.cardviews) ? rawList.cardviews : [];
    const cards: EdhrecCardView[] = [];
    for (const rawCard of rawCards) {
      if (!isRecord(rawCard)) continue;
      const name = rawCard.name;
      if (typeof name !== "string" || name.length === 0) continue;
      cards.push({
        name,
        numDecks: asNumber(rawCard.num_decks),
        potentialDecks: asNumber(rawCard.potential_decks),
        synergy: asNumber(rawCard.synergy),
      });
    }
    cardlists.push({
      cards,
      header: typeof rawList.header === "string" ? rawList.header : "",
      tag: typeof rawList.tag === "string" ? rawList.tag : "",
    });
  }
  return { cardlists };
}

/**
 * Parse a commander page's theme list from its top-level `tag_counts`.
 * @param json - The raw parsed JSON body from an EDHREC commander page.
 * @returns The themes the commander is played with, in EDHREC's order (most-played first).
 */
export function parseThemes(json: unknown): EdhrecTheme[] {
  if (!isRecord(json)) return [];
  const raw = json.tag_counts;
  if (!Array.isArray(raw)) return [];
  const themes: EdhrecTheme[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const slug = entry.slug;
    if (typeof slug !== "string" || slug.length === 0) continue;
    themes.push({
      count: asNumber(entry.count),
      label: typeof entry.value === "string" ? entry.value : slug,
      slug,
    });
  }
  return themes;
}

/**
 * Flatten the selected cardlists into a single de-duplicated, source-ordered list of cardviews.
 * @param page - A parsed EDHREC page.
 * @param tags - Cardlist tags to include (defaults to {@link DEFAULT_EDHREC_TAGS}).
 * @returns Unique cardviews across the chosen lists, first occurrence wins.
 */
export function selectCardviews(
  page: EdhrecPage,
  tags: readonly string[] = DEFAULT_EDHREC_TAGS,
): EdhrecCardView[] {
  const wanted = new Set(tags);
  const seen = new Set<string>();
  const out: EdhrecCardView[] = [];
  for (const list of page.cardlists) {
    if (!wanted.has(list.tag)) continue;
    for (const card of list.cards) {
      const key = card.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(card);
    }
  }
  return out;
}
