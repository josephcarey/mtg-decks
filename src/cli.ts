/**
 * `deck` CLI — subcommand dispatcher (node:util parseArgs). Sources everything from the local
 * SQLite bulk cache; run `fetch-bulk` then `build-db` first to populate it.
 *
 * Commands:
 *   fetch-bulk                      download the Scryfall bulk exports into data/
 *   build-db                        build data/mtg.db from the bulk exports + ingest decks/
 *   analyze <decklist>              report card count/curve/pips/basics/price/tags + GC lint
 *   discover <slug> [opts]          find tagged cards (color/price/set filters, EDHREC-ranked)
 *   affinity <tag>|--deck [opts]    rank co-occurring tags for a theme (share + lift, depth 2)
 *   edhrec <commander>|<deck> [opts] cross-reference EDHREC picks not already in the deck
 *   export <deck> [--format --out]  paste-ready decklist (moxfield keeps inline #tags)
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

import type { AffinitySort } from "./affinity.ts";
import type { AnalyzedCard } from "./analysis.ts";
import type { DeckSeed } from "./db/queries.ts";
import type { DeckEntry } from "./decklist.ts";
import type { BulkType } from "./scryfall/bulk.ts";

import {
  computeCurve,
  computePips,
  fetchVsBasics,
  tagDistribution,
} from "./analysis.ts";
import {
  DEFAULT_AFFINITY_CHILD_LIMIT,
  DEFAULT_AFFINITY_DEPTH,
  DEFAULT_AFFINITY_LIMIT,
  DEFAULT_AFFINITY_MIN_COUNT,
  DEFAULT_DB_PATH,
  DEFAULT_DISCOVER_ID,
  DEFAULT_DISCOVER_LIMIT,
} from "./constants.ts";
import { colorMask, ftsMatchQuery } from "./db/model.ts";
import {
  affinity,
  allTagsBySlug,
  deckCardNames,
  deckCards,
  deckExists,
  deckOracleIds,
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
import { fetchCommanderPage } from "./edhrec/client.ts";
import {
  crossReference,
  parseEdhrecPage,
  selectCardviews,
} from "./edhrec/model.ts";
import { EXPORT_FORMATS, formatExport, isExportFormat } from "./export.ts";
import {
  cardKnowledgeFromRow,
  formatCardCacheMarkdown,
  formatOracleTagsFile,
} from "./reference.ts";
import {
  formatAffinity,
  formatBasics,
  formatCount,
  formatCurve,
  formatDeckCards,
  formatDiscoverTable,
  formatEdhrec,
  formatGameChangerLint,
  formatPips,
  formatPrice,
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
  depth: { type: "string" },
  format: { type: "string" },
  id: { type: "string" },
  "include-gamechangers": { type: "boolean" },
  limit: { type: "string" },
  "max-price": { type: "string" },
  "min-count": { type: "string" },
  out: { type: "string" },
  set: { type: "string" },
  sort: { type: "string" },
} as const;

type OptionValues = Partial<Record<keyof typeof OPTIONS, boolean | string>>;

const intOption = (
  value: boolean | string | undefined,
  fallback: number,
): number => {
  if (typeof value !== "string") return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

async function affinityCommand(
  seedArg: string | undefined,
  values: OptionValues,
): Promise<void> {
  const deckArg = typeof values.deck === "string" ? values.deck : undefined;
  if (seedArg === undefined && deckArg === undefined) {
    fail(
      "usage: deck affinity <seed-tag> | --deck <slug|path> " +
        "[--id wubrg] [--sort lift|share|count] [--min-count 5] [--limit 25] [--depth 1|2]",
    );
    return;
  }
  const sort = parseSort(values.sort);
  if (sort === null) {
    fail(`invalid --sort "${String(values.sort)}" (use lift, share, or count)`);
    return;
  }
  const dbResult = openDatabase(DEFAULT_DB_PATH);
  if (dbResult.isErr()) {
    fail(dbResult.error.message);
    return;
  }
  const db = dbResult.value;
  try {
    const deckSeed =
      seedArg === undefined ? await resolveDeckSeed(db, deckArg) : undefined;
    if (seedArg === undefined && deckSeed === undefined) {
      fail(`could not resolve --deck "${String(deckArg)}" to any cards`);
      return;
    }
    const result = affinity(db, {
      childLimit: DEFAULT_AFFINITY_CHILD_LIMIT,
      deckSeed,
      depth: intOption(values.depth, DEFAULT_AFFINITY_DEPTH),
      id: typeof values.id === "string" ? values.id : "wubrg",
      includeGameChangers: values["include-gamechangers"] === true,
      limit: intOption(values.limit, DEFAULT_AFFINITY_LIMIT),
      minCount: intOption(values["min-count"], DEFAULT_AFFINITY_MIN_COUNT),
      seedTag: seedArg,
      sort,
    });
    if (result.isErr()) {
      fail(result.error.message);
      return;
    }
    out(formatAffinity(result.value, sort));
  } finally {
    db.close();
  }
}

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
    const { cards, gameChangers, missing, priceUsd } = toAnalyzedCards(
      entries,
      db,
    );
    out(formatCurve(computeCurve(cards)));
    out(formatPips(computePips(cards)));
    out(formatBasics(fetchVsBasics(entries)));
    out(formatPrice(priceUsd, missing));
    out(formatTagDistribution(tagDistribution(entries)));
    out(formatGameChangerLint(gameChangers));
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
  const name = match?.[1]?.trim();
  if (name === undefined) return null;
  // Drop a trailing annotation like " ({3}{W}{U}{B}, Esper)" so the name slugs cleanly.
  return name.replace(/\s*\(.*\)\s*$/, "").trim();
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

async function edhrecCommand(
  target: string | undefined,
  values: OptionValues,
): Promise<void> {
  if (target === undefined) {
    fail(
      "usage: deck edhrec <commander-name|deck-slug> [--deck <slug|path>] [--id wubrg] [--limit N] [--include-gamechangers]",
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
    let commanderName = target;
    let owned: ReadonlySet<string> = new Set();

    const deckText = await readDeckText(target);
    const headerCommander = deckText === null ? null : deckCommander(deckText);
    if (deckText !== null && headerCommander !== null) {
      commanderName = headerCommander;
      owned = deckNameSet(parseDecklist(deckText));
    }
    // Prefer the ingested deck's resolved commander card name — the free-form `// Commander:`
    // header may carry annotations (mana cost, archetype) that would corrupt the EDHREC slug.
    if (deckExists(db, target)) {
      const cards = deckCards(db, target);
      if (cards.isOk()) {
        const commander = cards.value.find((card) => card.isCommander);
        if (commander !== undefined) commanderName = commander.name;
        owned = deckCardNames(db, target);
      }
    }
    if (typeof values.deck === "string") {
      owned = await resolveDeckNames(db, values.deck);
    }

    const pageResult = await fetchCommanderPage(commanderName);
    if (pageResult.isErr()) {
      fail(pageResult.error.message);
      return;
    }
    const page = parseEdhrecPage(pageResult.value);
    if (page === null) {
      fail("could not parse EDHREC page (format may have changed)");
      return;
    }
    const cardviews = selectCardviews(page);
    const rows = getCardsByNames(
      db,
      cardviews.map((view) => view.name),
    );
    const commanderRow = getCard(db, commanderName);
    const idMask =
      typeof values.id === "string"
        ? colorMask([...values.id.toUpperCase()])
        : (commanderRow?.ci_mask ?? 0b1_1111);
    const recommendations = crossReference(cardviews, {
      idMask,
      includeGameChangers: values["include-gamechangers"] === true,
      limit: intOption(values.limit, DEFAULT_DISCOVER_LIMIT),
      owned,
      resolve: (nameLower) => rows.get(nameLower),
    });
    out(formatEdhrec(commanderName, recommendations));
  } finally {
    db.close();
  }
}

async function exportCommand(
  target: string | undefined,
  values: OptionValues,
): Promise<void> {
  if (target === undefined) {
    fail(
      `usage: deck export <deck-slug|path> [--format ${EXPORT_FORMATS.join("|")}] [--out <file>]`,
    );
    return;
  }
  const format = typeof values.format === "string" ? values.format : "text";
  if (!isExportFormat(format)) {
    fail(`invalid --format "${format}" (use ${EXPORT_FORMATS.join(", ")})`);
    return;
  }
  const text = await readDeckText(target);
  if (text === null) {
    fail(`cannot read decklist: ${target}`);
    return;
  }
  const entries = parseDecklist(text);
  const output = formatExport(entries, format);
  const outPath = typeof values.out === "string" ? values.out : undefined;
  if (outPath === undefined) {
    process.stdout.write(output);
    return;
  }
  await writeFile(outPath, output);
  out(`wrote ${outPath} (${String(entries.length)} lines, ${format})`);
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

    const listPath =
      deckPath ?? join(DECKS_DIR, "wandering-minstrel", "list.txt");
    const text = await Bun.file(listPath)
      .text()
      .catch(() => null);
    if (text === null) {
      fail(`cannot read decklist: ${listPath}`);
      return;
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

function parseSort(value: boolean | string | undefined): AffinitySort | null {
  if (value === undefined) return "lift";
  if (value === "count" || value === "lift" || value === "share") return value;
  return null;
}

/** Read a deck's decklist text from a slug (decks/<slug>/list.txt) or a direct file path. */
async function readDeckText(target: string): Promise<null | string> {
  const direct = await Bun.file(target)
    .text()
    .catch(() => null);
  if (direct !== null) return direct;
  return await Bun.file(join(DECKS_DIR, target, "list.txt"))
    .text()
    .catch(() => null);
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

/** Resolve `--deck` (an ingested slug or a decklist path) to a {@link DeckSeed}. */
async function resolveDeckSeed(
  db: Database,
  deckArg: string | undefined,
): Promise<DeckSeed | undefined> {
  if (deckArg === undefined) return undefined;
  if (deckExists(db, deckArg)) {
    const ids = deckOracleIds(db, deckArg);
    return ids.length > 0 ? { ids, label: `deck:${deckArg}` } : undefined;
  }
  const text = await Bun.file(deckArg)
    .text()
    .catch(() => "");
  if (text.length === 0) return undefined;
  const entries = parseDecklist(text);
  const resolved = getCardsByNames(
    db,
    entries.map((entry) => entry.name),
  );
  const ids = [...resolved.values()].map((row) => row.oracle_id);
  return ids.length > 0
    ? { ids, label: `deck:${basename(deckArg)}` }
    : undefined;
}

async function run(argv: readonly string[]): Promise<void> {
  const [command, ...rest] = argv;
  const { positionals, values } = parseOptions(rest);

  switch (command) {
    case "affinity": {
      await affinityCommand(positionals[0], values);
      return;
    }
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
    case "edhrec": {
      await edhrecCommand(positionals[0], values);
      return;
    }
    case "export": {
      await exportCommand(positionals[0], values);
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
        "Usage: deck <fetch-bulk|build-db|analyze|discover|affinity|edhrec|export|card|cards|search|tags|synergy|sql|gen-reference> [...]",
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
): {
  cards: AnalyzedCard[];
  gameChangers: string[];
  missing: number;
  priceUsd: number;
} {
  const resolved = getCardsByNames(
    db,
    entries.map((entry) => entry.name),
  );
  const cards: AnalyzedCard[] = [];
  const gameChangers: string[] = [];
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
  }
  return { cards, gameChangers, missing, priceUsd };
}

await run(process.argv.slice(2));
