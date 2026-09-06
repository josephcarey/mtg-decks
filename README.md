# MTG Commander Deck-Building Workspace

An ongoing **Magic: The Gathering** Commander (EDH) deck-building workspace, maintained with
GitHub Copilot. It stores decklists, the reasoning behind every build, reusable analysis
tooling, and evergreen mechanic notes so that any future session can pick up where the last
one left off.

## Stack

The tooling is written in **TypeScript** and runs on **[Bun](https://bun.sh)** (no build step
for dev scripts). It follows the studio code standards:

- **Runtime & package manager:** Bun
- **Language:** TypeScript (strict)
- **Lint/format:** ESLint (unicorn, perfectionist, depend, security) + Prettier (defaults)
- **Dead code:** knip
- **Tests:** Vitest with `@vitest/coverage-v8` (80% line-coverage CI gate)

> **Migration note:** the tooling was previously a set of Python scripts (`scripts/scryfall.py`,
> `scripts/tagger_catalog.py`). Those have been removed and reimplemented in TypeScript on Bun,
> with an offline **SQLite** (`bun:sqlite`, incl. FTS5) data layer built from Scryfall bulk data.

## Data workflow

The tooling is **offline-first**: it builds a local SQLite database from Scryfall's daily
[bulk-data](https://scryfall.com/docs/api/bulk-data) exports and queries that, instead of
hitting the API per card.

```bash
bun run deck fetch-bulk   # download oracle_cards + oracle_tags (.jsonl.gz) into data/
bun run deck build-db     # build data/mtg.db from the bulk cache + ingest decks/
```

`build-db` auto-runs `fetch-bulk` if the cache is missing. Both `data/` and `*.db` are
gitignored. The `game_changer` boolean on each card is the **authoritative** Commander Game
Changers list (53 cards) — the analyzer lints against it. See
[`reference/cookbook.md`](reference/cookbook.md) for the full data recipes.

## CLI

`bun run deck <subcommand>` (alias for `bun src/cli.ts`):

| Subcommand                      | What it does                                                            |
| ------------------------------- | ----------------------------------------------------------------------- |
| `fetch-bulk`                    | Download the Scryfall bulk exports into `data/`.                        |
| `build-db`                      | Build `data/mtg.db` from the bulk exports and ingest `decks/`.          |
| `analyze <decklist>`            | Report count / curve / pips / lands / price / tags + Game-Changer lint. |
| `discover <slug> [opts]`        | Find cards for a function tag, EDHREC-ranked (see options below).       |
| `card <name>`                   | Print one card's pinned mana cost / type / oracle text.                 |
| `search <query>`                | Full-text (FTS5) search over card names + oracle text.                  |
| `tags <substr>`                 | Search the tag catalog by slug / label / alias.                         |
| `synergy <slug>`                | Show a tag's parent and child tags (navigate the taxonomy).             |
| `sql <query>`                   | Run a single **read-only** `SELECT` against the cache.                  |
| `gen-reference [--deck <path>]` | Regenerate `reference/oracle-tags.txt` + the per-deck card cache.       |

`discover` options: `--id <colors=gu>` (color-identity subset), `--set <code>`,
`--max-price <usd>`, `--limit <n=25>`, `--include-gamechangers`, `--deck <path>` (skip cards
already in that deck so only NEW candidates count toward the limit). Game Changers are excluded
by default.

```bash
bun run deck discover landfall --id gu --max-price 8 --limit 10 --deck decks/wandering-minstrel/list.txt
bun run deck synergy protection      # protection is an umbrella tag → drill into children
bun run deck tags landfall
```

## Scripts

| Script          | What it does                                                            |
| --------------- | ----------------------------------------------------------------------- |
| `bun run check` | `tsc --noEmit && knip && eslint . && bun audit` — full static analysis. |
| `bun run test`  | Vitest with coverage (80% line threshold).                              |
| `bun run ci`    | `bun run check && bun run test` — exactly what CI runs.                 |
| `bun run deck`  | The deck CLI entry point (`bun src/cli.ts`); see the CLI table above.   |

Install and verify locally:

```bash
bun install
bun run ci
```

## What's here

| Path                         | Purpose                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `AGENTS.md`                  | House style & owner preferences. **Read this first** — power level, banned Game Changers, budget, tag vocabulary, and process conventions. |
| `decks/<deck-slug>/`         | One folder per deck: `list.txt` (the decklist) and `notes.md` (a decision log / "why" history).                                            |
| `src/`                       | TypeScript tooling (analysis, Scryfall bulk data, SQLite data layer, CLI).                                                                 |
| `reference/set-mechanics.md` | Evergreen notes on recent set mechanics (Waterbend, Earthbend, Final Fantasy Towns).                                                       |
| `reference/oracle-tags.txt`  | The Scryfall function-tag (`otag:`) catalog — valid slugs for discovery.                                                                   |
| `reference/cards/`           | Per-deck card knowledge caches — real card text pinned from bulk data (anti-hallucination).                                                |
| `reference/cookbook.md`      | Reusable data recipes (Scryfall qualifiers, bulk-data workflow, Game Changers flag).                                                       |

## Decks

- **`decks/wandering-minstrel/`** — _The Wandering Minstrel_, a Simic-centered 5-color
  landfall + go-wide tokens deck with a Towns finisher and a light Waterbend package.

## Conventions

- Commander / EDH, **exactly 100 cards**, singleton. Verify with:
  ```bash
  grep -vE '^//|^$' decks/wandering-minstrel/list.txt | awk '{s+=$1} END{print s}'
  ```
- Decklist format: `<count> <card name>` per line, with optional inline `#tags` (two spaces
  before the first tag); `// ` for comment/section headers.
- Always verify card text and legality against the **Scryfall API** / its bulk-data exports,
  never memory.
