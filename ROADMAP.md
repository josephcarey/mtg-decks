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
- **Color-identity guard:** `analyze` now emits a `[h]` lint flagging any card whose color identity isn't a subset of the commander's (resolved from the `// Commander:` header), so illegal off-color inclusions (e.g. a GU card in mono-U Namor) are caught automatically instead of by eye.
- **`deck price <deck>`:** budget report command — total, total-without-proxy-candidates, cards flagged as proxy candidates at/above a threshold (`--over`, default $15), and the priciest cards (`--top`). Accepts a deck slug or a decklist path.

## Near-term

- **`deck triage <list>`** — paste/point at a candidate list (Moxfield export etc.) and get a per-card table joined to the corpus: in-deck? · pips · type · price · Game Changer? · color-identity-legal? · owned? · function tags. Replaces the throwaway join script written by hand during the Namor build; makes research-list review deterministic.
- **`deck sync [<slug>]`** — one command that runs `build-db` + `gen-reference` (optionally scoped to one deck) so a list edit can't leave the ingested rows / reference cache stale. Optional `--watch`.
- **Commander-aware payoff scoring** — each cycle commander has a payoff axis (Namor = blue pips, the Minstrel = landfall / Towns count). A tiny per-deck config (e.g. `payoff: blue_pips`) that lets `analyze` / `discover` total and rank against that axis, so the tooling reports the metric that actually matters per deck instead of a human eyeballing it. Pairs with the MDFC-cost fix below.
- **Deck-diff tool** — compare two list versions; show delta in count / curve / pips / tags / price.
- **Decisions & rejections ledger** (`decisions.jsonl`) — record cut/rejected cards + reasons; `discover` excludes rejected cards; prevents re-litigating settled calls.
- **Non-games lint** — the `game_changer` flag catches the official list, but the owner's "no non-games" preference (infinite combos, stax / resource denial like Hullbreacher, extra-turns like Wanderwine Prophets, MLD, mindslaver effects like Secret of Bloodbending) is unlinted and cards slip through. Add a heuristic/curated lint alongside the GC check.
- **MDFC / split / battle front-face mana costs** — the DB flattens `mana_cost` and leaves it blank for modal DFCs, split cards, sagas, and battles (e.g. Jwari Disruption, Silundi Vision, Invasion of Segovia, Summon: Leviathan). Blue-pip / curve analysis is blind to their front faces — a real gap for a pip-scaling commander like Namor. Store per-face costs (from `card_faces`) so pip counts are accurate.
- **Price-watch workflow** — scheduled job snapshots deck prices and flags proxies that dropped below a buy threshold.
- **Collection / owned-card awareness** (⏸ blocked on data) — an `owned` source (file or export) that `discover` / `triage` / `price` read, so owned cards are marked and don't count against budget. Deferred until the owner has usable collection data; until then owned cards are noted by hand (Otawara, Merrow Commerce).

## Later

- **Combo / infinite detector** — flag known two-card combos present (needs a data source, e.g. Commander Spellbook).
- **EDHREC cross-reference** — diff a deck against the commander's popular / high-synergy cards.
- **Goldfish / mana simulator** — Monte Carlo opening hands (P(untapped G+U by turn 2), land-drop consistency).
- **otag synergy graph / package suggester** — leverage the tag parent/child taxonomy to propose synergy packages.
- **Playtest feedback log** — structured post-game notes that feed future tuning.
