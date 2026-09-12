# Data recipes cookbook

Reusable recipes for the workspace's data layer, so no future session has to re-derive them.

## Scryfall search qualifiers

The normal Scryfall search API understands Tagger tags plus the usual filters:

- `otag:<slug>` (alias `function:`) — oracle/function tags describing **what a card does**,
  e.g. `otag:landfall`, `otag:"creates tokens"`, `otag:removal`.
- `arttag:<slug>` (alias `art:`) — art-depiction tags, e.g. `arttag:dragon` (tribal/themed).
- `id:<colors>` — color-identity filter (subset), e.g. `id:gu` for Simic-legal cards.
- `is:gamechanger` — the official Commander **Game Changers** list; use `-is:gamechanger` to
  exclude the banned cards in a search.
- `usd<=<n>` — price ceiling in USD.
- `order:edhrec` — rank by EDHREC popularity (what this workspace uses for discovery).

Example (verified): `otag:landfall id:gu -is:gamechanger order=edhrec` returns the deck's
payoff suite. A raw `otag:landfall` (no `-is:gamechanger`) includes Field of the Dead.

## Bulk-data workflow (preferred — offline & fast)

1. `GET https://api.scryfall.com/bulk-data/oracle_cards` and `.../oracle_tags` return JSON
   describing each export. The fields that matter:
   - `jsonl_download_uri` — dated URI to a **gzipped JSONL** file. It changes daily, so always
     resolve it fresh from the API; never hardcode it.
   - `updated_at` — the export date.
   - `compressed_size` — bytes.
2. Download both `.jsonl.gz` files into a gitignored `data/` directory.
3. **oracle_cards** (~38,600 cards). Per-card fields used here: `name`, `oracle_id`, `cmc`,
   `color_identity` (e.g. `["G","U"]`), `type_line`, `mana_cost`, `oracle_text`, `keywords`,
   `prices.usd`, `edhrec_rank`, and `game_changer` (boolean).
4. **oracle_tags** (~4,524 tags). Per-tag fields: `slug`, `label`, `description`, `type`
   (`"oracle"`), `parent_ids`, `child_ids`, `aliases`, and `taggings` — a list of
   `{ oracle_id, weight }`. **Join cards ↔ tags on `oracle_id`.**
5. `game_changer=true` on **exactly 53 cards** = the official Commander Game Changers list.
   Use this flag as the **authoritative guardrail** — no hand-maintained list needed.

This workspace builds a `bun:sqlite` database (`data/mtg.db`) from these two exports (see
`src/db/schema.ts`). Reading `.jsonl.gz` directly with `node:zlib` streaming is fine.

## Environment notes

- **Bun's native `fetch` works here** — no curl subprocess and no SSL workaround needed. (The
  historical SSL failures were specific to Python's `urllib`; that tooling has been removed.)
- The Scryfall **`/cards/collection`** endpoint accepts a **maximum of 75 identifiers per
  POST** — batch larger lookups.
- **Double-faced cards** are stored in the bulk export under their combined `Front // Back`
  name; decklists use the front-face name, so name resolution falls back to a
  `name_lower LIKE '<front> // %'` match.

## Tag affinity (sub-theme discovery)

`bun run deck affinity <tag>|--deck <slug|path>` ranks the tags that co-occur with a seed
theme, to surface natural **sub-themes**. Definitions (universe = all cards passing the
`--id` / Game-Changer filters; seed = universe cards matching the tag or deck):

- `share = seedCount / seedN` — fraction of the seed carrying the co-tag.
- `lift = share / (univCount / univN)` — enrichment vs. the universe base rate. Lift surfaces
  the _distinctive_ pairings; combine with `--min-count` to drop rare noise.

Base rates are constant for a given universe, so the CLI computes `univCount`/`univN` **once**
and reuses them for the depth-2 drill-down (each first-order tag re-seeds the same machinery).
The whole tag×tag co-occurrence is tiny (~832K nonzero pairs over ~4,533 tags), so the
self-join is milliseconds. The core primitive (co-occurrence for the universe cards carrying a
tag) is:

```sql
SELECT t2.slug, COUNT(DISTINCT ct2.oracle_id) sc FROM card_tags ct1
JOIN cards c ON c.oracle_id = ct1.oracle_id AND c.game_changer = 0 AND (c.ci_mask & ~:req) = 0
JOIN card_tags ct2 ON ct2.oracle_id = ct1.oracle_id
JOIN tags t1 ON t1.id = ct1.tag_id
JOIN tags t2 ON t2.id = ct2.tag_id
WHERE t1.slug = :seed GROUP BY t2.slug;
```

A deck seed swaps the `t1.slug` filter for `json_each(:oracleIds)` over the deck's resolved
`oracle_id`s. See `src/affinity.ts` (pure ranking) and `affinity()` in `src/db/queries.ts`.

## Manabase — sources per color (count duals, not just basics)

`deck analyze` reports pip demand (`[c]`) and lists only **basic** lands (`[d]`). Basics alone
understate fixing: dual/triome/flex lands already skew supply toward some colors, so balancing
basics-against-basics can look even while the real source counts are lopsided. Count **every land
as a source for each color it can produce** and compare to pip demand:

- Each dual → both its colors; triome / Command Tower / Exotic Orchard → all identity colors;
  MDFC pathway → both faces.
- Rule of thumb (Karsten): ~9–10 sources for a single-pip card, ~13–14 for a double-pip.
- The color with the highest pip share (the "workhorse") usually needs the basics tilted its way,
  because the multicolor lands tend to over-serve the other two colors.

Quick tally over a deck's lands (parse the produced-color symbols out of each land's oracle text;
handle Command Tower / Exotic Orchard / pathways specially):

```ts
// bun run <script>.ts  — sources per color for one deck
import { Database } from "bun:sqlite";
const db = new Database("data/mtg.db", { readonly: true });
const rows = db.query(
  `SELECT dc.count qty, c.name, c.oracle_text otext FROM deck_cards dc
   JOIN cards c ON c.oracle_id = dc.oracle_id
   WHERE dc.deck_slug = ?1 AND c.type_line LIKE '%Land%'`
).all("<deck-slug>") as { qty: number; name: string; otext: string }[];
const src: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
const basic: Record<string, string> = { Plains: "W", Island: "U", Swamp: "B", Mountain: "R", Forest: "G" };
for (const r of rows) {
  const colors = new Set<string>();
  if (basic[r.name]) colors.add(basic[r.name]);
  else if (r.name.startsWith("Command Tower") || r.name.startsWith("Exotic Orchard"))
    for (const c of "WUBRG") colors.add(c); // narrow to the deck's identity in practice
  else for (const c of "WUBRG") if ((r.otext ?? "").includes(`{${c}}`)) colors.add(c);
  // NB: pathways have empty oracle_text in bulk data — add their two faces by hand.
  for (const c of colors) src[c] += r.qty ?? 1;
}
console.log(src);
```

See `decks/riku-of-many-paths/notes.md` for a worked example (demand R49/G28/U22 vs. sources
R22/G19/U18 after tilting basics to 9 Mountain / 5 Forest / 3 Island).

## Tagger GraphQL (fallback — not preferred)

The full function-tag catalog is also reachable via the Tagger GraphQL API, but **bulk data is
preferred** (simpler, no auth). If ever needed:

1. `GET https://tagger.scryfall.com/` with a cookie jar; read the CSRF token from the
   `<meta name="csrf-token" content="...">` tag.
2. `POST https://tagger.scryfall.com/graphql` with headers `Content-Type: application/json`,
   `Accept: application/json`, `X-CSRF-Token: <token>`, and the cookie jar.
3. Query: `{ tags(input:{type:ORACLE_CARD_TAG, page:N}) { total results { name slug category } } }`.
   `type` is `ORACLE_CARD_TAG` (function tags) or `ILLUSTRATION_TAG` (art tags); 100 results per
   page. Rate-limited — sleep between pages and retry pages returned without a `data` field.
