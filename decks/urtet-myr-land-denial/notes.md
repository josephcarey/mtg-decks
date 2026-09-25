# Urtet, Remnant of Memnarch — Myr land-denial / moon-stax

Decision log & "why" history. This is the pod's **one sanctioned MLD/stax deck** and the **one
deck where Game Changers are allowed** (owner greenlit both, this deck only — see `list.txt` header).
None of this leaks into other decks.

## Core idea

Urtet turns Myr into a **land-independent mana economy**:

- The five metal Myr (Silver=U, Iron=R, Copper=G, Gold=W, Leaden=B) give perfect WUBRG fixing.
- Urtet untaps **every** Myr at the beginning of combat → tap for mana in main 1, attack, tap again
  in main 2. Effectively doubles Myr mana every turn.
- So our mana sits on **artifacts**, not lands. That's the engine that lets us blow up all lands
  (ours included) and keep casting while the table is stranded.

Three mana layers that all **survive our own Armageddon**: artifact rocks, mana Myr, and
token-mana makers — Roxanne (Meteorites, and she *doubles* artifact-token mana), Svella (Icy
Manaliths), Aerid/Tethermage/Puppetbeast (Heartwood R/G artifacts). Reality Fracture (Mirrodin
return) is the thematic home: Memnarch the Warden, Saheeli, Pia, plus the Heartwood package.

## Land denial, two axes

1. **Mass land destruction, land-only** (keeps our artifacts intact): Armageddon, Ravages of War,
   Ruination (nonbasic), Boom // Bust, Catastrophe, Fall of the Thran, Keldon Firebombers, Decree
   of Annihilation. We deliberately **skip burn-MLD** (Wildfire / Destructive Force / Burning of
   Xinye) because it kills our own 1/1 Myr.
2. **"Moon" + orb stax, one-sided vs. a nonbasic-heavy pod**: Blood Moon, Magus of the Moon, Zhao
   the Moon Slayer, Back to Basics, plus Winter Orb / Tangle Wire / Smokestack.
   - **Winter Orb is the cleanest one-sided lock**: it only stops *lands* from untapping. Our Myr
     untap normally (twice, via Urtet), so we play a full game while opponents get one land a turn.
   - **Unwinding Clock** untaps all our artifacts on every opponent's turn — with mana rocks that's
     effectively free mana + open interaction while they're orb-locked.

## The kill

Landlocked opponents lose; we grind them out with a wide Myr army. Finishers:
- Urtet's `{W}{U}{B}{R}{G}, {T}`: +3/+3 on **each** Myr (the metal Myr conveniently *are* the WUBRG).
- Cranial Plating (artifact-count voltron, movable at instant speed), Myr Battlesphere, Steel
  Overseer / Master of Etherium lords, Lodestone Myr.

## Mana-multiplier & untap layer (v2 additions)

On top of Urtet's combat untap, three cheap pieces make the Myr/rock economy explosive:

- **Kinnan, Bonder Prodigy** — whenever we tap a *nonland* permanent for mana, add one more of a
  type it produced. Doubles every Myr and every rock. Effectively Mana Reflection on a 2-drop.
- **Captain America, Living Legend** — the first time each creature taps on our turn, untap it. Free
  second tap of every mana Myr each turn (vigilance too).
- **Raggadragga, Goreguts Boss** — mana-ability creatures get +2/+2 and untap when they attack, so
  our Myr dorks become a 3/3+ army that swings *and* still makes mana. Doubles as a finisher.

**Flagged incidental combo:** Kinnan + Voltaic Construct + a rock that taps for ≥2 (Basalt Monolith,
Thran Dynamo, Palladium Myr, Myr Reservoir) is **infinite colorless mana** — Kinnan makes each tap
net positive against Voltaic's `{2}: untap`. It's assembled from independently-justified pieces
(not tutored toward as the game plan), so it's within the rules per PRIORITIES, but it *is* a real
infinite. If it feels too degenerate for even the no-holds-barred pod, cut **Voltaic Construct**
first (Captain America / Urtet / Unwinding Clock still give plenty of untap value without the loop).

## Land-death payoffs & card advantage (v3)

The real answer to "draw is our killer": our card advantage is the **artifact suite**, and the
land-death slot is better used for *payoffs than for pure draw*.

- **Skullclamp** is the workhorse draw engine — equip a 1/1 Myr (we make them everywhere: Urtet on
  cast, Battlesphere, Turbine, Saheeli, Pia), it dies, draw 2, for {1}. Repeat.
- Plus Memnarch (draw = artifacts on attack), The One Ring, Reckoner Bankbuster.
- **Dingus Egg** — every land that dies deals 2 to its controller. Our Armageddon becomes a
  table-wide burn: a pod on 6–8 lands each takes 12–16 apiece off one cast — frequently lethal. It
  also pings us for our own lands, but we run only 26 and usually go off with few in play. Best MLD
  payoff in the deck.
