# Gev — CONSIDER (running shortlist, nothing here is in the list yet)

Weigh on the next pass. All kept dirt-cheap unless noted.

## More group-slug / punisher (the engine — probably want 1–2 more)
- **Bogardan Rager** / **Bogardan Dragonheart** — cheap red bodies with damage riders.
- **Zo-Zu the Punisher** — each land ETB pings its controller (symmetric, all opponents).
- **Citadel of Pain** / **Manabarbs** — punisher enchantments; symmetric life loss each turn.
- **Kessig Flamebreather** — 1 dmg each opp on instant/sorcery (if we lean spellslinger).
- **Bastion of Remembrance** is WHITE — do NOT add (out of identity). Same for Zulaport / Cruel
  Celebrant / Corpse Knight.

## Lizard bodies not yet run
- **Common Iguana**, **Steampath Charger**, **Ravine Raider**, **Thought-Stalker Warlock**,
  **Underdark Explorer**, **Gila Courser**, **Hall Monitor**, **Shivan Sand-Mage**.
- **Kediss, Emberclaw Familiar** (~$5) — Lizard; extra-damage partner effect, group-slug-ish.

## Counter / damage multipliers (upgrade path, some $$)
- **Torbran** — already IN as the proxy.
- **Fiery Emancipation** (~$8, proxy tier) — triple damage; nutty with pings but pricey.
- **City on Fire** (~$$) — same idea, proxy tier.
- **Cathars' Crusade** (WHITE, out of identity) — no.
- **Warleader's Call** / anthem-counters — check identity before adding.

## Card advantage upgrades
- **Theater of Horrors**, **Outpost Siege**, **Bag of Holding**, **Experimental Synthesizer**.
- **Deadly Dispute** is IN; **Village Rites**, **Bitter Reunion** as cheaper sac-draw.

## Cuts weighed
- **Professional Face-Breaker** / **Grim Hireling** — DB overprices them; real ~$1–4. Keep unless we
  want a stricter budget, then cut Face-Breaker first.
- **Pestilence** — powerful symmetric slug but can kill our own small Lizards; monitor.

## Owner idea parking lot
- **Collective Inferno** (Lorwyn Eclipsed, {3}{R}{R}, ~$2, OWNED) — Convoke enchantment: choose a
  creature type, double all damage from your sources of that type. Name **Lizard** → doubles every
  Lizard ping/attack. ADDED to list (swapped in for Grim Hireling ~$11). Stacks with Torbran and
  Valley Flamecaller.
- **Impact Tremors** — owner already owns a copy (it's in the list).

## Outlaw / Mercenary sub-angle (Gev is a Lizard MERCENARY = outlaw)
Nearly every Lizard here is also a Mercenary/outlaw, so outlaw payoffs are a "free" overlay — add
only 1–2 so it stays a light splash and doesn't pull focus off life-loss/counters:
- **Rakish Crew** ({2}{B}, $0.24) — makes a 1/1 Mercenary token pinger; token ETB feeds Gev AND the
  ping is repeatable multi-turn life loss. Best fit.
- **Mine Raider** ({2}{R}, $0.14) — ETB Treasure if you control another outlaw (Gev always counts);
  ramp + expend fuel on a body.
- **Hellspur Brute** ({4}{R}, $0.24) — affinity for outlaws, gets cheap fast.
- **Mine Raider / Charred Graverobber / Boneyard Desecrator** — deeper outlaw value if we ever lean in.
- Already in list: **Hellspur Posse Boss** (gives all outlaws haste — quietly great here).

## DB pricing improvement (tooling, separate change)
Root cause: `build-db` ingests the **`oracle_cards`** bulk export, which carries ONE representative
printing's `prices.usd` — often the original/expensive print (e.g. Grim Hireling, Night's Whisper
showed inflated). Fix options, cleanest first:
1. Additionally download the **`default_cards`** bulk (all printings), stream it into a
   `Map<oracle_id, min(usd)>`, and use that min when building card rows (oracle_cards still supplies
   text/type). Gives true cheapest-print price. Cost: bigger download (~150MB compressed) + one extra
   pass. Needs a new `BulkType`, model change, and tests (repo has an 80% coverage gate).
2. Lighter stopgap: also parse `prices.usd_foil`/`usd_etched` and take the min of available — only
   marginally better, doesn't fix the "expensive default print" case.
Recommend option 1 as its own small PR so it doesn't ride along with the deck build.
