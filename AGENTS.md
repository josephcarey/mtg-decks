# MTG Deck-Building Workspace — Agent Guide

## Stack / Tooling (TypeScript)

The workspace tooling is **TypeScript on [Bun](https://bun.sh)** (the earlier Python scripts
were removed). It follows the studio code standards: strict TS, functional style, ESLint
(unicorn/perfectionist/depend/security) + Prettier, knip, and Vitest with an 80% line-coverage
CI gate. Use `bun run ci` before every PR.

- **Data layer:** an offline **`bun:sqlite`** database (`data/mtg.db`, includes FTS5) built from
  Scryfall's daily **bulk-data** exports (`oracle_cards` + `oracle_tags`), joined on `oracle_id`.
  `data/` and `*.db` are gitignored. Native Bun `fetch` works here — **no curl/SSL workaround**.
- **The `game_changer` boolean** on each card (true on exactly 53 cards) is the **authoritative**
  Game Changers list. The analyzer lints against it — no hand-maintained list.
- **CLI** (`bun run deck <subcommand>`):
  - `fetch-bulk` / `build-db` — download the bulk exports and build/ingest the DB.
  - `analyze <decklist>` — count / curve / pips / lands / price / tag distribution + a
    Game-Changer lint (should report none).
  - `discover <slug> [--id gu] [--set] [--max-price] [--limit] [--include-gamechangers] [--deck]`
    — function-tag card discovery, color-identity-subset filtered, EDHREC-ranked; `--deck` accepts a
    known deck **slug** (deduped against the ingested `deck_cards`) or a decklist path, and skips
    owned cards. Game Changers excluded by default.
  - `affinity <tag>|--deck <slug|path> [--id wubrg] [--sort lift|share|count] [--min-count N]
[--limit N] [--depth 1|2] [--include-gamechangers]` — surface a theme's **sub-themes**: rank
    the tags co-occurring with a seed (a function tag OR a deck's cards) by **share** (fraction of
    the seed carrying the co-tag) and **lift** (enrichment vs. the color-identity-filtered universe
    base rate). `--depth 2` expands each first-order tag into its own top co-tags (`seed → X → Y`
    path drill-down). Great for finding a natural sub-theme for a "main-theme" commander (e.g.
    `affinity modal --id gur` for Riku) or reverse-engineering what defines an existing deck.
  - `edhrec <commander-name|deck-slug> [--deck <slug|path>] [--id wubrg] [--limit N]
[--include-gamechangers]` — cross-reference EDHREC's high-synergy + top picks against a deck.
    Accepts a commander name OR an ingested deck slug (reads the `// Commander:` header and diffs
    against the deck's cards). Fetches the static EDHREC JSON (cached under `data/edhrec/`, keyed by
    name-slug), color-identity-subset filtered, Game Changers excluded by default. Names that don't
    resolve to the corpus are shown flagged (`?`) rather than dropped.
  - `export <deck-slug|path> [--format text|manabox|arena] [--out <file>]` — emit a clean,
    paste-ready `<count> <name>` decklist (comments + inline role tags stripped) for import into
    external tools. **ManaBox has no write API and its Google Drive `.backup` is an opaque
    app-private blob — don't edit it; use ManaBox's deck text import instead** (see IDEAS.md).
  - `tags <substr>` / `synergy <slug>` — search the tag catalog / navigate a tag's parent+child
    tags. Umbrella tags (e.g. `protection`) have no direct cards — use `synergy` to drill down.
  - `card <name>` / `search <query>` — pinned card text / FTS5 oracle-text search.
  - `cards <deck-slug>` — list an ingested deck's cards with their resolved corpus tags.
  - `sql <query>` — read-only `SELECT` passthrough. `gen-reference` — regenerate the artifacts.
- **Deck ingestion**: `build-db` scans `decks/*/list.txt`, resolves each card name to the corpus
  (`decks`, `deck_cards` tables; DFC front-face names resolved), so decks are joinable against the
  card/tag corpus. Example — a deck's top corpus tags:
  `bun run deck sql "SELECT t.slug, COUNT(*) n FROM deck_cards dc JOIN card_tags ct ON ct.oracle_id=dc.oracle_id JOIN tags t ON t.id=ct.tag_id WHERE dc.deck_slug='wandering-minstrel' GROUP BY t.slug ORDER BY n DESC LIMIT 15"`.
- **Committed artifacts** (regenerated from the DB): `reference/oracle-tags.txt` (tag catalog),
  `reference/cards/<deck>.md` (pinned card text), `reference/cookbook.md` (data recipes).

## Owner preferences (read first)

