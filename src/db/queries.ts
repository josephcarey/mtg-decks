/**
 * SQLite query layer over the local bulk cache (`bun:sqlite`). Expected failures (missing
 * database, unknown tag, unsafe SQL) are returned as `neverthrow` Results; only genuinely
 * unrecoverable states throw. Pure predicates/transforms live in `./model.ts`.
 */
import { Database } from "bun:sqlite";
import { err, ok, type Result } from "neverthrow";
import { existsSync } from "node:fs";

import type { AffinityRow, AffinitySort, RawTagCount } from "../affinity.ts";
import type { DeckEntry } from "../decklist.ts";
import type { CardRow, TagRow } from "./model.ts";

import { rankAffinity } from "../affinity.ts";
import { colorMask, isReadOnlySql } from "./model.ts";

/** A structured database-layer error. */
type DbError = { readonly kind: "db"; readonly message: string };

const dbError = (message: string): DbError => ({ kind: "db", message });

/** One ranked co-tag plus (optionally) its second-order drill-down. */
export type AffinityNode = AffinityRow & { readonly children: AffinityRow[] };

/** Affinity output: the resolved seed plus its ranked co-occurring tags. */
export type AffinityResult = {
  readonly rows: AffinityNode[];
  readonly seedLabel: string;
  readonly seedN: number;
  readonly univN: number;
};

/** A discovery candidate card. */
export type Candidate = {
  readonly cmc: number;
  readonly edhrecRank: null | number;
  readonly name: string;
  readonly owned: boolean;
  readonly priceUsd: null | number;
  readonly typeLine: string;
};

/** A deck seed: resolved oracle_ids plus a display label. */
export type DeckSeed = {
  readonly ids: readonly string[];
  readonly label: string;
};

/** A `--list-tags` match. */
export type TagListItem = {
  readonly description: string;
  readonly label: string;
  readonly slug: string;
};

/** Affinity inputs. Exactly one of `seedTag` / `deckSeed` must be provided. */
type AffinityParams = {
  readonly childLimit: number;
  readonly deckSeed?: DeckSeed;
  readonly depth: number;
  readonly id: string;
  readonly includeGameChangers: boolean;
  readonly limit: number;
  readonly minCount: number;
  readonly seedTag?: string;
  readonly sort: AffinitySort;
};

/** Discovery inputs. */
type DiscoverParams = {
  readonly deckNames: ReadonlySet<string>;
  readonly id: string;
  readonly includeGameChangers: boolean;
  readonly limit: number;
  readonly maxPrice?: number;
  readonly set?: string;
  readonly slug: string;
};

/** Discovery output: the resolved tag plus ranked candidates. */
type DiscoverResult = {
  readonly candidates: Candidate[];
  readonly tag: TagRow;
};

/** Result rows from the read-only `deck sql` passthrough. */
type SqlResult = {
  readonly columns: string[];
  readonly rows: Record<string, unknown>[];
};

/** `--synergy` output. */
type SynergyResult = {
  readonly children: SynergyTag[];
  readonly parents: SynergyTag[];
  readonly tag: TagRow;
};

/** A `--synergy` neighbour tag. */
type SynergyTag = { readonly description: string; readonly slug: string };

/**
 * Rank the tags that co-occur with a theme ("affinity"). The theme (seed) is either a tag or
 * a deck's cards; the universe is every card passing the color-identity / Game-Changer filters.
 * Universe base rates are computed once and reused for the optional depth-2 drill-down.
 * @param db - An open database.
 * @param params - {@link AffinityParams}.
 * @returns The resolved seed plus ranked co-tags, or a {@link DbError}.
 */
