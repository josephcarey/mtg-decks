# Sachi, Daughter of Seshiro — build notes

## Why Sachi (swap from Torgal)

The mono-Green (G) cycle slot was planned as **Torgal, A Fine Hound** (Human-cast + Dog/Wolf
counter go-wide). Swapped to **Sachi, Daughter of Seshiro** — still inside the kindred ration
(repointed Dog/Wolf → Snake/Shaman), but a stronger build-around with much deeper pool support.

Verified text (offline corpus): `{2}{G}{G}`, MV 4, Snake Shaman —
*Other Snakes you control get +0/+1; Shamans you control have "{T}: Add {G}{G}."*

**The payoff is the ramp, not the anthem.** The +0/+1 is negligible. The engine is
"every Shaman taps for {G}{G}", and green's best value creatures ARE Shamans, so the ramp
package doubles as the value package:

- Sakura-Tribe Elder (Snake **Shaman** — double tribal), Fauna Shaman, Eternal Witness,
  Reclamation Sage, Oracle of Mul Daya, Silverback Elder, Allosaurus Shepherd — all tap for
  {G}{G} under Sachi while still doing their normal job.
- **Patron of the Orochi** untaps all Forests + all green creatures once/turn = re-tap every
  Shaman dork for a second {G}{G} burst. Best mana payoff in the deck.

Pool depth is not a concern: 118 mono-G Shamans, 101 mono-G Snakes in the corpus.

## Plan

Ramp hard (29 ramp sources) → dump into fatties / X-effects → close with an overrun
(Craterhoof, End-Raze Forerunners, Overwhelming Stampede, Overrun, Pathbreaker-style anthems,
Nissa ult). Snakes are a light tribal spine (Sachi's buff + a couple of payoffs), not hard
tribal — the Snake "matters" pool is thin (really just Patron + Sachi herself), so we lean
Shaman-ramp with a Snake flavor.

## Manabase

Mono-green, so **zero fixing needed** — pip demand is G 90 (100%), and every land makes green.
35 lands is on the low side numerically but backed by 29 ramp sources (12 mana dorks + Karametra's
Acolyte devotion dork + 6 ramp spells + land-into-play effects), so effective land count is much
higher. 28 Forest + 7 utility lands that don't cost us fixing:

- Castle Garenbrig (burst mana for creatures), Path of Ancestry (tribal scry),
  Myriad Landscape / Blighted Woodland (ramp lands), Mosswort Bridge (hideaway payoff),
  Rogue's Passage (make a fatty unblockable to close), Ghost Quarter (interaction).
- Cut Nykthos, Shrine to Nyx ($53) — devotion is only OK in a creature-heavy build and it's
  not worth the price tag.

## Power / legality guardrails

- **No Game Changers** — `analyze` lint reports none ✓. Notably excluded: Seedborn Muse
  (corpus flags it as a Game Changer) and The Great Henge (owner-named, $65).
- **No non-games** — no infinite mana combos; big-mana is a value engine, not a lock. Watch
  Patron of the Orochi + mana dorks (it's a single burst, not repeatable within a turn).
- **No Day/Night.**
- Bracket 3 casual: theme-first, semi-optimized.

## Expensive-card walkthrough (owner always asks)

Kept the proxy count at 4; trimmed scarcity-priced non-core cards.

| Card | ~$ | Verdict |
| --- | --- | --- |
| Allosaurus Shepherd | 52 | PROXY — mana dork + uncounterable protection (core) |
| Green Sun's Zenith | 35 | PROXY — flexible tutor (grab Sachi-fuel or a finisher) |
| Sylvan Library | 28 | PROXY — premium card advantage |
| Craterhoof Behemoth | 26 | PROXY — iconic finisher |
| Nykthos | 53 | CUT → Forest |
| Pathbreaker Ibex | 20 | CUT → Nissa, Voice of Zendikar (~$3 token/anthem payoff) |
| Fanatic of Rhonas | 16 | CUT → Karametra's Acolyte (~$1 devotion dork, more mana) |
| Guardian Project | 15 | CUT → Elemental Bond (~$0.30, near-identical draw engine) |
| Heroic Intervention | 16 | KEEP — single premium board protection, mid-budget OK |

Deck total after trims: ~$320 (≈$141 of that is the 4 proxies → real spend ≈$180).

## Status

Draft awaiting owner sign-off. On approval: flip the G row in `CYCLE.md`
(Torgal → Sachi) and update the kindred-ration note.
