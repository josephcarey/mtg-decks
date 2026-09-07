/**
 * `deck` CLI — subcommand dispatcher (node:util parseArgs). Sources everything from the local
 * SQLite bulk cache; run `fetch-bulk` then `build-db` first to populate it.
 *
 * Commands:
 *   fetch-bulk                      download the Scryfall bulk exports into data/
 *   build-db                        build data/mtg.db from the bulk exports + ingest decks/
 *   analyze <decklist>              report card count/curve/pips/basics/price/tags + GC/identity lint
 *   discover <slug> [opts]          find tagged cards (color/price/set filters, EDHREC-ranked)
 *   price <deck> [--over][--top]    budget report: total, proxy candidates, priciest cards
 *   card <name>                     print one card's pinned text from the cache
 *   cards <deck-slug>               list a deck's cards with their resolved corpus tags
 *   search <query>                  full-text (FTS5) search over card names + oracle text
 *   tags <substr>                   search the tag catalog (slug/label/alias)
 *   synergy <slug>                  show a tag's parent/child tags
 *   sql <query>                     run a single read-only SELECT against the cache
 *   gen-reference [--deck <path>]   regenerate reference/oracle-tags.txt + card cache
 */
import type { Database } from "bun:sqlite";

import { mkdir, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { parseArgs } from "node:util";

import type { AnalyzedCard, IdentityViolation, PricedCard } from "./analysis.ts";
import type { DeckEntry } from "./decklist.ts";
import type { BulkType } from "./scryfall/bulk.ts";

import {
  computeCurve,
  computePips,
  fetchVsBasics,
  priceBreakdown,
  tagDistribution,
} from "./analysis.ts";
import {
  DEFAULT_DB_PATH,
  DEFAULT_DISCOVER_ID,
  DEFAULT_DISCOVER_LIMIT,
  DEFAULT_PRICE_TOP,
  DEFAULT_PROXY_THRESHOLD_USD,
} from "./constants.ts";
import { ciSubsetOf, ftsMatchQuery } from "./db/model.ts";
import {
  allTagsBySlug,
  deckCardNames,
  deckCards,
  deckExists,
  discover,
  getCard,
  getCardsByNames,
  ingestDeck,
  listTags,
  openDatabase,
  runReadOnlySql,
  searchText,
  synergy,
} from "./db/queries.ts";
import { buildDb } from "./db/schema.ts";
import { deckNameSet, parseDecklist, totalCount } from "./decklist.ts";
import {
  cardKnowledgeFromRow,
  formatCardCacheMarkdown,
  formatOracleTagsFile,
} from "./reference.ts";
import {
  formatBasics,
  formatCount,
  formatCurve,
  formatDeckCards,
  formatDiscoverTable,
  formatGameChangerLint,
  formatIdentityLint,
  formatPips,
  formatPrice,
  formatPriceReport,
  formatTagDistribution,
  formatTagList,
} from "./report.ts";
import { bulkPath, downloadBulk, resolveBulkUri } from "./scryfall/bulk.ts";

const DECKS_DIR = "decks";
const REFERENCE_TAGS_PATH = "reference/oracle-tags.txt";
const BULK_TYPES: readonly BulkType[] = ["oracle_cards", "oracle_tags"];

const out = (line: string): void => {
  process.stdout.write(`${line}\n`);
};
const fail = (message: string): void => {
  process.stderr.write(`error: ${message}\n`);
  process.exitCode = 1;
};

const OPTIONS = {
  deck: { type: "string" },
  id: { type: "string" },
  "include-gamechangers": { type: "boolean" },
  limit: { type: "string" },
  "max-price": { type: "string" },
  over: { type: "string" },
  set: { type: "string" },
  top: { type: "string" },
} as const;

type OptionValues = Partial<Record<keyof typeof OPTIONS, boolean | string>>;

async function analyzeCommand(decklistPath: string | undefined): Promise<void> {
  if (decklistPath === undefined) {
    fail("usage: deck analyze <decklist.txt>");
    return;
  }
  const text = await Bun.file(decklistPath)
    .text()
    .catch(() => null);
  if (text === null) {
    fail(`cannot read decklist: ${decklistPath}`);
    return;
  }

  const entries = parseDecklist(text);
  out(`# Deck report — ${decklistPath}`);
  out(formatCount(totalCount(entries)));

  const dbResult = openDatabase(DEFAULT_DB_PATH);
  if (dbResult.isErr()) {
    out(formatTagDistribution(tagDistribution(entries)));
    out(formatBasics(fetchVsBasics(entries)));
    out(`\n(!) ${dbResult.error.message}`);
    out(
      "    Curve, pips, price, and the Game-Changer lint need the cache (run build-db).",
    );
    return;
  }
  const db = dbResult.value;
  try {
    const {
      cards,
      commanderIdentity,
      gameChangers,
      identityViolations,
      missing,
      priceUsd,
    } = toAnalyzedCards(entries, db, deckCommander(text));
    out(formatCurve(computeCurve(cards)));
    out(formatPips(computePips(cards)));
    out(formatBasics(fetchVsBasics(entries)));
    out(formatPrice(priceUsd, missing));
    out(formatTagDistribution(tagDistribution(entries)));
    out(formatGameChangerLint(gameChangers));
    out(formatIdentityLint(commanderIdentity, identityViolations));
  } finally {
    db.close();
  }
}

async function buildDbCommand(): Promise<void> {
  for (const type of BULK_TYPES) {
    if (!(await Bun.file(bulkPath(type)).exists())) {
      out(`bulk cache missing (${type}); downloading…`);
      const result = await downloadBulk(type);
      if (result.isErr()) {
        fail(result.error.message);
        return;
      }
    }
  }

  const dateResult = await resolveBulkUri("oracle_cards");
  const date = dateResult.isOk() ? dateResult.value.updatedAt : "unknown";

  out("Building data/mtg.db from the bulk cache…");
  const counts = await buildDb(
    DEFAULT_DB_PATH,
    bulkPath("oracle_cards"),
    bulkPath("oracle_tags"),
  );
  out(
    `  cards=${counts.cards}  tags=${counts.tags}  taggings=${counts.cardTags}  (bulk updated ${date})`,
  );

  const dbResult = openDatabase(DEFAULT_DB_PATH, false);
  if (dbResult.isErr()) {
    fail(dbResult.error.message);
    return;
  }
  const db = dbResult.value;
  try {
    let deckCount = 0;
    for (const path of await findDeckLists()) {
      const text = await Bun.file(path).text();
      const slug = basename(dirname(path));
      const entries = parseDecklist(text);
      const commander = deckCommander(text);
      const result = ingestDeck(db, {
        commander,
        entries,
        name: commander ?? slug,
        path,
        slug,
      });
      deckCount += 1;
      const warn =
        result.unresolved.length > 0
          ? ` — unresolved: ${result.unresolved.join(", ")}`
          : "";
      out(
        `  ingested deck "${slug}": ${result.inserted} rows, ${totalCount(entries)} cards; ` +
          `${result.resolved} resolved, ${result.unresolved.length} unresolved${warn}`,
      );
    }
    out(`Done. Ingested ${deckCount} deck(s).`);
  } finally {
    db.close();
  }
}

function cardCommand(name: string | undefined): void {
  if (name === undefined) {
    fail("usage: deck card <name>");
    return;
  }
  const dbResult = openDatabase(DEFAULT_DB_PATH);
  if (dbResult.isErr()) {
    fail(dbResult.error.message);
    return;
  }
  const db = dbResult.value;
  try {
    const row = getCard(db, name);
    if (row === null) {
      out(`(no card named "${name}")`);
      return;
    }
    const gc = row.game_changer === 1 ? " · ⚠ Game Changer" : "";
    out(`${row.name}  ${row.mana_cost}  (MV ${row.cmc})${gc}`);
    out(row.type_line);
    out(row.oracle_text.length > 0 ? row.oracle_text : "(no oracle text)");
  } finally {
    db.close();
  }
}

function cardsCommand(slug: string | undefined): void {
  if (slug === undefined) {
    fail("usage: deck cards <deck-slug>");
    return;
  }
  const dbResult = openDatabase(DEFAULT_DB_PATH);
  if (dbResult.isErr()) {
    fail(dbResult.error.message);
    return;
  }
  const db = dbResult.value;
  try {
    const result = deckCards(db, slug);
    if (result.isErr()) {
      fail(result.error.message);
      return;
    }
    out(formatDeckCards(slug, result.value));
  } finally {
    db.close();
  }
}

function deckCommander(text: string): null | string {
  const match = /^\/\/\s*Commander:\s*(.+)$/m.exec(text);
  if (match?.[1] === undefined) return null;
  // Strip any trailing annotation like " ({1}{U}{U}) — mono-U" to leave a clean card name.
  return match[1].replace(/\s+(?:\(|[—–-]\s).*$/, "").trim();
}

function deckDisplayName(text: string, slug: string): string {
  const match = /^\/\/\s*Commander:\s*(.+)$/m.exec(text);
  return match?.[1]?.trim() ?? slug;
}

async function discoverCommand(
  slug: string | undefined,
  values: OptionValues,
): Promise<void> {
  if (slug === undefined) {
    fail(
      "usage: deck discover <slug> [--id gu] [--set] [--max-price] [--limit] [--deck <slug|path>]",
    );
    return;
  }
  const dbResult = openDatabase(DEFAULT_DB_PATH);
  if (dbResult.isErr()) {
    fail(dbResult.error.message);
    return;
  }
  const db = dbResult.value;
  try {
    const deckNames = await resolveDeckNames(db, values.deck);
    const maxPriceRaw = values["max-price"];
    const limitRaw = values.limit;
    const result = discover(db, {
      deckNames,
      id: typeof values.id === "string" ? values.id : DEFAULT_DISCOVER_ID,
      includeGameChangers: values["include-gamechangers"] === true,
      limit:
        typeof limitRaw === "string"
          ? Number.parseInt(limitRaw, 10)
          : DEFAULT_DISCOVER_LIMIT,
      maxPrice:
        typeof maxPriceRaw === "string"
          ? Number.parseFloat(maxPriceRaw)
          : undefined,
      set: typeof values.set === "string" ? values.set : undefined,
      slug,
    });
    if (result.isErr()) {
      fail(result.error.message);
      return;
    }
    out(
      formatDiscoverTable(
        result.value.tag.slug,
        result.value.tag.description,
        result.value.candidates,
      ),
    );
  } finally {
    db.close();
  }
}

async function fetchBulk(): Promise<void> {
  for (const type of BULK_TYPES) {
    const result = await downloadBulk(type);
    if (result.isErr()) {
      fail(result.error.message);
      return;
    }
    const mb = (result.value.bytes / 1_000_000).toFixed(1);
    out(
      `${type}: ${mb} MB → ${result.value.path} (updated ${result.value.updatedAt})`,
    );
  }
}

async function findDeckLists(): Promise<string[]> {
  const entries = await readdir(DECKS_DIR, { withFileTypes: true }).catch(
    () => [],
  );
  const lists: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory())
      lists.push(join(DECKS_DIR, entry.name, "list.txt"));
  }
  return lists;
}