export function affinity(
  db: Database,
  params: AffinityParams,
): Result<AffinityResult, DbError> {
  const reqMask = colorMask([...params.id.toUpperCase()]);
  const univWhere = params.includeGameChangers
    ? "(c.ci_mask & ~$reqMask) = 0"
    : "c.game_changer = 0 AND (c.ci_mask & ~$reqMask) = 0";
  const univBind = { $reqMask: reqMask };

  const univN =
    db
      .query<{ n: number }, typeof univBind>(
        `SELECT COUNT(*) n FROM cards c WHERE ${univWhere}`,
      )
      .get(univBind)?.n ?? 0;
  if (univN === 0) {
    return err(dbError(`no cards in the universe — check --id "${params.id}"`));
  }

  const univCounts = new Map<string, number>();
  for (const row of db
    .query<{ slug: string; uc: number }, typeof univBind>(
      `SELECT t.slug, COUNT(DISTINCT c.oracle_id) uc FROM cards c
       JOIN card_tags ct ON ct.oracle_id = c.oracle_id
       JOIN tags t ON t.id = ct.tag_id
       WHERE ${univWhere} GROUP BY t.slug`,
    )
    .all(univBind)) {
    univCounts.set(row.slug, row.uc);
  }

  const exclude = new Set<string>();
  let seedCounts: Map<string, number>;
  let seedN: number;
  let seedLabel: string;
  if (params.seedTag !== undefined) {
    const tag = getTagBySlug(db, params.seedTag);
    if (tag === null) {
      return err(
        dbError(
          `no tag with slug "${params.seedTag}" — try \`bun run deck tags ${params.seedTag}\``,
        ),
      );
    }
    seedCounts = seedCountsForTag(db, univWhere, univBind, tag.slug);
    seedN = univCounts.get(tag.slug) ?? 0;
    seedLabel = `otag:${tag.slug}`;
    exclude.add(tag.slug);
  } else if (params.deckSeed === undefined) {
    return err(dbError("affinity needs a seed tag or a deck"));
  } else {
    const resolved = seedCountsForIds(
      db,
      univWhere,
      univBind,
      params.deckSeed.ids,
    );
    seedCounts = resolved.counts;
    seedN = resolved.n;
    seedLabel = params.deckSeed.label;
  }
  if (seedN === 0) {
    return err(dbError("the seed is empty after the color-identity filter"));
  }

  const rankOpts = {
    limit: params.limit,
    minCount: params.minCount,
    sort: params.sort,
  };
  const firstOrder = rankAffinity(
    toRawCounts(seedCounts, univCounts),
    seedN,
    univN,
    { ...rankOpts, exclude },
  );

  const rows: AffinityNode[] = firstOrder.map((node) => {
    if (params.depth < 2) return { ...node, children: [] };
    const childCounts = seedCountsForTag(db, univWhere, univBind, node.slug);
    const children = rankAffinity(
      toRawCounts(childCounts, univCounts),
      univCounts.get(node.slug) ?? 0,
      univN,
      {
        ...rankOpts,
        exclude: new Set([node.slug, ...exclude]),
        limit: params.childLimit,
      },
    );
    return { ...node, children };
  });

  return ok({ rows, seedLabel, seedN, univN });
}

/**
 * All tags ordered by slug, for regenerating the committed `reference/oracle-tags.txt`.
 * @param db - An open database.
 * @returns Every {@link TagRow}, ordered by slug.
 */
export function allTagsBySlug(db: Database): TagRow[] {
  return db.query<TagRow, []>("SELECT * FROM tags ORDER BY slug").all();
}

/** Resolve an ingested deck's non-null card oracle_ids (for use as an affinity seed). */
export function deckOracleIds(db: Database, slug: string): string[] {
  return db
    .query<{ oracle_id: string }, [string]>(
      "SELECT DISTINCT oracle_id FROM deck_cards WHERE deck_slug = ? AND oracle_id IS NOT NULL",
    )
    .all(slug)
    .map((row) => row.oracle_id);
}

/**
 * Discover cards carrying a function tag, filtered by color identity, price, set, and
 * Game-Changer status, ranked by EDHREC popularity.
 * @param db - An open database.
 * @param params - {@link DiscoverParams}.
 * @returns The resolved tag + ranked candidates, or a {@link DbError} if the slug is unknown.
 */
