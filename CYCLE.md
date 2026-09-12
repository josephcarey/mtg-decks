# Commander Color Cycle

Meta-project: one **new** Commander deck per color identity, skipping the 4-color combos.
Colorless `{C}` counts as its own slot, so the cycle is **27 decks total**.

**Core constraint — archetype diversity:** each theme lives in exactly ONE deck across the
whole cycle (no duplicate landfall, only one spellslinger, etc.). Kindred/typal is a _rationed_
theme — spent here on Namor (Merfolk) and Torgal (Dog/Wolf).

**Owner priorities** (see `PRIORITIES.md`): no Game Changers, no non-games (infinite combo /
stax / MLD / extra-turn chains — single telegraphed extra turns and incidental combos are OK
as flagged per-deck overrides), no Day/Night, mid-budget with proxies OK, theme-first, casual
Bracket 3.

**Status:** planning complete — all commanders chosen. Each deck gets built later in its own
session, one `decks/<slug>/` folder at a time (`list.txt` + `notes.md` per repo conventions).
Nothing built yet except **The Wandering Minstrel** and **Saruman of Many Colors** (WUB).

## Mono-color

| Identity | Commander               | Archetype                                                                                   |
| -------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| W        | Balan, Wandering Knight | Equipment Voltron (budget: many W/C equipment under $5; proxy 3–4 Swords)                   |
| U        | Namor the Sub-Mariner   | Merfolk kindred (uses the kindred ration)                                                   |
| B        | The Raven Man           | Discard-matters → Bird tokens (keep FAIR, not stax)                                         |
| R        | J. Jonah Jameson        | Menace + Treasure                                                                           |
| G        | Torgal, A Fine Hound    | Human-cast + Dog/Wolf counter go-wide (uses the kindred ration; soft Dog overlap w/ Sophia) |

## Colorless

| Identity | Commander                     | Archetype                  |
| -------- | ----------------------------- | -------------------------- |
| C        | Graaz, Unstoppable Juggernaut | Juggernaut anthem beatdown |

## Two-color (guilds)

| Identity    | Commander                    | Archetype                                                                    |
| ----------- | ---------------------------- | ---------------------------------------------------------------------------- |
| WU Azorius  | Errant & Giada _(pre-built)_ | Flash / flyers value                                                         |
| UB Dimir    | Mirko, Obsessive Theorist    | Surveil-matters (self-mill value → counters + light recursion)               |
| BR Rakdos   | Magar of the Magic Strings   | Graveyard instant/sorcery → spell-creatures that recast on combat damage     |
| RG Gruul    | General Marhault Elsdragon   | Combat-trick aggro                                                           |
| GW Selesnya | Storm, Windrider             | Flyers / pillow-fort                                                         |
| WB Orzhov   | Killian, Ink Duelist         | Repartee / targeted-spells + Auras (Secrets of Strixhaven)                   |
| UR Izzet    | Shao Jun                     | Artifact-tempo assassin                                                      |
| BG Golgari  | Sarulf, Realm Eater          | Attrition / mini-apocalypse (fair: occasional resets, not a repeatable lock) |
| RW Boros    | Kolodin, Triumph Caster      | Vehicles / Mounts                                                            |
| GU Simic    | Sita Varma, Masked Racer     | +1/+1 counters / power-copy                                                  |

## Three-color

| Identity   | Commander                       | Archetype                                |
| ---------- | ------------------------------- | ---------------------------------------- |
| WUB Esper  | Saruman of Many Colors _(built)_ | Spellslinger / theft (owns spellslinger) |
| UBR Grixis | Marchesa villains _(pre-built)_ | Villain-typal                            |
| BRG Jund   | Thantis, the Warweaver          | Goad / politics                          |
| RGW Naya   | Aragorn, Hornburg Hero          | Renown counters-aggro                    |
| GWU Bant   | Sophia, Dogged Detective        | Dogs + investigate                       |
| WBG Abzan  | Bilbo, Birthday Celebrant       | Lifegain                                 |
| URW Jeskai | Kilo, Apogee Mind               | Off-color poison / proliferate           |
| BGU Sultai | Kotis, the Fangkeeper           | Combat-damage theft                      |
| RWB Mardu  | Tsagan, Raider Warlord          | First-strike aggro                       |
| GUR Temur  | Riku of Many Paths              | Modal-spells value                       |

## Five-color

| Identity | Commander                        | Archetype          |
| -------- | -------------------------------- | ------------------ |
| WUBRG    | The Wandering Minstrel _(built)_ | Landfall / go-wide |

## Notes

- **Pre-built decks that fill a slot:** Errant & Giada (WU) and Marchesa villains (UBR) are
  existing decks that officially count for the cycle. The owner's other pre-built decks are
  off-limits as _themes_ to reuse elsewhere: Shirei (mono-B sac/reanimate/aristocrats),
  sac-walls→zombies (mono-U), ship voltron (Vehicles), Giada (mono-W Angels), Blue-Black
  Zombies (UB — **not** used for the cycle; Dimir is built fresh as Mirko).
- **Speed / Start your engines!** — Far Fortune was dropped when Magar took BR, so the
  Tsagan/Far-Fortune Speed overlap is resolved. Tsagan can stay pure first-strike (or reclaim
  Speed freely, since nothing else in the cycle uses it).