async function genReferenceCommand(
  deckPath: string | undefined,
): Promise<void> {
  const dbResult = openDatabase(DEFAULT_DB_PATH);
  if (dbResult.isErr()) {
    fail(dbResult.error.message);
    return;
  }
  const db = dbResult.value;
  try {
    const dateResult = await resolveBulkUri("oracle_tags");
    const date = dateResult.isOk() ? dateResult.value.updatedAt : "unknown";

    const tagsFile = formatOracleTagsFile(allTagsBySlug(db), date);
    await mkdir(dirname(REFERENCE_TAGS_PATH), { recursive: true });
    await writeFile(REFERENCE_TAGS_PATH, tagsFile);
    out(`wrote ${REFERENCE_TAGS_PATH}`);

    const listPaths = deckPath ? [deckPath] : await findDeckLists();
    for (const listPath of listPaths) {
      const text = await Bun.file(listPath)
        .text()
        .catch(() => null);
      if (text === null) {
        fail(`cannot read decklist: ${listPath}`);
        continue;
      }
      const slug = basename(dirname(listPath));
      const entries = parseDecklist(text);
      const resolved = getCardsByNames(
        db,
        entries.map((entry) => entry.name),
      );
      const knowledge = entries
        .map((entry) => resolved.get(entry.name.toLowerCase()))
        .filter((row): row is NonNullable<typeof row> => row !== undefined)
        .map((row) => cardKnowledgeFromRow(row));
      const markdown = formatCardCacheMarkdown(
        deckDisplayName(text, slug),
        knowledge,
        date,
      );
      const cachePath = join("reference", "cards", `${slug}.md`);
      await mkdir(dirname(cachePath), { recursive: true });
      await writeFile(cachePath, markdown);
      out(
        `wrote ${cachePath} (${knowledge.length}/${entries.length} cards resolved)`,
      );
    }
  } finally {
    db.close();
  }
}