export function discover(
  db: Database,
  params: DiscoverParams,
): Result<DiscoverResult, DbError> {
  const tag = getTagBySlug(db, params.slug);
  if (tag === null) {
    return err(
      dbError(
        `no tag with slug "${params.slug}" — try \`bun run deck tags ${params.slug}\` to find valid slugs`,
      ),
    );
  }

  const reqMask = colorMask([...params.id.toUpperCase()]);
  const clauses = ["ct.tag_id = $tagId", "(c.ci_mask & ~$reqMask) = 0"];
  const bindings: Record<string, number | string> = {
    $reqMask: reqMask,
    $tagId: tag.id,
  };
  if (!params.includeGameChangers) clauses.push("c.game_changer = 0");
  if (params.maxPrice !== undefined) {
    clauses.push("c.price_usd IS NOT NULL AND c.price_usd <= $maxPrice");
    bindings.$maxPrice = params.maxPrice;
  }
  if (params.set !== undefined) {
    clauses.push("c.set_code = $setCode");
    bindings.$setCode = params.set.toLowerCase();
  }

  const rows = db
    .query<CardRow, typeof bindings>(
      `SELECT c.* FROM cards c
       JOIN card_tags ct ON ct.oracle_id = c.oracle_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY c.edhrec_rank IS NULL, c.edhrec_rank ASC, c.name ASC`,
    )
    .all(bindings);

  const candidates: Candidate[] = [];
  for (const row of rows) {
    const owned = params.deckNames.has(row.name_lower);
    candidates.push({
      cmc: row.cmc,
      edhrecRank: row.edhrec_rank,
      name: row.name,
      owned,
      priceUsd: row.price_usd,
      typeLine: row.type_line,
    });
    if (
      candidates.filter((candidate) => !candidate.owned).length >= params.limit
    )
      break;
  }

  return ok({ candidates, tag });
}

/** Co-occurrence counts for every tag among the universe cards in `ids`, plus the seed size. */
function seedCountsForIds(
  db: Database,
  univWhere: string,
  univBind: { $reqMask: number },
  ids: readonly string[],
): { counts: Map<string, number>; n: number } {
  const bind = { ...univBind, $ids: JSON.stringify(ids) };
  const n =
    db
      .query<{ n: number }, typeof bind>(
        `SELECT COUNT(DISTINCT c.oracle_id) n FROM cards c
         JOIN json_each($ids) j ON j.value = c.oracle_id
         WHERE ${univWhere}`,
      )
      .get(bind)?.n ?? 0;
  const counts = new Map<string, number>();
  for (const row of db
    .query<{ sc: number; slug: string }, typeof bind>(
      `SELECT t.slug, COUNT(DISTINCT c.oracle_id) sc FROM cards c
       JOIN json_each($ids) j ON j.value = c.oracle_id
       JOIN card_tags ct ON ct.oracle_id = c.oracle_id
       JOIN tags t ON t.id = ct.tag_id
       WHERE ${univWhere} GROUP BY t.slug`,
    )
    .all(bind)) {
    counts.set(row.slug, row.sc);
  }
  return { counts, n };
}

/** Co-occurrence counts for every tag among the universe cards carrying `slug`. */
function seedCountsForTag(
  db: Database,
  univWhere: string,
  univBind: { $reqMask: number },
  slug: string,
): Map<string, number> {
  const counts = new Map<string, number>();
  const rows = db
    .query<{ sc: number; slug: string }, { $reqMask: number; $slug: string }>(
      `SELECT t2.slug, COUNT(DISTINCT ct2.oracle_id) sc FROM card_tags ct1
       JOIN cards c ON c.oracle_id = ct1.oracle_id AND ${univWhere}
       JOIN card_tags ct2 ON ct2.oracle_id = ct1.oracle_id
       JOIN tags t1 ON t1.id = ct1.tag_id
       JOIN tags t2 ON t2.id = ct2.tag_id
       WHERE t1.slug = $slug GROUP BY t2.slug`,
    )
    .all({ ...univBind, $slug: slug });
  for (const row of rows) counts.set(row.slug, row.sc);
  return counts;
}

