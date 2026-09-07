# Namor the Sub-Mariner — Build Notes & Decision Log

## Commander

**Namor the Sub-Mariner** ({1}{U}{U}, mono-U). Text:

- Flying.
- **Namor's power is equal to the number of Merfolk you control** — a scaling evasive threat.
- **Whenever you cast a noncreature spell with one or more blue mana symbols in its mana
  cost, create that many 1/1 blue Merfolk creature tokens.**

Color identity is strictly **mono-blue**, so the 99 is all `U`/colorless.

## Archetype — Merfolk kindred + blue-spell token engine

Fills the **U (mono-blue)** slot. The plan is a wide, evasive **Merfolk kindred** board that the
lords pump, closed out by **Namor as a flying finisher that grows with every Merfolk**.

The key insight that keeps this distinct from the cycle's spellslinger slot (Saruman, WUB): Namor's
second ability makes **interaction and card draw part of the kindred plan**. Every blue noncreature
spell spawns Merfolk equal to its blue pips — **Counterspell = 2 Merfolk**, so playing a normal
blue tempo/control game simultaneously grows the board, feeds the lords, and pumps Namor. This is a
*Merfolk token* engine, not a "spells matter" identity — the payoffs are creatures, not storm/copy.

## Key decisions

- **37 Merfolk bodies + token generation.** Density matters twice here (lord anthems *and*
  Namor's power), so nearly every creature slot is a Merfolk. ~19 blue noncreature spells each
  add Merfolk on cast, so the effective count trends much higher.
- **Lord suite (10).** Lord of Atlantis / Master of the Pearl Trident (islandwalk + anthem),
  Merfolk Sovereign & Streambed Aquitects (make Merfolk unblockable), Coralhelm Commander,
  Vodalian Hexcatcher, Attuma (anthem + draw on attack), Svyelun (ward + card draw + near-
  indestructible), Emperor Mihail II (cast Merfolk off the top + extra tokens), Namor, Scourge
  of the Seas.
- **Deepchannel Mentor** = the overrun button: makes *all* Merfolk unblockable for the alpha strike.
- **Interaction doubles as ramp for the board.** The counter/removal suite (Counterspell,
  An Offer You Can't Refuse, Whirlwind Denial, Pongify, Rapid Hybridization, Reality Shift,
  Into the Roil, Blink of an Eye) is all cheap and blue-pipped, so it triggers Namor while the
  pod runs light removal (per PRIORITIES).
- **Mass tempo, not stax.** Evacuation / River's Rebuke / Coastal Breach are one-shot bounce
  resets that also trigger Namor — they buy tempo without locking anyone out (PRIORITIES: no
  non-games). Deliberately **no** infinite combos, stax, MLD, or extra turns.
- **Protection is light on purpose.** Namor is {1}{U}{U} and easily recast, so per PRIORITIES we
  invest little in protecting him — just Swiftfoot Boots + Whispersilk Cloak (the Cloak also turns
  a scaling Namor into an unblockable kill). Kopala + Svyelun give the *team* resilience instead.

## Budget & proxies

Deck ≈ **$210**. Flagged **PROXY CANDIDATES**: Cavern of Souls (~$50), Otawara (~$28), Mystic
Remora (~$13), Lord of Atlantis (~$10). Merrow Commerce is **owned** (kept despite ~$18 market
price — no proxy needed). Trimmed marginal pricey upgrades per PRIORITIES: cut **Swan Song**
(cheaper counters do the job), **Sea Gate Loremaster** and **Alandra, Sky Dreamer** (pricey, and
Alandra's Drakes are off-kindred), and skipped Minamo/Nykthos/Chain of Vapor as not worth the money.

## Excluded on rules/preferences (not oversights)

- **Game Changers:** Cyclonic Rift, Rhystic Study, Consecrated Sphinx, Fierce Guardianship,
  Thassa's Oracle — all skipped (the analyzer's `game_changer` lint reports **none** in the list).
- **Non-games:** **Hullbreacher** (draw denial) and **Thassa's Oracle** (combo win) skipped on the
  no-non-games preference — note these are *not* flagged by the GC lint, so they were cut by hand.
  **Wanderwine Prophets** cut (extra turns). **Whelming Wave** cut (bounces our own Merfolk too).
- **Off-identity:** green Merfolk (Kumena, Deeproot Elite, Merfolk Mistbinder, Cold-Eyed Selkie,
  Merfolk Skydiver) are illegal in mono-U and excluded.
- No Day/Night cards (owner dislike) — none are relevant here anyway.

## Candidates to evaluate later (not in deck)

- **Herald of Secret Streams** + a light +1/+1-counter package (Deeproot lines) — deferred to avoid
  overlapping Sita Varma's GU counters slot.
- **Master of Waves** (devotion Elemental tokens) — strong but off-kindred (Elementals, not Merfolk).
- **Merrow Reejerey** untap synergies / more tap-payoffs to exploit Merrow Commerce.
- Cheap card-quality that also triggers Namor twice: any premium **{U}{U}** instants.
