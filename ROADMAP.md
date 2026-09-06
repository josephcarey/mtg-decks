# MTG Deck-Building Workspace — Roadmap

Living list of planned improvements. Near-term items are actively queued; backlog items are good ideas for later.

## Near-term

### 1. Category tagging

Annotate every card in a deck with role tags so composition is visible and exportable (Moxfield/Archidekt-compatible).

- Store tags as inline trailing comments in `list.txt`, e.g. `1 Avenger of Zendikar  #payoff #tokens #landfall`.
- Define a shared tag vocabulary in `AGENTS.md` so tags stay consistent across decks: `ramp`, `fixing`, `draw`, `payoff`, `enabler`, `interaction`, `wincon`, `protection`, `land`, `utility` (decks may add archetype tags like `landfall`, `tokens`, `waterbend`).
- Extend `scripts/scryfall.py` to parse tags and report a tag distribution (e.g. counts per tag), doubling as a composition sanity check.

### 3. Deck health-check report

Make the analyzer's headline output a single "report card" that combines count + curve + pips + tag distribution + interaction count, with warning flags. Examples of flags: "⚠ only N pieces of interaction", "⚠ curve heavy at MV 6+", "⚠ Forest count may be too low for green fetch count".

## Backlog

### 2. Recent-sets deep dive

Expand `reference/set-mechanics.md` into a per-set "new cards worth knowing" digest for recent sets (Final Fantasy, Avatar: TLA, and the last ~year of sets), organized by the archetypes played here (landfall, tokens, Simic value, 5-color). Optionally add a `--new-cards <SET>` mode to the script that queries a set and filters by color identity + keywords, making the deep dive repeatable.

### 4. Per-deck "considering" list

A living upgrade path per deck (a section in `notes.md` or a `considering.txt`) listing cards on the bubble and swap ideas, so upgrades aren't re-derived each session.

### 5. Game Changers guardrail

Maintain `reference/game-changers.txt` (the official Commander Game Changers list) and have the script fail a deck if any listed card appears — turning the table's "no Game Changers" rule into an enforced lint.

### 6. Price/budget tracking over time

Snapshot each deck's total price (and priciest cards) into `notes.md` periodically so price movement is visible and we can tell when a proxy becomes affordable to buy.

### 8. Card knowledge cache expansion

Extend the per-deck card cache (`reference/cards/<deck>.md`, pinned real oracle text from the DB) to **every** deck in the workspace, and regenerate it as part of a deck's health check so future sessions never hallucinate card text.

### 9. Decisions & rejections ledger (`decisions.jsonl`)

Record every cut or rejected card with a reason (per deck) in an append-only `decisions.jsonl`, so the discovery/scouting tools can filter out cards we've already deliberately passed on and we never re-suggest them.

### 10. Deck-diff tool

Compare two versions of a decklist and report the delta in curve, pips, tag distribution, and price — making it easy to see exactly what a proposed rebuild changes.

### 11. otag synergy graph

Leverage the tag taxonomy (`parent_ids`/`child_ids`, surfaced by `deck synergy`) to suggest coherent card **packages** — e.g. from `landfall` walk to `forestfall`/`islandfall` children, or from an umbrella tag like `protection` down to `protects-creature`.

## Done

### 5. Game Changers guardrail — ✅ implemented (lint)

The official Commander Game Changers list is enforced as a lint using the **authoritative** `game_changer` boolean from Scryfall bulk data (true on exactly 53 cards) — no hand-maintained `reference/game-changers.txt` needed. `bun run deck analyze` prints a `[g] Game Changers` line listing any offenders (should be none), and `discover` excludes them by default (`--include-gamechangers` to override).

### 7. Card discovery via Scryfall Tagger (otag) — ✅ implemented (offline + SQLite/FTS)

Scryfall's Tagger dataset gives us function-based card discovery, now served **offline** from a local `bun:sqlite` database built from bulk data.

- `otag:` (alias `function:`) = oracle/function tags describing what a card does, e.g. `otag:landfall`, `otag:"creates tokens"`, `otag:removal`. `arttag:` (alias `art:`) = art-depiction tags.
- **Implemented:** `bun run deck discover <slug> [--id --set --max-price --limit --include-gamechangers --deck]` joins the tag → its taggings → cards, filters by color-identity subset (bitmask) and price, excludes Game Changers by default, skips owned cards, and ranks by EDHREC. `bun run deck tags <substr>` searches the local catalog and `bun run deck synergy <slug>` navigates parent/child tags.
- **Implemented:** a `bun:sqlite` **data layer with FTS5** (`src/db/`) built from the `oracle_cards` + `oracle_tags` bulk exports (`bun run deck build-db`), plus `deck search` (FTS5 oracle-text search) and a read-only `deck sql` passthrough. Derived artifacts (`reference/oracle-tags.txt`, `reference/cards/<deck>.md`) are regenerated with `bun run deck gen-reference`.
- Note: verified in-environment; `discover landfall --id gu` returns the deck's payoff suite. Umbrella tags like `protection` have no direct taggings — use `synergy protection` to reach `protects-creature` etc.
