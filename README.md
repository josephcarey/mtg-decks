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
> `scripts/tagger_catalog.py`). Those have been removed and are being reimplemented in
> TypeScript. This PR scaffolds the Bun + TypeScript project and CI gates; the deck analyzer,
> SQLite data layer, and card-discovery CLI land in a follow-up.

## Scripts

| Script          | What it does                                                                       |
| --------------- | ---------------------------------------------------------------------------------- |
| `bun run check` | `tsc --noEmit && knip && eslint . && bun audit` — full static analysis.            |
| `bun run test`  | Vitest with coverage (80% line threshold).                                         |
| `bun run ci`    | `bun run check && bun run test` — exactly what CI runs.                            |
| `bun run deck`  | The deck CLI entry point (`bun src/cli.ts`). Subcommands land in the follow-up PR. |

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
