# Saruman of Many Colors — Build Notes & Decision Log

## Commander

**Saruman of Many Colors** ({3}{W}{U}{B}, Esper). Key text:

- **Ward** — Discard an enchantment, instant, or sorcery card.
- **Whenever you cast your second spell each turn**, each opponent mills two cards. When
  cards are milled this way, **exile** target enchantment/instant/sorcery with MV ≤ that
  spell from an opponent's graveyard, **copy it, and cast the copy for free**.

So he is a **cast-trigger** commander (rewards casting 2+ spells a turn), not a combat/end-step
one. He is fundamentally **spellslinger + theft/copy** — exactly the WUB Esper slot's assigned
archetype ("owns spellslinger"). See `CYCLE.md`.

## Archetype — "Many Colors, Many Thefts"

Esper **spellslinger / theft**. Cheap card-draw and cantrips reliably hit the **second spell**
each turn → Saruman mills opponents and **copies/steals** their instants, sorceries, and
enchantments. A **LOTR-villain** package forms the flavor spine, and a light **amass / Wraith
"armies of Isengard"** sub-theme turns spell velocity into a board without stepping on The
Wandering Minstrel's landfall go-wide.

## Direction decision (repartee vs. spellslinger)

The build started from a Silverquill/**Repartee** prerelease impulse ("gain something when you
cast a spell with a target," + prowess). Two problems surfaced, both resolved in favor of
straight spellslinger:

1. **Repartee is a combat mechanic.** `sos` Repartee = *"whenever you cast an instant/sorcery
   that **targets a creature**, [pump]."* Those payoffs (+1/+1, flying, lifedrain) buff a
   creature for combat — they do **not** leverage Saruman's mill/copy/theft trigger. Owner
   caught this himself.
2. **Cycle collision.** Repartee / targeted-spells + Auras is already **Killian, Ink Duelist's**
   (WB Orzhov) assigned archetype. Keeping Saruman on spellslinger/theft leaves the cycle intact.

→ Chose **prowess/magecraft "cast noncreature spells" + copy/theft**, which is the real "expand"
of what the owner liked, minus the combat mismatch.

## Key decisions

- **Villain spine (all Esper-legal LOTR):** these aren't just flavor — several *are* the
  payoffs. **Gríma, Saruman's Footman** (combat damage → cast an opponent's instant/sorcery
  free = theft), **Saruman the White** (same *second-spell* trigger → amass Orcs), **Lord of
  the Nazgûl** (I/S cast → 3/3 Wraith), **Sauron, the Necromancer** (copy a creature from GY),
  **Lobelia** (steal from GY → Treasure), plus **Gothmog** / **Gríma Wormtongue** amass support.
- **Copy engine — Storm of Saruman** ({4}{U}{U}): *"cast your second spell each turn → copy
  it."* Mirrors the commander's trigger and is on-flavor. Core include.
- **Amass / Wraith sub-theme** kept deliberately light (Saruman the White, Lord of the Nazgûl,
  Dreadhorde Invasion, March from the Black Gate, Barad-dûr, Gothmog) so the tokens are a
  *spellslinger payoff*, distinct from the Minstrel's landfall go-wide.
- **Extra turns allowed here.** Owner ruled Saruman is thematically "a turn ahead of the
  hobbits," so two **telegraphed** extra-turn sorceries (Time Warp, Alrund's Epiphany) are in.
  This is a per-deck override of the usual "no extra-turns" non-game rule — see PRIORITIES.md.
- **Theft/copy suite:** Bribery, Agent of Treachery, Control Magic, Corrupted Conscience (gain
  control) + Narset's Reversal, Twincast, Rite of Replication (copy). No **dedicated** infinite
  loop; owner is fine with incidental ones.
- **An Offer You Can't Refuse over Negate** for the cheap counter — pure villain flavor.

## No Game Changers (owner's table bans the list)

The authoritative `game_changer` flag cut several otherwise-perfect cards:

- **Orcish Bowmasters** — ideal Orc/amass flavor, but a Game Changer → cut.
- **Farewell** — wanted a flexible wipe, but a Game Changer → replaced with Supreme Verdict +
  Damn + Toxic Deluge.
- Also avoided: Rhystic Study, Cyclonic Rift, Consecrated Sphinx, The One Ring.

`bun run deck analyze` reports **Game Changers: none ✓**.

## Numbers (from `analyze`)

- 100/100 cards; **avg MV 2.98** over 64 nonland; 12 at MV 5+ (payoffs / extra-turns / theft
  finishers).
- Pips: **U 65% / B 26% / W 9%** — blue primary, black secondary, white a genuine light splash.
- **36 lands** (14 basics: 7 Island / 5 Swamp / 2 Plains), heavy on WUB duals + two basic-fetch
  (Fabled Passage, Evolving Wilds) to support the splash. Barad-dûr adds an amass sink.
- Approx. price **~$151**. Proxy candidates flagged in the list header: Mystic Remora, Bribery,
  Metallurgic Summonings.

## Budget pass (post-build)

Dropped the two pricey channel lands — **Otawara, Soaring City** (~$30) and **Takenuma,
Abandoned Mire** (~$11) — back to basics. Their flex utility (bounce / GY recursion) is ~95%
covered by an Island/Swamp, so this is the owner's "skip the pricey land when a cheap one does
the job" rule in action: **~$40 saved (~$192 → ~$151) for near-zero power loss.**

## Manabase — sources per color (duals counted, per AGENTS.md guidance #11)

`analyze` lists only basics (7 Island / 5 Swamp / 2 Plains), which understates fixing. Counting
**every land as a source for each color it produces** (duals both colors; Command Tower / Arcane
Sanctum / Fabled Passage / Evolving Wilds → all WUB):

- **U (workhorse, 65% pips): 22 sources** — many double-pips (Counterspell, Talrand, Storm of
  Saruman, Metallurgic, Rite, Agent, Time Warp, Alrund's, Corrupted Conscience). Well above the
  Karsten ~13–14 double-pip target.
- **B (26% pips): 20 sources** — covers the BB cards (Sauron, Damn, Toxic Deluge). ✓
- **W (splash, 9% pips): 16 sources** — the duals carry it; enough even for the lone **WW** card,
  **Supreme Verdict**. ✓

WUB-fixing rocks (Arcane Signet, Dimir/Azorius/Orzhov Signets, both Talismans, Fellwar Stone)
stack on top. So the basics being U-tilted (7 Island) is *correct* — the workhorse color rightly
gets the most sources. **No rebalance needed.** Binding constraint on the splash is Supreme
Verdict's {1}{W}{W}; if white ever feels awkward, swap it for a mono-B wrath to zero out WW demand.

## Possible future tweaks

- If the manabase feels slow (≈6 always-tapped lands), trim a temple/cycle land for a basic or
  a painland.
- Docent of Perfection / King of the Oathbreakers are the softest includes — first cuts if a
  better spellslinger payoff or a second protection piece is wanted.
