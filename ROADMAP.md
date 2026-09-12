# MTG Deck-Building Workspace — Roadmap

Concrete, sequenced build work. Speculative or unshaped ideas live in `IDEAS.md`; when an idea is ready to build it graduates here. The commander-per-color-identity meta-project is planned out in `CYCLE.md`.

## Done

- Repo scaffold: `decks/`, `scripts/`→`src/`, `reference/`, `AGENTS.md`.
- Bun + TypeScript project scaffold (strict, ESLint/Prettier/knip/Vitest, CI, PR template).
- Category tagging (#1): inline role tags + shared vocabulary + tag-distribution report.
- Game Changers guardrail (#5): lint via the authoritative Scryfall `game_changer` flag.
- Card discovery via Scryfall Tagger (#7): `otag:` search + `discover` / `tags` commands.
- Offline data layer: Scryfall bulk (`oracle_cards` + `oracle_tags`) loaded into `bun:sqlite` with FTS5; decks ingested and joinable; `deck` CLI (`build-db`, `analyze`, `discover`, `tags`, `synergy`, `cards`, `sql`).
- **Tag-affinity sub-theme finder** (`deck affinity`): rank the tags co-occurring with a seed theme (a function tag or a deck's cards) by share + lift over a color-identity-filtered universe, with an optional depth-2 `seed → X → Y` path drill-down. Surfaces natural sub-themes (e.g. modal → flexible-removal toolbox for Riku).
- **EDHREC cross-reference** (`deck edhrec`): fetch a commander's static EDHREC JSON (cached under `data/edhrec/`), then surface its high-synergy + top picks that the deck isn't already running — color-identity filtered and Game-Changer-excluded by default. Accepts a commander name or an ingested deck slug (which reads the commander from the list header and diffs against its cards).
- **Decklist export** (`deck export`): emit a clean, paste-ready `<count> <name>` list (comments + inline role tags stripped) for import into external tools such as **ManaBox** (`--format text|manabox|arena`, optional `--out <file>`).

## Near-term

- **Deck-diff tool** — compare two list versions; show delta in count / curve / pips / tags / price.
- **Decisions & rejections ledger** (`decisions.jsonl`) — record cut/rejected cards + reasons; `discover` excludes rejected cards; prevents re-litigating settled calls.
- **Card knowledge cache expansion** — extend `reference/cards/` to every deck (exact oracle text; anti-hallucination).
- **Price-watch workflow** — scheduled job snapshots deck prices and flags proxies that dropped below a buy threshold.
- **ManaBox printing-aware export** — optional CSV with set code + collector number (needs a printing-level data source; the oracle bulk only pins one representative printing). The current plain-text export already imports fine via ManaBox's deck text import.

## Later

- **Combo / infinite detector** — flag known two-card combos present (needs a data source, e.g. Commander Spellbook).
- **Goldfish / mana simulator** — Monte Carlo opening hands (P(untapped G+U by turn 2), land-drop consistency).
- **otag synergy graph / package suggester** — leverage the tag parent/child taxonomy to propose synergy packages.
- **Playtest feedback log** — structured post-game notes that feed future tuning.
