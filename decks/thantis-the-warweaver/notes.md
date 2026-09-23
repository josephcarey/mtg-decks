# Thantis, the Warweaver — build notes & decision log

## Commander & identity
**Thantis, the Warweaver** — {3}{B}{R}{G} (Jund), MV 6, 3/5 Spider with reach + vigilance.
- **All creatures attack each combat if able** — yours AND every opponent's.
- **Whenever a creature attacks you or a planeswalker you control, put a +1/+1 counter on Thantis.**

The whole deck reads off the first line: Thantis is a *table-wide* forced-attack lord. Nobody's
board gets to sit back. That does two things for us: (1) opponents are shoved into attacking each
other, and (2) any attack aimed at us just grows Thantis. Everything in the 99 turns that mandatory
combat into our advantage.

## Rules notes that shaped the build
- "All creatures attack if able" is **symmetric** — our own creatures must attack too. That's why the
  deck leans on **deathtouch + reach walls** (they trade up on defense but are happy to be forced in)
  and a **Fog package** (we can force the crash, then blank the damage on the turn it would hurt us).
- Thantis only grows from attacks against **you / your planeswalkers**, not attacks you redirect
  elsewhere — so goad/redirect (Disrupt Decorum, Kardur, Agitator Ant, Bloodthirsty Blade) points the
  violence at *other* players for tempo, while punisher pieces (Revenge of Ravens, No Mercy, Marchesa's
  Decree) tax the swings that do come back at us.

## Theme selection (from `edhrec --themes` + subpages)
EDHREC theme counts for Thantis: forced-combat (613), aggro (163), **group-slug (126)**, spiders (110),
+1/+1 counters (96), tokens (71), chaos (69), **pillow-fort (110/41 punisher)**, **turbo-fog (18)**,
monarch (19), aikido (10). Chosen layering:
- **Core: Forced Combat.** Kazuul, Fumiko, Grismold, Rite of the Raging Storm — pile on "must attack"
  and make attacking *us* expensive, then Thantis balloons.
- **Sub-theme: Group Slug / Punisher** (the clever layer). Since combat is mandatory, every attack is
  taxed: Marchesa's Decree, Curse of Opulence, Revenge of Ravens, Manabarbs, Dictate of the Twin Gods,
  Court of Ire, Karazikar. Forced swings bleed the whole table.
- **Insurance: Fog.** Fog / Winds of Qal Sisma / Spore Frog / Obscuring Haze / Arachnogenesis — we
  choose the turn the forced crash lands. Arachnogenesis even makes blockers and is on-type (Spiders).
- **Wall: deathtouch + reach.** Ohran Frostfang/Viper, Obelisk Spider, Arasta, Ishkanah, Silklash,
  Sentinel Spider, Glissa — forced attackers run into deathtouch; Silklash/reach also shoots fliers.

## Manabase (per the workspace color-source guidance)
Counting every land for each color it can make (tri-lands/fetches for all three, duals for both):
- **Green 23 · Red 20 · Black 18** sources vs. pip demand **G 45% / R 33% / B 22%**.
- All three clear Karsten's double-pip threshold (~13-14) comfortably. Green (the workhorse — most
  ramp, spiders, and green payoffs) is correctly the most-served even though the BRG tri-duals
  naturally over-serve R and B; basics are tilted 7 Forest / 4 Mountain / 3 Swamp to reinforce that.
- 22 nonbasics (Command Tower/Exotic Orchard/Savage Lands, 4 fetches, 13 tap/pain/check/bounce duals,
  Swarmyard for Spiders, Rogue's Passage as a finisher outlet) + 14 basics = 36 lands.

## Budget read
Genuinely budget-friendly. **76/100 cards < $1**, 19 in the $1-5 band, only **5 cards > $5**
(≈$45 combined). Full build ≈ **$116**; drop/sub the five flagged proxies (Karazikar, No Mercy,
Arachnogenesis, Ohran Frostfang, Toski) and it's a fully functional **~$55-60** deck. Cheap in-theme
substitutes are logged in `CONSIDER.md`. Nothing about the archetype requires expensive cards — the
engine (goad, punisher enchantments, fogs, spiders) is almost entirely commons/uncommons.

## Curve / count
100/100. Avg MV 3.58 over 64 nonland, 19 at MV 5+ — a touch top-heavy, but 10 ramp sources + a 6-MV
commander justify it. If it plays clunky, the first trims are a couple of the MV5 enchantments.

## Owner-priority checklist
- **Game Changers:** none (analyzer `[g]` clean). ✓
- **Non-games:** no infinite combos, no stax, no MLD, no extra-turn chains. Forced-combat + fog is
  interactive, not a lock — opponents still get turns and can play around it. ✓
- **Day/Night:** none. ✓
- **Theme-first:** every card keys off the forced-combat engine; no raw goodstuff pile. ✓
