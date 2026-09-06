# MTG Deck-Building Workspace — Ideas

Unfiltered, speculative, or research-dependent ideas. **Not** committed work. Promising ones graduate to `ROADMAP.md`; the rest get parked or dropped.

## Bigger bets

- **Natural-language deck queries** — translate plain questions into SQL over the DB ("which of my decks run the most landfall payoffs?").
- **Semantic search / embeddings** over oracle text — "find cards similar to Scute Swarm" beyond exact tags.
- **Auto-tuner** — given a goal (more protection, lower curve, tighter budget), propose specific add/cut swaps with rationale.
- **Web UI** (SvelteKit over the DB) — browse decks, run discovery, view analytics.
- **Bracket / power estimator** (deprioritized) — general-tool idea, but our pod's power spread is wide so we don't track bracket; revisit only if it helps as a sanity check.

## Integrations to explore (see Research)

- Import decks directly from **Moxfield / Archidekt** (API) instead of pasting.
- **EDHREC** data integration (popular cards, synergy, average decks).
- **Commander Spellbook** (combo database) for the combo detector.

## Smaller / quality-of-life

- Owned-vs-proxy tracking + collection view; budget tiers.
- Meta / pod-aware tuning notes per playgroup.
- **Deck doctor** — one command that runs the full health report + top suggestions.
- Auto-generate a deck's `notes.md` decision log from git history + `decisions.jsonl`.

## Research findings

### Data sources / APIs (which to integrate)

- **Commander Spellbook** ⭐ integrate first — officially documented, MIT-licensed REST API + bulk `https://json.commanderspellbook.com/variants.json`. Combos ("variants") key on Scryfall **oracle_id** (joins straight into our DB) and list exact cards + produced features ("Infinite mana", "Win the game") + a power bracket. Also has `/find-my-combos` (POST a decklist → combos). Low risk. This is the combo-detector foundation.
- **EDHREC** — no official API, but stable static JSON at `https://json.edhrec.com/pages/commanders/<slug>.json` (popular/high-synergy cards, themes, related commanders). Keyed by **name-slug, not oracle_id** (needs mapping). Easy GETs, cache hard, isolate behind an adapter. Medium risk (unofficial, no license grant).
- **Archidekt** — undocumented but dev-tolerated read API `https://archidekt.com/api/decks/{id}/` (has `oracleCard`); good for deck _import_. Low-medium risk.
- **Moxfield** — restrictive; no public API, requires a registered User-Agent by request. High policy risk — defer.
- **MTGJSON** — bulk aggregator that ships as **SQLite**; adds legalities, rulings, and **price history** (Scryfall only gives daily snapshots). Drop in alongside our DB when we want those. Joins via `identifiers.scryfallOracleId`.
- **Scryfall non-bulk** we may underuse: `/cards/collection` (batch 75 by oracle_id/name — great for resolving decklists), `/cards/:id/rulings`.
- **Recommendation:** integrate Commander Spellbook bulk first (combo detector), then EDHREC JSON (recommendations). Defer deck-import sources; add MTGJSON opportunistically.

### Recent-set mechanics for landfall/tokens/go-wide (deck-relevant)

- **Edge of Eternities "Lander" tokens** are the standout: an artifact token that sacs to fetch a basic land tapped — repeatable ramp that's also a landfall trigger, and under the Minstrel the fetched land enters **untapped**. `Edge Rover` ({G}, dies→everyone makes a Lander) and other Lander-makers are prime candidates.
- **Avatar "waterbend"** = confirmed convoke/improvise hybrid: tap an untapped artifact OR creature to pay each generic {1} (spells AND activated abilities). A real go-wide payoff — a wide token board becomes a cost-reduction engine. **"Earthbend N"** = turn a land into a 0/0+counters creature that returns tapped when it dies → re-triggers landfall (untapped under Minstrel). `Earthbender Ascension` ({2}{G}: ramp + landfall quest-counter → go-wide finisher), `Ba Sing Se` (green earthbend utility land), and `Toph, the First Metalbender` (legal only via the WUBRG identity) are verified fits.
- **Towns** originate in **Final Fantasy** (the Minstrel's set) — main source for the 5+-Towns trigger; collect FF city lands. Follow-up: Scryfall `t:town` to enumerate all Towns.
- **Tarkir** Mobilize (attacking Warrior tokens) / Endure (counters-or-token) / Harmonize (tap creatures to cast) and **Bloomburrow** Offspring (ETB 1/1 token copy) are additional token/go-wide/tap-to-cast sources.
- **Reminder:** the Minstrel's color identity is **WUBRG** (via the {3}{W}{U}{B}{R}{G} ability), so off-color token-makers (Mobilize red, Toph Naya) are all legal.
- Caveat: some card names from secondary searches were unverified/likely hallucinated — verify exact names/text on Scryfall (`set:eoe o:"Lander"`, `keyword:waterbend`, `set:tla`, `set:blb o:token c:gu`) before deck inclusion.
