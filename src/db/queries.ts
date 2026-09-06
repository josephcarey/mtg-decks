/**
 * SQLite query layer over the local bulk cache (`bun:sqlite`). Expected failures (missing
 * database, unknown tag, unsafe SQL) are returned as `neverthrow` Results; only genuinely
 * unrecoverable states throw. Pure predicates/transforms live in `./model.ts`.
 */
import { Database } from "bun:sqlite";
import { err, ok, type Result } from "neverthrow";
import { existsSync } from "node:fs";

import type { DeckEntry } from "../decklist.ts";
import type { CardRow, TagRow } from "./model.ts";

import { colorMask, isReadOnlySql } from "./model.ts";

/** A structured database-layer error. */
type DbError = { readonly kind: "db"; readonly message: string };

const dbError = (message: string): DbError => ({ kind: "db", message });

/** A discovery candidate card. */
export type Candidate = {
  readonly cmc: number;
  readonly edhrecRank: null | number;
  readonly name: string;
  readonly owned: boolean;
  readonly priceUsd: null | number;
  readonly typeLine: string;
};

/** A `--list-tags` match. */
export type TagListItem = {
  readonly description: string;
  readonly label: string;
  readonly slug: string;
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
 * All tags ordered by slug, for regenerating the committed `reference/oracle-tags.txt`.
 * @param db - An open database.
 * @returns Every {@link TagRow}, ordered by slug.
 */
export function allTagsBySlug(db: Database): TagRow[] {
  return db.query<TagRow, []>("SELECT * FROM tags ORDER BY slug").all();
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

/**
 * SQL that resolves a clean card name to a row, matching either the full stored name or the
 * front face of a double-faced card (whose stored name is `Front // Back`). Exact matches win.
 */
const RESOLVE_NAME_SQL = `SELECT * FROM cards
   WHERE name_lower = ?1 OR name_lower LIKE ?1 || ' // %'
   ORDER BY (name_lower = ?1) DESC, edhrec_rank IS NULL, edhrec_rank ASC
   LIMIT 1`;

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

/**
 * Ingest a decklist into the `decks` + `deck_cards` tables, resolving each card to an
 * oracle_id where possible. Replaces any existing rows for the same deck slug.
 * @param db - A writable database.
 * @param deck - The deck's slug, display name, source path, and parsed entries.
 * @returns The number of ingested card rows.
 */
export function ingestDeck(
  db: Database,
  deck: {
    entries: readonly DeckEntry[];
    name: string;
    path: string;
    slug: string;
  },
): number {
  const cardCount = deck.entries.reduce((sum, entry) => sum + entry.count, 0);
  const tx = db.transaction(() => {
    db.run("DELETE FROM deck_cards WHERE deck_slug = ?", [deck.slug]);
    db.run("DELETE FROM decks WHERE slug = ?", [deck.slug]);
    db.query(
      "INSERT INTO decks (slug, name, path, card_count) VALUES ($slug, $name, $path, $count)",
    ).run({
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
      `INSERT INTO deck_cards (deck_slug, oracle_id, name, count, tags)
       VALUES ($deck, $oracle, $name, $count, $tags)`,
    );
    let inserted = 0;
    for (const entry of deck.entries) {
      const match = lookup.get(entry.name.toLowerCase());
      insert.run({
        $count: entry.count,
        $deck: deck.slug,
        $name: entry.name,
        $oracle: match?.oracle_id ?? null,
        $tags: JSON.stringify(entry.tags),
      });
      inserted += 1;
    }
    return inserted;
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