function parseOptions(argv: readonly string[]): {
  positionals: string[];
  values: OptionValues;
} {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args: [...argv],
    options: OPTIONS,
  });
  return { positionals, values };
}

async function priceCommand(
  deckArg: string | undefined,
  values: OptionValues,
): Promise<void> {
  if (deckArg === undefined) {
    fail("usage: deck price <deck-slug|decklist.txt> [--over USD] [--top N]");
    return;
  }
  const path = await resolveDecklistPath(deckArg);
  if (path === null) {
    fail(`cannot find a decklist for "${deckArg}" (tried the path and decks/<slug>/list.txt)`);
    return;
  }
  const threshold =
    typeof values.over === "string"
      ? Number.parseFloat(values.over)
      : DEFAULT_PROXY_THRESHOLD_USD;
  const top =
    typeof values.top === "string"
      ? Number.parseInt(values.top, 10)
      : DEFAULT_PRICE_TOP;

  const dbResult = openDatabase(DEFAULT_DB_PATH);
  if (dbResult.isErr()) {
    fail(dbResult.error.message);
    return;
  }
  const db = dbResult.value;
  try {
    const entries = parseDecklist(await Bun.file(path).text());
    const resolved = getCardsByNames(
      db,
      entries.map((entry) => entry.name),
    );
    const cards: PricedCard[] = entries.map((entry) => {
      const row = resolved.get(entry.name.toLowerCase());
      return {
        count: entry.count,
        name: row?.name ?? entry.name,
        priceUsd: row?.price_usd ?? null,
      };
    });
    out(formatPriceReport(path, priceBreakdown(cards, { threshold, top }), threshold));
  } finally {
    db.close();
  }
}

