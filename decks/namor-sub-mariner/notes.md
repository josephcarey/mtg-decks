# Namor the Sub-Mariner — Build Notes & Decision Log

## Commander

**Namor the Sub-Mariner** ({1}{U}{U}, mono-U). Text:

- Flying.
- **Namor's power = the number of Merfolk you control** — a scaling evasive threat.
- **Whenever you cast a noncreature spell with one or more blue mana symbols in its mana cost,
  create that many 1/1 blue Merfolk creature tokens.**

Color identity is strictly **mono-blue**, so the 99 is all `U`/colorless.

## Archetype — "Accidentally Merfolk" (draw/interaction/enchantment control)

The deck is a **mono-U draw-go control/tempo** shell that only *looks* like Merfolk tribal by
accident. The engine insight: Namor's trigger scales with **blue mana symbols**, so the payoffs are
**blue-dense noncreature spells**, not creature slots — a `{U}{U}{U}` spell makes **3** Merfolk, an
`{X}{U}{U}{U}{U}` makes **4+**. We keep the **lords** (they pump every token Namor makes) and let
the *spells* — counters, card draw, and blue enchantments — build the tribe.

This is deliberately distinct from the cycle's spellslinger slot (Saruman, WUB): the payoff here is
a **creature/kindred board**, not storm/copy value. Merfolk-token enchantments and lords make it a
go-wide deck whose wide board happens to come from casting a normal blue control game.

### Three pillars
1. **Lords + token enchantments** — Lord of Atlantis, Master of the Pearl Trident, Merfolk
   Sovereign, Coralhelm Commander, Vodalian Hexcatcher, Svyelun, Attuma, Emperor Mihail II,
   Namor Scourge, plus **Deeproot Waters / Deeproot Pilgrimage / Reflections of Littjara** turn
   spellcasting into extra Merfolk that the lords immediately pump.
2. **Card draw** — ~30 cards tagged draw: Mystic Remora, Kindred Discovery, combat-damage engines
   (Coastal Piracy, Reconnaissance Mission, Bident of Thassa, Curiosity Crafter, Seafloor Oracle),
   Archmage Emeritus (magecraft), Future Sight, and burst draw (Pull from Tomorrow, Fact or
   Fiction, Frantic Search, Distant Melody).
3. **Cost reduction = more triggers.** More spells per turn = more Namor tokens, so discounts are a
   *payoff*, not a convenience: **The Water Crystal** (all blue spells {1} less), **Jace's Sanctum**
   and **Case of the Ransacked Lab** (instants/sorceries {1} less), Stonybrook Banneret (Merfolk/
   Wizard bodies), and the mana-dorks **Hydro-Channeler / Volshe Tideturner** that ramp
   specifically for instants/sorceries *and* count as Merfolk.

### Interaction (balanced, per pod)
The pod runs light removal, so counters are kept to a **balanced ~7, flexible / high-pip first**:
Counterspell, **Archmage's Charm** (3 pips), **Mystic Confluence** (flex, 2 pips), Disallow,
Insidious Will, An Offer You Can't Refuse, Long River's Pull. Spot removal/bounce (Pongify, Rapid
Hybridization, Reality Shift, Into the Roil, Curse of the Swine) and one-shot resets (Evacuation,
River's Rebuke, **Wanderwine Farewell**, Sleep) round it out — every one also spawns Merfolk.

## Direction pivot (v2) — what changed from the first draft

Reworked from a creature-forward Merfolk tribal list into the "accidentally Merfolk" spell engine.

- **Cut ~18 small non-lord Merfolk bodies** (Cursecatcher, Mist-Cloaked Herald, Triton Shorestalker,
  Merfolk Windrobber, Benthic Biomancer, Silvergill Adept, Merfolk Looter, River Sneak, Merfolk
  Cave-Diver, Sure-Footed Infiltrator, Neerdiv, Brineborn Cutthroat, Streambed Aquitects, Fallowsage,
  Sage of Fables, Merrow Harbinger, Merfolk Trickster, Tishana's Tidebinder, Surgespanner, Kiora).
- **Kept** the lords and the Merfolk that *serve the spell engine* (mana-dorks, Banneret, Talrand,
  Seafloor Oracle, Deepchannel Mentor finisher, Kopala/Svyelun protection).
- **Added** the token/draw/discount enchantment package + high-pip flexible interaction from the
  owner's research list.
- Net: ~19 creatures (mostly lords/engine) and ~35+ noncreature blue spells — **101 total blue pips**
  in the list, which is the real Merfolk-token output metric.

## Budget & proxies

Deck ~ **$195**. Flagged **PROXY CANDIDATES**: Cavern of Souls (~$50), Otawara (~$28), Mystic
Remora (~$13), Lord of Atlantis (~$10). Everything else is < ~$6.

## Excluded on rules/preferences (from the research list — not oversights)

- **Opposition** — creature-tap -> permanent-tap is a soft **stax lock** (non-game). Cut.
- **Secret of Bloodbending** — Mindslaver effect ("control an opponent's turn"); opponent doesn't get
  to play. Cut despite being a 4-pip trigger.
- **High Tide / Turnabout / Reset / Drain Power** — combo-ramp/untap enablers; cut in a fair deck.
- **Day of the Dragons** — exiles your own Merfolk (anti-synergy). Cut.
- **Game Changers** (Cyclonic Rift, Rhystic Study, Consecrated Sphinx, Fierce Guardianship, Thassa's
  Oracle) and **Hullbreacher** (draw denial) — excluded; analyzer GC lint reports **none**.

## Owned / candidates to evaluate later (not in deck)

- **Merrow Commerce** — owner physically owns it; untaps all Merfolk each end step (frees the
  spell-ramp dorks to double up). Strong include if a tap sub-theme grows; parked to keep the list tight.
- **Deeproot Waters vs. more copy effects** — if go-wide overperforms, add Quasiduplicate targets /
  a second copy enchantment.
- Blue "Start your engines!"/Speed artifacts (Aether Syphon, Adaptive Training Post, Rimefire Torque)
  and Mass Manipulation scaling — evaluate if the deck wants more top-end.
- Draw-payoff counters overlap with the GU +1/+1 slot (Proft's Eidetic Memory, Wizard Class L3) — kept
  light to avoid stepping on Sita Varma.
