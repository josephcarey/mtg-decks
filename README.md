# MTG Commander Deck-Building Workspace

An ongoing **Magic: The Gathering** Commander (EDH) deck-building workspace, maintained with
GitHub Copilot. It stores decklists, the reasoning behind every build, reusable analysis
tooling, and evergreen mechanic notes so that any future session can pick up where the last
one left off.

## What's here

| Path | Purpose |
| --- | --- |
| `AGENTS.md` | House style & owner preferences. **Read this first** — power level, banned Game Changers, budget, and process conventions. |
| `decks/<deck-slug>/` | One folder per deck: `list.txt` (the decklist) and `notes.md` (a decision log / "why" history). |
| `scripts/scryfall.py` | Decklist analyzer: card count, mana curve, color pips, fetch-vs-basics audit, and total price via the Scryfall API. |
| `reference/set-mechanics.md` | Evergreen notes on recent set mechanics (Waterbend, Earthbend, Final Fantasy Towns). |

## Decks

- **`decks/wandering-minstrel/`** — *The Wandering Minstrel*, a Simic-centered 5-color
  landfall + go-wide tokens deck with a Towns finisher and a light Waterbend package.

## Running the Scryfall analysis

The analyzer reads a decklist and reports count, curve, pips, a fetch-vs-basics note, and
total USD price:

```bash
python3 scripts/scryfall.py decks/wandering-minstrel/list.txt
```

**Environment note:** this workspace's `python3` has SSL certificate failures with `urllib`,
so the script shells out to **`curl`** to reach Scryfall. Card data is fetched via the
`/cards/collection` endpoint, batched at the API's max of **75 identifiers per POST**. If the
network is unavailable, the parsing/curve/pip sections still work and the price fetch fails
gracefully.

## Conventions

- Commander / EDH, **exactly 100 cards**, singleton. Verify with:
  ```bash
  grep -vE '^//|^$' decks/wandering-minstrel/list.txt | awk '{s+=$1} END{print s}'
  ```
- Decklist format: `<count> <card name>` per line; `// ` for comment/section headers.
- Always verify card text and legality against the **Scryfall API**, never memory.