/** Resolve a `price`/analyze deck argument (a decklist path OR a known deck slug) to a path. */
async function resolveDecklistPath(arg: string): Promise<null | string> {
  if (await Bun.file(arg).exists()) return arg;
  const slugPath = join(DECKS_DIR, arg, "list.txt");
  if (await Bun.file(slugPath).exists()) return slugPath;
  return null;
}

/**
 * Resolve the `--deck` argument (a known deck slug OR a decklist file path) to the set of
 * lowercased card names used to dedupe discovery results.
 */
async function resolveDeckNames(
  db: Database,
  deckArg: boolean | string | undefined,
): Promise<ReadonlySet<string>> {
  if (typeof deckArg !== "string") return new Set();
  if (deckExists(db, deckArg)) return deckCardNames(db, deckArg);
  const deckText = await Bun.file(deckArg)
    .text()
    .catch(() => "");
  return deckNameSet(parseDecklist(deckText));
}

async function run(argv: readonly string[]): Promise<void> {
  const [command, ...rest] = argv;
  const { positionals, values } = parseOptions(rest);

  switch (command) {
    case "analyze": {
      await analyzeCommand(positionals[0]);
      return;
    }
    case "build-db": {
      await buildDbCommand();
      return;
    }
    case "card": {
      cardCommand(positionals[0]);
      return;
    }
    case "cards": {
      cardsCommand(positionals[0]);
      return;
    }
    case "discover": {
      await discoverCommand(positionals[0], values);
      return;
    }
    case "fetch-bulk": {
      await fetchBulk();
      return;
    }
    case "gen-reference": {
      await genReferenceCommand(
        typeof values.deck === "string" ? values.deck : undefined,
      );
      return;
    }
    case "price": {
      await priceCommand(positionals[0], values);
      return;
    }
    case "search": {
      searchCommand(positionals[0]);
      return;
    }
    case "sql": {
      sqlCommand(positionals[0]);
      return;
    }
    case "synergy": {
      synergyCommand(positionals[0]);
      return;
    }
    case "tags": {
      tagsCommand(positionals[0]);
      return;
    }
    default: {
      out(
        "Usage: deck <fetch-bulk|build-db|analyze|discover|price|card|cards|search|tags|synergy|sql|gen-reference> [...]",
      );
      if (command !== undefined && command !== "help") process.exitCode = 1;
    }
  }
}