- See `PRIORITIES.md` for the owner's standing deckbuilding preferences (Game Changers, budget, non-games, theme-vs-power, interaction, Day/Night dislike, commander-cycle meta-project). Apply them by default.
- Format: Commander / EDH (100-card singleton).
- Power level: semi-optimized casual, roughly Bracket 3 ("B to C" tier). Fun and synergy over raw efficiency.
- Game Changers: NONE. The official Commander 'Game Changers' list is banned at the owner's table. Never include cards from that list (e.g. Cyclonic Rift, Field of the Dead, Smothering Tithe, The Great Henge, etc.). When suggesting a card, check it is not a Game Changer.
- Budget: mid-budget. A small number (~3-4) of expensive 'chase' cards may be included but should be flagged as PROXY CANDIDATES in the list header.
- Color/strategy leanings: enjoys Simic-centered value, landfall, go-wide tokens, and using new-set mechanics.

## Process the owner likes (data-driven)

- Always verify real card text and legality via Scryfall (do NOT trust memory or web guesses). Prefer the **offline SQLite cache** built from bulk data (`bun run deck build-db`); it pins real oracle text. The per-deck card cache in `reference/cards/` is the fastest anti-hallucination reference.
- Native Bun `fetch` works here — no curl/SSL workaround needed (the old Python urllib SSL issue is gone with the Python scripts). The Scryfall `/cards/collection` endpoint still accepts max 75 identifiers per POST.
- For every deck, compute and report: color pip ratio vs. mana sources, mana curve (avg MV + count of 5+ MV), land count sanity, and a fetch-vs-basics audit (fetch effects must not outstrip basics of the right type). `bun run deck analyze <list.txt>` produces all of this plus a Game-Changer lint.
- **Manabase — count sources per color, including duals (not just basics).** `analyze`'s land section lists only **basics**, which understates fixing: a naive basics-only skew ignores that dual/triome/flex lands already pile onto some colors. For the real balance, count **every land as a source for each color it can produce** — each dual counts for both its colors, triomes/Command Tower/Exotic Orchard for all identity colors, MDFC pathways for both faces — then compare that supply against the pip demand (`analyze` section `[c]`). The Temur/tri-color duals typically over-serve two colors, so the workhorse color (highest pip share) often needs the basics tilted its way even when basics-vs-basics already looks even. Sanity-check against Karsten thresholds (≈9–10 sources for a single-pip card, ≈13–14 for a double-pip). A quick one-off `bun run deck sql` over the deck's land oracle text (or a short `bun:sqlite` script) tallies sources per color; the Riku deck's `notes.md` shows a worked example.
- Singleton + exactly 100 cards. Verify count with: grep -vE '^//|^$' <file> | awk '{s+=$1} END{print s}'
- **After every initial deck build, proactively walk through the most expensive cards.** The owner always asks for this, so don't wait: pull the top ~10–14 by price (`bun run deck sql "SELECT c.name, c.price_usd FROM deck_cards dc JOIN cards c ON c.oracle_id=dc.oracle_id WHERE dc.deck_slug='<slug>' AND c.price_usd IS NOT NULL ORDER BY c.price_usd DESC LIMIT 14"`) and for each give a keep / proxy / cut verdict — is the cost raw power vs. recent-set scarcity, is it core to the theme, is there a ~95%-as-good cheaper option (see the budget-discipline preference in `PRIORITIES.md`). Flag the genuine chase cards as proxy candidates in the list header.
- Card discovery: use Scryfall's Tagger tags for function-based scouting. `otag:<slug>` (alias `function:`) matches what a card does; `arttag:<slug>` (alias `art:`) matches art. The full slug catalog is in `reference/oracle-tags.txt` (regenerate with `bun run deck gen-reference`). Game Changers are excluded from discovery by default (via the authoritative `game_changer` flag). Run discovery with `bun run deck discover <slug> [--id <colors>] [--set <code>] [--max-price <usd>] [--limit N] [--deck <list.txt>]`; find valid slugs with `bun run deck tags <substr>` and navigate related tags with `bun run deck synergy <slug>`.

## Repo conventions

- One folder per deck under decks/<deck-slug>/ containing: list.txt (the decklist) and notes.md (a decision log / 'why' history).
- Decklist format: '<count> <card name>' one per line; '// ' comments for section headers; header comment block with commander, archetype, card count, and proxy candidates.
- Inline role tags: list.txt supports optional inline role tags appended after the card name, with two spaces before the first tag and each token starting with '#', e.g. `1 Avenger of Zendikar  #payoff #tokens #landfall`. Tags are informational and are stripped before card lookups; `bun run deck analyze` reports a tag distribution.
- Shared tag vocabulary (reuse these for consistency across decks):
  - Role tags: `ramp`, `fixing`, `draw`, `payoff`, `enabler`, `interaction`, `wincon`, `protection`, `land`, `utility`.
  - Archetype tags: `landfall`, `tokens`, `gowide`, `waterbend`, `town` (plus `commander` for the commander).
  - Decks may add their own archetype tags, but should reuse the role tags above for consistency.