- **Reckless Fireweaver + Weftstalker Ardent** — ETB pingers that turn our token flood into a
  passive burn clock (every Myr/Thopter/Treasure/Sculpture/Heartwood + every rock pings the table).
  Weftstalker also catches our 12 nonartifact creatures (creature *or* artifact), so it's a strict
  upgrade; running both = a real secondary wincon stacked on Dingus Egg.
- **Titania, Protector of Argoth** — considered as a land-death army payoff; cut in v4 (owner mid
  on it) for Walking Ballista, a flexible X-mana-sink removal/wincon that also happens to be an
  artifact (metalcraft / Cranial / affinity).
- **Considered and passed for pure land-death draw:** The Gitrog Monster / Titania, Voice of Gaea —
  Gitrog-style draw wants a high land count cycling through the yard; in a 26-land deck it's
  mediocre and Gitrog's upkeep land-sac fights our plan. Kept the slots for Dingus/Titania instead.

## Witherbloom, the Balancer — affinity payoff (v3)

We run 5 sorcery MLD (Armageddon, Ravages, Ruination, Catastrophe, Decree) + 11 interaction
instants/sorceries, and we flood the board with Myr tokens, so Witherbloom's "your instants and
sorceries have affinity for creatures" is real: overloaded Cyclonic Rift for {U}, Decree of
Annihilation for {R}{R}, Catastrophe for {W}{W}, etc. He's also cheaper himself with a wide board
(affinity for creatures). Win-more if we're behind, but our board is reliably wide.

## Manabase — real source count (per PRIORITIES.md, count every source, not just basics)

Pre-wipe sources per color (any-color rock/land counts for all five):

- **Any-color (10):** Command Tower, Spire of Industry, Alloy Myr, Myr Convert, Chromatic Lantern,
  Coalition Relic, Gilded Lotus, Fellwar Stone, Arcane Signet, Mox Opal.
- **W:** 3 Plains + Gold Myr + 10 any = **14**
- **U:** 3 Island + Silver Myr + 10 any = **14**
- **B:** 2 Swamp + Leaden Myr + 10 any = **13**
- **R:** 7 Mountain + Iron Myr + 10 any = **18**  (workhorse — most MLD + all the moons are red)
- **G:** 5 Forest + Copper Myr + 10 any = **16**  (+ Aerid Heartwoods add R/G)

All colors clear Karsten's ~13–14 double-pip threshold. Double-pip cards (Back to Basics UU, Mana
Drain UU) are mid-game casts, not turn-3 asks, so the light Island/Swamp basics are fine — our
fixing is overwhelmingly artifact-based, which is the entire point. **Post-Armageddon** we lose the
26 lands but keep ~10 any-color rocks + 5 metal Myr + Mox Opal + token-mana = still full WUBRG.

Nonbasics kept deliberately low (6) because our own moons/Ruination hit them; under Blood Moon,
Command Tower/Spire/Reliquary/Ancient Tomb still tap for {R}, and we rarely need the utility lands
after the lock is online.

## Price walkthrough (keep / proxy / cut) — pod proxies freely, so nothing is cut for price

| Card | ~$ | Verdict |
|---|---|---|
| Grim Monolith | 483 | **Keep (proxy).** Best non-GC-tempo burst ramp; untaps into MLD a turn early. Scarcity, not power. |
| Mox Opal | 239 | **Keep (proxy).** 0-mana any-color rock, trivial metalcraft, survives wipes. Core. |
| Ancient Tomb | 128 | **Keep (proxy).** Explosive colorless ramp; we blow up lands anyway so its downside is moot. |
| The One Ring | 111 | **Keep (proxy).** Colorless card-advantage + a protection turn that survives our own Armageddon. |
| Mana Vault | 88 | **Keep (proxy).** Fast ramp toward the turn-4–5 lock. |
| Demonic Tutor | 62 | **Keep (proxy).** Finds the missing lock piece or a wipe. |
| Mana Drain | 51 | **Keep (proxy).** Counter + ramp; protects the lock and powers the next wipe. |
| Vampiric Tutor | 51 | **Keep (proxy).** Instant-speed toolbox to top. |
| Mana Crypt | 39 | **Keep (proxy).** Core fast mana. |
| Enlightened Tutor | 33 | **Keep (proxy).** *The* enabler — fetches Winter Orb / Blood Moon / Smokestack / Skullclamp / Cranial Plating. |
| Tangle Wire | 31 | **Keep.** Soft lock that we shrug off (our mana is on creatures/rocks). |
| Cyclonic Rift | 30 | **Keep (proxy).** Asymmetric reset that protects the board-based lock and closes games. |
| Ravages of War | 23 | **Keep (proxy).** Second Armageddon; redundancy is the plan. |
| Unwinding Clock | 21 | **Keep (proxy).** Turns the orb-lock into free mana + open interaction. |

No cuts recommended on price. The chase cards are all load-bearing for the ramp-into-lock plan.

## Open questions / next pass
- Blue is the lightest basic color (3 Island) for double-U cards (Back to Basics, Mana Drain); watch
  it in testing, though artifact fixing + Kinnan should cover it.
- Witherbloom, the Balancer was considered and benched (off-theme instant/sorcery affinity) — see
  CONSIDER.md.