/** Join per-tag seed counts against the universe base counts into {@link RawTagCount}s. */
function toRawCounts(
  seedCounts: ReadonlyMap<string, number>,
  univCounts: ReadonlyMap<string, number>,
): RawTagCount[] {
  const raw: RawTagCount[] = [];
  for (const [slug, seedCount] of seedCounts) {
    raw.push({ seedCount, slug, univCount: univCounts.get(slug) ?? seedCount });
  }
  return raw;
}

/**
 * SQL that resolves a clean card name to a row, matching either the full stored name or the
 * front face of a double-faced card (whose stored name is `Front // Back`). Exact matches win.
 */
const RESOLVE_NAME_SQL = `SELECT * FROM cards
   WHERE name_lower = ?1 OR name_lower LIKE ?1 || ' // %'
   ORDER BY (name_lower = ?1) DESC, edhrec_rank IS NULL, edhrec_rank ASC
   LIMIT 1`;

/** One row of `deck cards <slug>`: the deck card plus its resolved corpus tags. */
export type DeckCardRow = {
  readonly corpusTags: string[];
  readonly count: number;
  readonly inlineTags: string[];
  readonly isCommander: boolean;
  readonly name: string;
  readonly resolved: boolean;
};

/**
 * Ingest a decklist into the `decks` + `deck_cards` tables, resolving each card to an
 * oracle_id where possible. Replaces any existing rows for the same deck slug.
 * @param db - A writable database.
 * @param deck - The deck's slug, display name, source path, and parsed entries.
 * @returns The number of ingested card rows.
 */
/** Result of ingesting one deck: how many rows/cards resolved to the corpus. */
type IngestResult = {
  readonly inserted: number;
  readonly resolved: number;
  readonly unresolved: string[];
};

/**
 * The set of card names (lowercased) belonging to an ingested deck.
 * @param db - An open database.
 * @param slug - The deck slug.
 * @returns A set of lowercased card names for dedupe.
 */
export function deckCardNames(db: Database, slug: string): ReadonlySet<string> {
  const rows = db
    .query<{ name: string }, [string]>(
      "SELECT name FROM deck_cards WHERE deck_slug = ?",
    )
    .all(slug);
  return new Set(rows.map((row) => row.name.toLowerCase()));
}

/**
 * List a deck's cards with the function tags each card carries in the corpus (not just the
 * inline role tags from the decklist).
 * @param db - An open database.
 * @param slug - The deck slug.
 * @returns One {@link DeckCardRow} per card, or a {@link DbError} if the deck isn't ingested.
 */
export function deckCards(
  db: Database,
  slug: string,
): Result<DeckCardRow[], DbError> {
  if (!deckExists(db, slug)) {
    return err(
      dbError(`deck "${slug}" is not in the database — run build-db first`),
    );
  }
  const rows = db
    .query<
      {
        count: number;
        is_commander: number;
        name: string;
        oracle_id: null | string;
        tags: string;
      },
      [string]
    >(
      `SELECT name, count, oracle_id, tags, is_commander
       FROM deck_cards WHERE deck_slug = ? ORDER BY is_commander DESC, name ASC`,
    )
    .all(slug);
  const tagStmt = db.query<{ slug: string }, [string]>(
    `SELECT t.slug FROM card_tags ct JOIN tags t ON t.id = ct.tag_id
     WHERE ct.oracle_id = ? ORDER BY t.slug`,
  );
  return ok(
    rows.map((row) => ({
      corpusTags:
        row.oracle_id === null
          ? []
          : tagStmt.all(row.oracle_id).map((tag) => tag.slug),
      count: row.count,
      inlineTags: JSON.parse(row.tags) as string[],
      isCommander: row.is_commander === 1,
      name: row.name,
      resolved: row.oracle_id !== null,
    })),
  );
}

/**
 * Whether a deck slug has been ingested into the `decks` table.
 * @param db - An open database.
 * @param slug - The deck slug (folder name).
 * @returns `true` if the deck exists.
 */