function searchCommand(query: string | undefined): void {
  if (query === undefined) {
    fail("usage: deck search <query>");
    return;
  }
  const match = ftsMatchQuery(query);
  if (match === null) {
    fail("empty or invalid search query");
    return;
  }
  const dbResult = openDatabase(DEFAULT_DB_PATH);
  if (dbResult.isErr()) {
    fail(dbResult.error.message);
    return;
  }
  const db = dbResult.value;
  try {
    const rows = searchText(db, match, DEFAULT_DISCOVER_LIMIT);
    if (rows.length === 0) {
      out("(no matches)");
      return;
    }
    for (const row of rows)
      out(`${row.name}  (MV ${row.cmc})  ${row.type_line}`);
  } finally {
    db.close();
  }
}

function sqlCommand(query: string | undefined): void {
  if (query === undefined) {
    fail('usage: deck sql "<select …>"');
    return;
  }
  const dbResult = openDatabase(DEFAULT_DB_PATH);
  if (dbResult.isErr()) {
    fail(dbResult.error.message);
    return;
  }
  const db = dbResult.value;
  try {
    const result = runReadOnlySql(db, query);
    if (result.isErr()) {
      fail(result.error.message);
      return;
    }
    if (result.value.rows.length === 0) {
      out("(no rows)");
      return;
    }
    out(result.value.columns.join(" | "));
    for (const row of result.value.rows) {
      out(
        result.value.columns
          .map((column) => String(row[column] ?? ""))
          .join(" | "),
      );
    }
  } finally {
    db.close();
  }
}

function synergyCommand(slug: string | undefined): void {
  if (slug === undefined) {
    fail("usage: deck synergy <slug>");
    return;
  }
  const dbResult = openDatabase(DEFAULT_DB_PATH);
  if (dbResult.isErr()) {
    fail(dbResult.error.message);
    return;
  }
  const db = dbResult.value;
  try {
    const result = synergy(db, slug);
    if (result.isErr()) {
      fail(result.error.message);
      return;
    }
    out(`otag:${result.value.tag.slug} — ${result.value.tag.description}`);
    out(`  parents (${result.value.parents.length}):`);
    for (const parent of result.value.parents)
      out(`    ${parent.slug} — ${parent.description}`);
    out(`  children (${result.value.children.length}):`);
    for (const child of result.value.children)
      out(`    ${child.slug} — ${child.description}`);
  } finally {
    db.close();
  }
}

function tagsCommand(substr: string | undefined): void {
  const dbResult = openDatabase(DEFAULT_DB_PATH);
  if (dbResult.isErr()) {
    fail(dbResult.error.message);
    return;
  }
  const db = dbResult.value;
  try {
    out(formatTagList(listTags(db, substr ?? "")));
  } finally {
    db.close();
  }
}

function toAnalyzedCards(
  entries: readonly DeckEntry[],
  db: Database,
  commanderName?: null | string,
): {
  cards: AnalyzedCard[];
  commanderIdentity: null | string;
  gameChangers: string[];
  identityViolations: IdentityViolation[];
  missing: number;
  priceUsd: number;
} {
  const resolved = getCardsByNames(
    db,
    entries.map((entry) => entry.name),
  );
  const commanderRow =
    typeof commanderName === "string"
      ? (resolved.get(commanderName.toLowerCase()) ?? getCard(db, commanderName))
      : null;
  const commanderIdentity = commanderRow?.color_identity ?? null;
  const cards: AnalyzedCard[] = [];
  const gameChangers: string[] = [];
  const identityViolations: IdentityViolation[] = [];
  let priceUsd = 0;
  let missing = 0;
  for (const entry of entries) {
    const row = resolved.get(entry.name.toLowerCase());
    if (row === undefined) {
      missing += 1;
      continue;
    }
    cards.push({
      cmc: row.cmc,
      count: entry.count,
      manaCost: row.mana_cost,
      name: row.name,
      typeLine: row.type_line,
    });
    if (row.game_changer === 1) gameChangers.push(row.name);
    if (row.price_usd !== null) priceUsd += row.price_usd * entry.count;
    if (
      commanderRow !== null &&
      !ciSubsetOf(row.ci_mask, commanderRow.ci_mask)
    ) {
      identityViolations.push({ identity: row.color_identity, name: row.name });
    }
  }
  return {
    cards,
    commanderIdentity,
    gameChangers,
    identityViolations,
    missing,
    priceUsd,
  };
}

await run(process.argv.slice(2));
