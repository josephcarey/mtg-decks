# Vraska, Soul of Stone — notes

## Concept

Jeskai ({U}{R}{W}) "artifact storm" around **Vraska, Soul of Stone** (Reality
Fracture): every noncreature spell makes a 1/1 Sculpture Treasure (sac: any
color), and artifact creatures have vigilance. Cost reducers + 0–2 MV artifacts
+ recursion loops chain spells; artifactfall payoffs (Fireweaver, Artillerist,
Impact Tremors) and storm finishers (Grapeshot, Brain Freeze, Aetherflux)
convert the chain into a kill.

The owner drafted the first 54 cards (engine, rocks, draw, bounce, wincons);
the remaining 46 were completed on 2026-10-02: +13 spells, +33 lands.

## Decisions (2026-10-02 initial completion)

- **Interaction was the big gap** in the draft — zero removal/counters beyond
  bounce. Added 7: Swords, Dispatch (metalcraft ≈ always online here), Galvanic
  Blast, Abrade, Negate, Stoic Rebuttal (affinity-style discount), Wear // Tear.
  All but Negate/Swords trigger Vraska for a Sculpture on the way through.
- **Padeem** pulls double duty (hexproof protection for the engine + draw).
  **Emry** joins the Retriever/Trawler recursion squad. **Whir + Fabricate**
  find Ashnod's Altar / Aetherflux / whichever payoff is missing.
- **Saheeli, Sublime Artificer** — every spell makes a second body; servos feed
  Fireweaver/Artillerist/Tremors triggers.
- **Budget cuts at draft time**: Swan Song ($9.8) → Negate; Inventors' Fair
  ($16.6) and Raugrin Triome ($14.4) skipped. Aetherflux Reservoir ($19.7) kept
  as the single flagged **proxy candidate** — it's the cleanest storm wincon.
- **Lands (33)**: 5 artifact lands/artifact-typed (Ancient Den, Seat of the
  Synod, Great Furnace, Darksteel Citadel, Treasure Vault) feed metalcraft,
  Master of Etherium, and Artillerist counts. Academy Ruins ($4.9) recursion.
  Low curve (avg MV 2.54) + 12 rocks + commander treasures justify 33.

## Manabase audit (sources incl. duals vs pips)

Pips: W 6 (11%) / U 31 (55%) / R 19 (34%).
Sources counting every dual/any-color land for each color it makes:
**W 11 / U 20 / R 15** (after tilting basics to 9 Island / 5 Mountain /
2 Plains). W is all single pips → 11 ≥ Karsten's ~9–10 floor; U covers the
UU/UUU cards (Whir, Hullbreaker, Stoic Rebuttal) at 20.

## Style pass (2026-10-02) — medusa/statue flavor, 65-35 cool-vs-effective

Vraska-character cards are all BG (off-identity), so the flavor angle is
petrification/statues. Swaps (EDHREC upgrades included):

| Out | In | Note |
|---|---|---|
| Tormod's Crypt | Levitating Statue | Statue that grows per Vraska trigger — near-zero power loss |
| Wear // Tear | Topple the Statue | Cantrip artifact removal; loses enchantment hit |
| Abrade | Petrify | Medusa removal; weaker vs activated-ability-less threats, pure flavor win |
| Urza's Bauble | Gorgon's Head | Flavor slot; deathtouch + commander vigilance = stone-gaze wall |
| Boros Signet | Prized Statue | Any-color treasure on enter AND death |
| Azorius Signet | Jeskai Monument | Fetches any basic + late bird-token sink |
| Everflowing Chalice | Skullclamp | EDHREC +55% syn — clamps Sculptures/servos into cards |
| Quicksmith Genius | Harmonic Prodigy | EDHREC +51% — doubles Vraska, Sai, Emry, Jhoira, Saheeli triggers |

## Side-payoff pass (2026-10-02) — "everything is cheap" dividends

Cost reducers + cast-triggers unlock cards that look expensive but aren't:

| Out | In | Why |
|---|---|---|
| First Day of Class | Mystic Forge | Cast artifacts off the top; most of the deck is 0–2 MV after reducers |
| Riddlesmith | Thought Monitor | Affinity → usually a 1–2 mana draw-two artifact |
| Retract | Paradoxical Outcome | Bounce cheerios + draw that many, then recast — strict upgrade (and $5 cheaper) |
| Negate | Kappa Cannoneer | Improvise-cast, ward 4, unblockable grower — alt wincon |
| Depthshaker Titan | The Walls of Ba Sing Se | Reducers → ~5-6 mana for "everything else indestructible"; **proxy candidate** ($24.5) |

Key ruling that shapes the deck: **Vraska triggers on cast, not resolve** —
countered spells (ours or theirs) still make Sculptures, and the Sculpture
*entering* still triggers Fireweaver/Artillerist/Tremors. Counterspell wars
feed us. (Chalice of the Void exploits this but was judged anti-synergy —
see CONSIDER.md.)

Note the paper curve rose to 2.81 avg MV, but Walls/Kappa/Thought Monitor all
cast for far less than printed via reducers/improvise/affinity.

## Haste & station follow-up (2026-10-02)

- **First Day of Class back in** (Rent Is Due out): fresh Sculptures can't
  tap-sac for mana the turn they enter (the sac ability costs {T}), so haste
  is a storm-turn ritual — every new statue immediately sacs for colored
  mana. The rest of the bypass package (Ashnod's sac, Springleaf/Moonsnare/
  Clock/Statuary tap-as-cost) works through sickness but doesn't scale per
  statue the same way.
- **Station = sickness bypass too**: stationing taps your creatures as a
  cost, so sick statues station immediately. Added:
  - **The Eternity Elevator** (for Prismatic Lens) — {T}: {C}{C}{C} even at
    0 charge; 20+ tier taps for X of any color.
  - **Inspirit, Flagship Vessel** (for Rebuild) — 8+ charge: other artifacts
    gain hexproof + indestructible; pairs with Walls of Ba Sing Se (each
    protects the other). Master of Etherium halves the statues needed.

## Price walkthrough (top cards, cheapest print)

| Card | $ | Verdict |
|---|---|---|
| Aetherflux Reservoir | 19.74 | **Proxy candidate** — chase wincon, flagged in header |
| Ashnod's Altar | 13.56 | Keep — core glue (treasures/tokens → colorless storm mana); being reprinted 2026-10, price likely to ease |
| Hullbreaker Horror | 5.78 | Keep — protection + re-storm engine |
| Whir of Invention | 5.56 | Keep — instant-speed tutor is the glue-finder |
| Retract | 5.30 | Keep — old-card scarcity, not power; core re-storm turn |
| Vedalken Archmage | 5.00 | Keep — best raw draw engine in the deck |
| Academy Ruins / Semblance Anvil / Fabricate / Urza's Bauble | ~4–5 | Keep — all core, fairly priced |

Everything else < $4.50; deck total ≈ **$139**.
