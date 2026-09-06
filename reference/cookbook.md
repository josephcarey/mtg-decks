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