export function deckExists(db: Database, slug: string): boolean {
  return (
    db
      .query<{ slug: string }, [string]>(
        "SELECT slug FROM decks WHERE slug = ?",
      )
      .get(slug) !== null
  );
}

/**
 * Look up a single card by name (case-insensitive), including double-faced front names.
 * @param db - An open database.
 * @param name - The clean card name.
 * @returns The {@link CardRow}, or `null` if not found.
 */
export function getCard(db: Database, name: string): CardRow | null {
  return db.query<CardRow, [string]>(RESOLVE_NAME_SQL).get(name.toLowerCase());
}

/**
 * Resolve a set of card names (case-insensitive) to their rows, including double-faced
 * front names.
 * @param db - An open database.
 * @param names - Clean card names to resolve.
 * @returns A map from lowercased name to {@link CardRow} for the names that were found.
 */
export function getCardsByNames(
  db: Database,
  names: readonly string[],
): Map<string, CardRow> {
  const found = new Map<string, CardRow>();
  const stmt = db.query<CardRow, [string]>(RESOLVE_NAME_SQL);
  for (const name of names) {
    const row = stmt.get(name.toLowerCase());
    if (row !== null) found.set(name.toLowerCase(), row);
  }
  return found;
}

export function ingestDeck(
  db: Database,
  deck: {
    commander: null | string;
    entries: readonly DeckEntry[];
    name: string;
    path: string;
    slug: string;
  },
): IngestResult {
  const cardCount = deck.entries.reduce((sum, entry) => sum + entry.count, 0);
  const commanderLower = deck.commander?.toLowerCase() ?? null;
  const tx = db.transaction((): IngestResult => {
    db.run("DELETE FROM deck_cards WHERE deck_slug = ?", [deck.slug]);
    db.run("DELETE FROM decks WHERE slug = ?", [deck.slug]);
    db.query(
      `INSERT INTO decks (slug, name, commander, path, card_count)
       VALUES ($slug, $name, $commander, $path, $count)`,
    ).run({
      $commander: deck.commander,
      $count: cardCount,
      $name: deck.name,
      $path: deck.path,
      $slug: deck.slug,
    });
    const lookup = db.query<{ oracle_id: string }, [string]>(
      `SELECT oracle_id FROM cards
       WHERE name_lower = ?1 OR name_lower LIKE ?1 || ' // %'
       ORDER BY (name_lower = ?1) DESC, edhrec_rank IS NULL, edhrec_rank ASC
       LIMIT 1`,
    );
    const insert = db.query(
      `INSERT INTO deck_cards (deck_slug, oracle_id, name, count, tags, is_commander)
       VALUES ($deck, $oracle, $name, $count, $tags, $isCommander)`,
    );
    let inserted = 0;
    let resolved = 0;
    const unresolved: string[] = [];
    for (const entry of deck.entries) {
      const match = lookup.get(entry.name.toLowerCase());
      const isCommander =
        entry.name.toLowerCase() === commanderLower ||
        entry.tags.includes("commander");
      insert.run({
        $count: entry.count,
        $deck: deck.slug,
        $isCommander: isCommander ? 1 : 0,
        $name: entry.name,
        $oracle: match?.oracle_id ?? null,
        $tags: JSON.stringify(entry.tags),
      });
      inserted += 1;
      if (match === null) unresolved.push(entry.name);
      else resolved += 1;
    }
    return { inserted, resolved, unresolved };
  });
  return tx();
}

/**
 * Search the tag catalog by slug, label, or alias substring.
 * @param db - An open database.
 * @param substr - The substring to match (case-insensitive).
 * @returns Matching tags (slug/label/description), ordered by slug, capped at 100.
 */
export function listTags(db: Database, substr: string): TagListItem[] {
  const like = `%${substr.toLowerCase()}%`;
  return db
    .query<TagListItem, [string, string, string]>(
      `SELECT slug, label, description FROM tags
       WHERE lower(slug) LIKE ? OR lower(label) LIKE ? OR lower(aliases) LIKE ?
       ORDER BY slug LIMIT 100`,
    )
    .all(like, like, like);
}

