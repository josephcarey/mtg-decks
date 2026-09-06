# MTG Deck-Building Workspace — Ideas

Unfiltered, speculative, or research-dependent ideas. **Not** committed work. Promising ones graduate to `ROADMAP.md`; the rest get parked or dropped.

## Bigger bets
- **Natural-language deck queries** — translate plain questions into SQL over the DB ("which of my decks run the most landfall payoffs?").
- **Semantic search / embeddings** over oracle text — "find cards similar to Scute Swarm" beyond exact tags.
- **Auto-tuner** — given a goal (more protection, lower curve, tighter budget), propose specific add/cut swaps with rationale.
- **Web UI** (SvelteKit over the DB) — browse decks, run discovery, view analytics.

## Integrations to explore (see Research)
- Import decks directly from **Moxfield / Archidekt** (API) instead of pasting.
- **EDHREC** data integration (popular cards, synergy, average decks).
- **Commander Spellbook** (combo database) for the combo detector.

## Smaller / quality-of-life
- Owned-vs-proxy tracking + collection view; budget tiers.
- Meta / pod-aware tuning notes per playgroup.
- **Deck doctor** — one command that runs the full health report + top suggestions.
- Auto-generate a deck's `notes.md` decision log from git history + `decisions.jsonl`.

## Open research questions
_Being investigated by research agents — findings will be summarized here._
1. What MTG data sources / APIs are available (EDHREC, Commander Spellbook, Moxfield, Archidekt), with endpoints, auth, rate limits, and licensing?
2. How is Commander power level / bracket estimated, and which features can we compute from Scryfall / our DB to approximate it?
