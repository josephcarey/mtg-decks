/**
 * SQLite schema + builder. Streams the two Scryfall bulk JSONL(.gz) exports into a local
 * `bun:sqlite` database with indexes and an FTS5 index over oracle text.
 *
 * Uses `bun:sqlite` (Bun builtin; its bundled SQLite includes FTS5). All the pure row-mapping
 * logic lives in `./model.ts` so it can be unit-tested under Node; this file is the thin
 * Bun/DB boundary and is exercised via the CLI + manual verification rather than Vitest.
 */
import { Database } from "bun:sqlite";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";

import { buildCardRow, buildTagRow } from "./model.ts";

/** Record counts produced by a build. */
type BuildCounts = {
  readonly cards: number;
  readonly cardTags: number;
  readonly decks: number;
  readonly tags: number;
};

const SCHEMA = `
CREATE TABLE cards (
  oracle_id     TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  name_lower    TEXT NOT NULL,
  cmc           REAL NOT NULL,
  type_line     TEXT NOT NULL,
  mana_cost     TEXT NOT NULL,
  oracle_text   TEXT NOT NULL,
  color_identity TEXT NOT NULL,
  ci_mask       INTEGER NOT NULL,
  keywords      TEXT NOT NULL,
  price_usd     REAL,
  edhrec_rank   INTEGER,
  game_changer  INTEGER NOT NULL,
  set_code      TEXT NOT NULL
);
CREATE INDEX idx_cards_name_lower ON cards(name_lower);
CREATE INDEX idx_cards_edhrec ON cards(edhrec_rank);

CREATE TABLE tags (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL,
  label       TEXT NOT NULL,
  description TEXT NOT NULL,
  aliases     TEXT NOT NULL,
  parent_ids  TEXT NOT NULL,
  child_ids   TEXT NOT NULL
);
CREATE INDEX idx_tags_slug ON tags(slug);

CREATE TABLE card_tags (
  tag_id    TEXT NOT NULL,
  oracle_id TEXT NOT NULL,
  weight    TEXT
);
CREATE INDEX idx_card_tags_tag ON card_tags(tag_id);
CREATE INDEX idx_card_tags_oracle ON card_tags(oracle_id);

CREATE VIRTUAL TABLE cards_fts USING fts5(name, oracle_text, oracle_id UNINDEXED);

CREATE TABLE decks (
  slug       TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  commander  TEXT,
  path       TEXT NOT NULL,
  card_count INTEGER NOT NULL
);

CREATE TABLE deck_cards (
  deck_slug    TEXT NOT NULL,
  oracle_id    TEXT,
  name         TEXT NOT NULL,
  count        INTEGER NOT NULL,
  tags         TEXT NOT NULL,
  is_commander INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_deck_cards_deck ON deck_cards(deck_slug);
CREATE INDEX idx_deck_cards_oracle ON deck_cards(oracle_id);
`;

/**
 * Build (or rebuild) the SQLite database from the bulk JSONL(.gz) exports.
 * Any existing database at `dbPath` is replaced.
 * @param dbPath - Destination path for the SQLite file.
 * @param cardsPath - Path to the oracle_cards `.jsonl.gz` export.
 * @param tagsPath - Path to the oracle_tags `.jsonl.gz` export.
 * @returns Record counts for cards, tags, taggings, and decks (decks start at 0).
 */
export async function buildDb(
  dbPath: string,
  cardsPath: string,
  tagsPath: string,
): Promise<BuildCounts> {
  await Bun.file(dbPath)
    .delete()
    .catch(() => {});

  const db = new Database(dbPath, { create: true });
  try {
    db.run("PRAGMA journal_mode = WAL");
    db.run(SCHEMA);
    const cards = await loadCards(db, cardsPath);
    const { taggings, tags } = await loadTags(db, tagsPath);
    return { cards, cardTags: taggings, decks: 0, tags };
  } finally {
    db.close();
  }
}

async function* jsonlRecords(
  path: string,
): AsyncGenerator<Record<string, unknown>> {
  const stream = createReadStream(path).pipe(createGunzip());
  const lines = createInterface({
    crlfDelay: Number.POSITIVE_INFINITY,
    input: stream,
  });
  for await (const line of lines) {
    if (line.trim().length === 0) continue;
    yield JSON.parse(line) as Record<string, unknown>;
  }
}

function loadCards(db: Database, path: string): Promise<number> {
  const insert = db.query(
    `INSERT OR REPLACE INTO cards
       (oracle_id, name, name_lower, cmc, type_line, mana_cost, oracle_text,
        color_identity, ci_mask, keywords, price_usd, edhrec_rank, game_changer, set_code)
     VALUES ($oracle_id, $name, $name_lower, $cmc, $type_line, $mana_cost, $oracle_text,
        $color_identity, $ci_mask, $keywords, $price_usd, $edhrec_rank, $game_changer, $set_code)`,
  );
  const insertFts = db.query(
    `INSERT INTO cards_fts (name, oracle_text, oracle_id) VALUES ($name, $oracle_text, $oracle_id)`,
  );
  return runInTransaction(db, path, (record) => {
    const row = buildCardRow(record);
    if (row === null) return 0;
    insert.run({
      $ci_mask: row.ci_mask,
      $cmc: row.cmc,
      $color_identity: row.color_identity,
      $edhrec_rank: row.edhrec_rank,
      $game_changer: row.game_changer,
      $keywords: row.keywords,
      $mana_cost: row.mana_cost,
      $name: row.name,
      $name_lower: row.name_lower,
      $oracle_id: row.oracle_id,
      $oracle_text: row.oracle_text,
      $price_usd: row.price_usd,
      $set_code: row.set_code,
      $type_line: row.type_line,
    });
    insertFts.run({
      $name: row.name,
      $oracle_id: row.oracle_id,
      $oracle_text: row.oracle_text,
    });
    return 1;
  });
}

function loadTags(
  db: Database,
  path: string,
): Promise<{ taggings: number; tags: number }> {
  const insertTag = db.query(
    `INSERT OR REPLACE INTO tags (id, slug, label, description, aliases, parent_ids, child_ids)
     VALUES ($id, $slug, $label, $description, $aliases, $parent_ids, $child_ids)`,
  );
  const insertTagging = db.query(
    `INSERT INTO card_tags (tag_id, oracle_id, weight) VALUES ($tag_id, $oracle_id, $weight)`,
  );
  let taggings = 0;
  return runInTransaction(db, path, (record) => {
    const row = buildTagRow(record);
    if (row === null) return 0;
    insertTag.run({
      $aliases: row.aliases,
      $child_ids: row.child_ids,
      $description: row.description,
      $id: row.id,
      $label: row.label,
      $parent_ids: row.parent_ids,
      $slug: row.slug,
    });
    const raw = Array.isArray(record.taggings) ? record.taggings : [];
    for (const tagging of raw) {
      const oracleId = (tagging as { oracle_id?: unknown }).oracle_id;
      if (typeof oracleId !== "string") continue;
      const weight = (tagging as { weight?: unknown }).weight;
      insertTagging.run({
        $oracle_id: oracleId,
        $tag_id: row.id,
        $weight: typeof weight === "string" ? weight : null,
      });
      taggings += 1;
    }
    return 1;
  }).then((tags) => ({ taggings, tags }));
}

async function runInTransaction(
  db: Database,
  path: string,
  handle: (record: Record<string, unknown>) => number,
): Promise<number> {
  let inserted = 0;
  db.run("BEGIN");
  try {
    for await (const record of jsonlRecords(path)) {
      inserted += handle(record);
    }
    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }
  return inserted;
}
