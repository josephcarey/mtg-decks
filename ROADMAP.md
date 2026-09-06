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

## Done

### 7. Card discovery via Scryfall Tagger (otag) — ✅ implemented
Scryfall's Tagger dataset is queryable through the normal search API, giving us function-based card discovery.
- `otag:` (alias `function:`) = oracle/function tags describing what a card does, e.g. `otag:landfall`, `otag:"creates tokens"`, `otag:removal`.
- `arttag:` (alias `art:`) = art-depiction tags, e.g. `arttag:dragon` (useful for themed/tribal builds).
- **Implemented:** `scripts/scryfall.py --discover <otag-slug>` queries `https://api.scryfall.com/cards/search` (via curl), filtered by color identity (`--id`), optionally a set (`--set`) and price (`--max-price`), with `-is:gamechanger` auto-excluding the banned Game Changers list, ordered by `order:edhrec`. Outputs a ranked candidate list (rank, name, MV, price, type); `--deck` marks/skips owned cards so only NEW candidates count toward `--limit`. `--list-tags <substr>` searches the local catalog offline.
- **Implemented:** `scripts/tagger_catalog.py` fetches the full 4524-slug function-tag catalog from the Tagger GraphQL API into `reference/oracle-tags.txt`.
- Note: verified working in-environment; `otag:landfall id:gu` correctly returns the deck's payoff suite. Remember `-is:gamechanger` — a raw `otag:landfall` search returns Field of the Dead.
