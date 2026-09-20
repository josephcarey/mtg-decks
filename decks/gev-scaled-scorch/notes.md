# Gev, Scaled Scorch — decision log

## Status
For-fun, dirt-cheap Rakdos build. **Not** the cycle's BR slot (that's Magar of the Magic Strings).
Kept outside the cycle so it can freely reuse Rakdos + a light +1/+1-counter angle.

## Commander
**Gev, Scaled Scorch** — {B}{R}, 3/2, Ward—Pay 2 life (BLB, ~$0.40).
- Other creatures you control **enter with an extra +1/+1 counter for each opponent who lost life
  this turn.**
- Whenever you cast a **Lizard spell**, Gev deals 1 damage to target opponent.

The whole deck is built around the middle line: the counter payoff scales with **how many
opponents** lost life this turn, not how much. So the priority is cheap, repeatable, **multi-
opponent** life loss *before* you deploy your bodies.

## Theme selection (from `edhrec --themes` + `affinity`)
- Obvious: Lizard typal, burn, aggro, +1/+1 counters.
- **Non-obvious, chosen:**
  - **Group slug / symmetric pingers** — the real engine. Cards that hit *each opponent* at once
    (Impact Tremors, Spitfire Lagac, Dagger Caster, Witty Roastmaster, Reckless Fireweaver,
    Syr Konrad, Sulfuric Vortex, Pestilence) satisfy Gev's "for each opponent" for the whole table
    with one trigger.
  - **Aristocrat drains** (Blood Artist, Falkenrath Noble, Vindictive Vampire) — cheap life loss on
    your own sacrifices; note WB drains (Zulaport, Cruel Celebrant) are OUT of BR identity.
  - **Treasure / expend mana-sink** — Bloomburrow Lizards care about spent mana; treasure
    (Riveteers Requisitioner, Grim Hireling, Professional Face-Breaker, the ritual-draws) doubles as
    ramp and expend fuel.
- Fringe themes the data surfaced but skipped: reanimator, -1/-1 counters, chaos, Dragon's Approach.

## Build notes
- `analyze`: 100/100, avg MV **2.84**, only 6 cards at MV 5+ — deliberately low aggressive curve.
- Pips B 32% / R 68% (red-heavy from the burn/Lizard shell). Basics 10 Mountain / 8 Swamp.
- **Manabase (sources incl. duals):** ~25 R / ~22 B — 11 BR duals over-serve both, then basics +
  mono-utility lands tilt red to match demand. Comfortably above Karsten for the few {R}{R} cards
  (Hellspur Posse Boss, Reptilian Recruiter); B is almost all single-pip. Mudflat Village (B) even
  recurs Lizards; Rockface Village (R) is a tribal pump.
- Game Changers: none ✓.

## Budget note
The offline DB `price_usd` uses the default printing and can overstate cheap cards (Night's
Whisper and Wayfarer's Bauble are really ~$0.30 at cheapest print, not $5). Verified cheapest-print
market values, the genuine >$1 cards are:
- **Grim Hireling ~$11** — real chase (only 2 printings). CUT or proxy; not core.
- **Professional Face-Breaker ~$5**, **Torbran ~$5** (proxy), **Castle Locthwain ~$4**,
  **Unexpected Windfall ~$3.30**, **Impact Tremors ~$2.70**, **Blood Artist ~$2.65**,
  **Goblin Bombardment ~$2.45** — the rest sit $1–2 and everything else is < $1.
Only flagged proxy = Torbran. Grim Hireling should be swapped for a cheaper treasure/value card to
keep the build honestly dirt-cheap.
