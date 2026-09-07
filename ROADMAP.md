# MTG Deck-Building Workspace — Roadmap

Concrete, sequenced build work. Speculative or unshaped ideas live in `IDEAS.md`; when an idea is ready to build it graduates here.

## Done

- Repo scaffold: `decks/`, `scripts/`→`src/`, `reference/`, `AGENTS.md`.
- Bun + TypeScript project scaffold (strict, ESLint/Prettier/knip/Vitest, CI, PR template).
- Category tagging (#1): inline role tags + shared vocabulary + tag-distribution report.
- Game Changers guardrail (#5): lint via the authoritative Scryfall `game_changer` flag.
- Card discovery via Scryfall Tagger (#7): `otag:` search + `discover` / `tags` commands.
- Offline data layer: Scryfall bulk (`oracle_cards` + `oracle_tags`) loaded into `bun:sqlite` with FTS5; decks ingested and joinable; `deck` CLI (`build-db`, `analyze`, `discover`, `tags`, `synergy`, `cards`, `sql`).
- **Card knowledge cache — all decks:** `gen-reference` now regenerates `reference/cards/<slug>.md` for every deck under `decks/` (not just one), so the anti-hallucination cache stays complete automatically.

## Near-term

- **Deck-diff tool** — compare two list versions; show delta in count / curve / pips / tags / price.
- **Decisions & rejections ledger** (`decisions.jsonl`) — record cut/rejected cards + reasons; `discover` excludes rejected cards; prevents re-litigating settled calls.
- **Non-games lint** — the `game_changer` flag catches the official list, but the owner's "no non-games" preference (infinite combos, stax / resource denial like Hullbreacher, extra-turns like Wanderwine Prophets, MLD) is unlinted and cards slip through. Add a heuristic/curated lint alongside the GC check.
- **Price-watch workflow** — scheduled job snapshots deck prices and flags proxies that dropped below a buy threshold.

## Later

- **Combo / infinite detector** — flag known two-card combos present (needs a data source, e.g. Commander Spellbook).
- **EDHREC cross-reference** — diff a deck against the commander's popular / high-synergy cards.
- **Goldfish / mana simulator** — Monte Carlo opening hands (P(untapped G+U by turn 2), land-drop consistency).
- **otag synergy graph / package suggester** — leverage the tag parent/child taxonomy to propose synergy packages.
- **Playtest feedback log** — structured post-game notes that feed future tuning.
