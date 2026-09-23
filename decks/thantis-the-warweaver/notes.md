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

## The "I'm forced to attack too" tension (and the fix)
Thantis's forced-attack clause is symmetric — our own creatures must attack each combat *if able*.
That undercuts deathtouch, which is most valuable on defense (a tapped attacker can't block). Three
outs keep it in our favor, and the build leans on all three:
- **Defender walls are exempt** — a creature with defender isn't "able" to attack, so it's never
  forced in. These are the best blockers here *and* several ramp: **Sylvan Caryatid** (any-color,
  hexproof, untappable mana wall), **Hornet Nest** (can't attack, and spawns 1/1 flying **deathtouch**
  Insects whenever it's dealt damage — it literally punishes the attacks we force onto it), and
  **Brimstone Trebuchet** (defender + reach that taps to ping each opponent — a group-slug pinger that
  never leaves home).
- **Vigilance** attackers swing without tapping and still block — Thantis itself and Sentinel Spider.
- A forced deathtouch attacker still deters blocks (whatever stops it dies), so the tap-dorks that
  do swing (Frog Butler, Deathbloom Gardener) aren't dead weight; the Fog package covers the
  open-board turns where we needed the blocker back. **Rampart Architect** flips the clause fully
  into an upside: it's forced to attack, but its attack trigger spits out a 1/3 Wall token every
  combat, and when our walls chump-die we ramp a basic — closing the wall→ramp loop.
- **The Walls of Ba Sing Se** (proxy, {8} colorless defender) gives the whole board indestructible:
  our deathtouchers still destroy attackers, our creatures can't be killed back, and Blasphemous
  Act becomes a one-sided wrath.
- **Sequencing:** cast Thantis in the **second main phase** — it's summoning-sick anyway, and casting
  post-combat keeps mana up for a Fog/removal instead of tapping out pre-combat.

## Recent-set additions (Hobbit / Marvel)
- **Attercop** ({1}{G}, The Hobbit) — Spider with reach + deathtouch + a landfall pump; cheap ideal
  wall that bites forced attackers, blocks fliers, and grows off our ramp-heavy landfall.
- **Puppet Master, String Puller** ({2}{R}, Marvel) — "whenever you attack, goad a creature." Thantis
  forces us to attack every combat, so this is a repeatable per-turn goad engine that steers an
  opponent's creature elsewhere each combat.
- **Ares, God of War** ({1}{B}{R}, Marvel) — attacks each combat and returns our attacking creatures
  to hand when they die; a cheap forced-attacker with built-in recursion for the bodies we're forced
  to send in.
Cut to make room (curve trim): Sentinel Spider (vanilla wall), Fumiko the Lowblood (weakest enabler
once goad went deep), Where Ancients Tread (redundant with Warstorm Surge). MV5+ 17 → 16.

## Curve / count
100/100. Avg MV 3.52 over 64 nonland, 17 at MV 5+. Smoothed across two passes by leaning into
**deathtouch mana dorks** and **defender ramp-walls**: cut Rampant Growth / Nature's Lore / Wood Elves
/ Overwhelming Stampede / Poison Dart Frog / Noxious Newt / Wrecking Ogre; added Frog Butler /
Deathbloom Gardener / Sylvan Caryatid (ramp) + Hornet Nest / Brimstone Trebuchet (defender walls).

## Deathtouch mana dorks (ramp that also walls)
All ~$0.20-0.30, recent-set forward. In a forced-combat deck these are higher-value than plain ramp
spells: they fix mana AND stand back as deathtouch walls that trade up against the attacks Thantis
forces, chump to survive, and feed Thantis counters. Frog Butler (any color, gains reach) and Poison
Dart Frog (reach, gains deathtouch) even help against fliers. Noxious Newt replaces itself into board
wipes. Deathbloom Gardener is a rock-solid any-color body. More options logged in CONSIDER.md
(Leyline Prowler, Deathcap Cultivator).

## Owner-priority checklist
- **Game Changers:** none (analyzer `[g]` clean). ✓
- **Non-games:** no infinite combos, no stax, no MLD, no extra-turn chains. Forced-combat + fog is
  interactive, not a lock — opponents still get turns and can play around it. ✓
- **Day/Night:** none. ✓
- **Theme-first:** every card keys off the forced-combat engine; no raw goodstuff pile. ✓
