# The Wandering Minstrel — Build Notes & Decision Log

## Commander

**The Wandering Minstrel** ({G}{U}). Key text: "Lands you control enter untapped"; a
Towns-based +X/+X pump (grows with the number of Towns you control); and it makes an
Elemental. Although its casting cost is only Simic ({G}{U}), its **color identity is WUBRG
(5-color)** because of its {3}{W}{U}{B}{R}{G} activated ability. That means **any card is
legal** in the 99, which is what opens the door to the light W/B/R splashes below.

## Archetype

Simic-centered **5-color landfall**. The plan abuses "lands enter untapped" to chain
multiple land drops per turn (via extra-land-drop effects) into landfall payoffs, then
snowballs. A **go-wide token** sub-theme (Scute Swarm, Avenger of Zendikar, Emeria Angel,
Nesting Dragon, Felidar Retreat) provides the board, and a **light Waterbend package**
(Avatar: TLA keyword — effectively a Convoke + Improvise fusion, tapping creatures and
artifacts for generic mana) leans on that wide board. The **Towns** manabase does double
duty: it fixes colors and scales the commander's pump into a repeatable **overrun-style
finisher**.

## Key decisions

- **Simic-centered pips.** Green is the primary color, blue secondary, with only a light
  W/R/B splash. Because the splash cards are few, we only need ~6 any-color sources to
  reliably power them (the WUBRG pump is a late-game luxury, not an every-turn line).
- **Curve smoothing.** Arboreal Grazer and Growth Spiral get an untapped land onto the
  battlefield early, accelerating the landfall engine without clogging the top of the curve.
- **Manabase built for basic-fetching.** 39 lands including **20 basics**. Green land-fetch
  (Nature's Lore, Three Visits, Skyshroud Claim, Farseek-for-duals, etc.) can typically only
  grab **Forests**, so the basic split is Forest-heavy (**11 Forests**) to keep those fetches
  live deep into the game.
- **Guardian Project → Garruk's Uprising.** Guardian Project was cut because it does **not**
  trigger off tokens — a serious anti-synergy with our go-wide token payoffs. Garruk's Uprising
  draws off our big/first creatures and grants trample, which fits far better.
- **Budget tuning.** Trimmed from ~$458. Scapeshift → Boundless Realms; cut triomes,
  City of Brass, and Thawing Glaciers in favor of cheaper any-basic fetch and Towns.

## No Game Changers (owner's table bans the list)

- **Cyclonic Rift → Devastation Tide.** Devastation Tide actually _synergizes_: it bounces all
  nonland permanents to their owners' libraries but **leaves lands untouched**, so our landfall
  engine survives and we rebuild immediately while opponents have to recast their board.
- **Field of the Dead → Zanarkand, Ancient Metropolis** (a Town). Cutting Field removed a
  Game Changer while _adding_ a Town, bumping the Towns count to **12** and directly
  strengthening the commander's scaling pump finisher.

## Candidates to evaluate (not yet in deck)

From recent-set research — verify exact names/text on Scryfall before adding, and run through PRIORITIES.md (no Game Changers unless essential, mid-budget, avoid non-games, on-theme first).

### Landfall / ramp (Edge of Eternities — Lander tokens)

- **Lander token makers** — Landers sac to fetch a basic (enters tapped → **untapped under Minstrel**): repeatable ramp + landfall trigger. E.g. `Edge Rover` ({G}, dies → each player makes a Lander). Enumerate via Scryfall `set:eoe o:"Lander"`.
- `Eumidian Terrabotanist` ({1}{G}) — cheap landfall lifegain body.

### Landfall payoff + go-wide (Avatar — earthbend/waterbend)

- `Earthbender Ascension` ({2}{G}) — ETB ramp + landfall quest-counter engine → +1/+1/trample finisher.
- **Waterbend payoffs** (blue/white) — convoke/improvise hybrid; wide token board becomes a cost-reduction engine. Enumerate via `keyword:waterbend`.
- `Ba Sing Se` — green earthbend utility land.
- `Toph, the First Metalbender` (RGW; legal via WUBRG identity) — repeatable earthbend = recurring landfall + attacking lands.

### Token / go-wide (other recent sets)

- Tarkir: **Mobilize** (attacking Warrior tokens), **Endure** (counters-or-token), **Harmonize** (tap creatures to cast — waterbend-adjacent).
- Bloomburrow: **Offspring** creatures (ETB 1/1 token copy).

### Known-staple landfall adds surfaced by `discover`

- Tireless Provisioner, Lotus Cobra, Evolution Sage, Ancient Greenwarden (evaluate vs. budget/theme).

### Protection gap fillers (optional — deprioritized since Minstrel is cheap/recastable)

- Lightning Greaves, Snakeskin Veil, Veil of Summer, Inspiring Call, Whispersilk Cloak, Tyvar's Stand.

Reminder: Minstrel color identity is WUBRG via the {3}{W}{U}{B}{R}{G} ability, so off-color cards above are legal.