/**
 * Open the local SQLite cache.
 * @param path - Path to the database file.
 * @param readonly - Open read-only (default `true`); write mode is for ingestion.
 * @returns The open {@link Database}, or a {@link DbError} if the file is missing.
 */
export function openDatabase(
  path: string,
  readonly = true,
): Result<Database, DbError> {
  if (readonly && !existsSync(path)) {
    return err(
      dbError(
        `database not found at ${path} — run \`bun run deck build-db\` first`,
      ),
    );
  }
  try {
    return ok(
      new Database(path, readonly ? { readonly: true } : { create: true }),
    );
  } catch (error) {
    return err(dbError(String(error)));
  }
}

/**
 * Execute a single read-only SQL statement against the cache (the `deck sql` passthrough).
 * @param db - An open (ideally read-only) database.
 * @param sql - The user-supplied SQL; must be a lone SELECT/WITH/EXPLAIN.
 * @returns The column names + result rows, or a {@link DbError} if the SQL is unsafe/invalid.
 */
export function runReadOnlySql(
  db: Database,
  sql: string,
): Result<SqlResult, DbError> {
  if (!isReadOnlySql(sql)) {
    return err(
      dbError(
        "only a single read-only SELECT/WITH/EXPLAIN statement is allowed",
      ),
    );
  }
  try {
    const rows = db.query(sql).all() as Record<string, unknown>[];
    const columns = rows.length > 0 ? Object.keys(rows[0] as object) : [];
    return ok({ columns, rows });
  } catch (error) {
    return err(dbError(String(error)));
  }
}

/**
 * Full-text search over card names and oracle text (FTS5).
 * @param db - An open database.
 * @param matchQuery - A sanitised FTS5 MATCH expression (see `ftsMatchQuery`).
 * @param limit - Maximum rows to return.
 * @returns Matching cards, best-ranked first.
 */
export function searchText(
  db: Database,
  matchQuery: string,
  limit: number,
): CardRow[] {
  return db
    .query<CardRow, [string, number]>(
      `SELECT c.* FROM cards_fts f
       JOIN cards c ON c.oracle_id = f.oracle_id
       WHERE cards_fts MATCH ?
       ORDER BY c.edhrec_rank IS NULL, c.edhrec_rank ASC
       LIMIT ?`,
    )
    .all(matchQuery, limit);
}

/**
 * Resolve a tag's parent (broader) and child (narrower) tags from the Tagger taxonomy.
 * @param db - An open database.
 * @param slug - The tag slug to navigate from.
 * @returns The tag with its neighbours, or a {@link DbError} if the slug is unknown.
 */
export function synergy(
  db: Database,
  slug: string,
): Result<SynergyResult, DbError> {
  const tag = getTagBySlug(db, slug);
  if (tag === null) {
    return err(
      dbError(`no tag with slug "${slug}" — try \`bun run deck tags ${slug}\``),
    );
  }
  const resolveIds = (json: string): SynergyTag[] => {
    const ids = JSON.parse(json) as string[];
    const out: SynergyTag[] = [];
    const stmt = db.query<{ description: string; slug: string }, [string]>(
      "SELECT slug, description FROM tags WHERE id = ? LIMIT 1",
    );
    for (const id of ids) {
      const row = stmt.get(id);
      if (row !== null)
        out.push({ description: row.description, slug: row.slug });
    }
    return out.sort((a, b) => a.slug.localeCompare(b.slug));
  };
  return ok({
    children: resolveIds(tag.child_ids),
    parents: resolveIds(tag.parent_ids),
    tag,
  });
}

function getTagBySlug(db: Database, slug: string): null | TagRow {
  return db
    .query<TagRow, [string]>("SELECT * FROM tags WHERE slug = ? LIMIT 1")
    .get(slug.toLowerCase());
}
