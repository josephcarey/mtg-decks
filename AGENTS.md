# MTG Deck-Building Workspace — Agent Guide

## Owner preferences (read first)
- Format: Commander / EDH (100-card singleton).
- Power level: semi-optimized casual, roughly Bracket 3 ("B to C" tier). Fun and synergy over raw efficiency.
- Game Changers: NONE. The official Commander 'Game Changers' list is banned at the owner's table. Never include cards from that list (e.g. Cyclonic Rift, Field of the Dead, Smothering Tithe, The Great Henge, etc.). When suggesting a card, check it is not a Game Changer.
- Budget: mid-budget. A small number (~3-4) of expensive 'chase' cards may be included but should be flagged as PROXY CANDIDATES in the list header.
- Color/strategy leanings: enjoys Simic-centered value, landfall, go-wide tokens, and using new-set mechanics.

## Process the owner likes (data-driven)
- Always verify real card text and legality via the Scryfall API (do NOT trust memory or web guesses).
- Environment quirk: python3 urllib has SSL cert failures here — use `curl` for Scryfall. The /cards/collection endpoint accepts max 75 identifiers per POST.
- For every deck, compute and report: color pip ratio vs. mana sources, mana curve (avg MV + count of 5+ MV), land count sanity, and a fetch-vs-basics audit (fetch effects must not outstrip basics of the right type).
- Singleton + exactly 100 cards. Verify count with: grep -vE '^//|^$' <file> | awk '{s+=$1} END{print s}'

## Repo conventions
- One folder per deck under decks/<deck-slug>/ containing: list.txt (the decklist) and notes.md (a decision log / 'why' history).
- Decklist format: '<count> <card name>' one per line; '// ' comments for section headers; header comment block with commander, archetype, card count, and proxy candidates.
- Inline role tags: list.txt supports optional inline role tags appended after the card name, with two spaces before the first tag and each token starting with '#', e.g. `1 Avenger of Zendikar  #payoff #tokens #landfall`. Tags are informational and are stripped before Scryfall lookups; `scripts/scryfall.py` reports a tag distribution.
- Shared tag vocabulary (reuse these for consistency across decks):
  - Role tags: `ramp`, `fixing`, `draw`, `payoff`, `enabler`, `interaction`, `wincon`, `protection`, `land`, `utility`.
  - Archetype tags: `landfall`, `tokens`, `gowide`, `waterbend`, `town` (plus `commander` for the commander).
  - Decks may add their own archetype tags, but should reuse the role tags above for consistency.
