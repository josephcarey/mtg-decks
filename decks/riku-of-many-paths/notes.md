# Riku of Many Paths — build notes

## Commander & identity
**Riku of Many Paths** — {G}{U}{R} (Temur), MV 3. Whenever you **cast a modal spell**, choose up
to X, where X is the number of modes you chose on that spell:
- Exile the top card of your library; you may play it this turn (**impulsive draw**).
- Put a +1/+1 counter on Riku and it gains trample until end of turn.
- Create a 1/1 white Bird creature token with flying.

The trigger scales with **how many modes you pick**, so the deck is built around spells that let you
choose many modes — charms, commands, confluences, escalate/entwine-style cards — not just cards that
happen to have two options.

### Critical rules note
The trigger is **on cast**, and it counts the modes *you chose*. Two consequences shaped the build:
1. **Copy effects do not help.** Copying a modal spell does not "cast" it, so copy-value builds
   (which the GUR "spellslinger" instinct reaches for) are actively off-theme here. We avoided them.
2. **More modes > efficiency.** A slightly worse card that lets you choose 3 modes out-triggers a
   tighter card with 1 mode. We prioritized mode count when picking removal/utility.

## Sub-theme: impulsive-draw / "cast from exile" engine
Riku's *first* mode is itself impulsive draw, so the deck doubles down on that axis: a stack of
impulse-draw sources (Act on Impulse, Rob the Archives, Valakut Exploration, Outpost Siege,
Professional Face-Breaker, Bonehoard Dracosaur, etc.) plus **cast-from-exile payoffs**
(Wild-Magic Sorcerer, Delayed Blast Fireball, Party Thrasher) that reward the exile cards Riku
and friends keep generating. This gives the deck a coherent engine beyond "cast modal spells."

### How the sub-theme was chosen (tooling)
This sub-theme was selected with the **new `deck affinity` tool** built in the same session. Running
`bun run deck affinity modal --id gur` (and `--depth 2`) ranked the tags that co-occur with `modal`
in the Temur color identity by **lift**, surfacing the impulsive-draw / exile-cast cluster as the
most distinctive, non-generic pairing — as opposed to plain spellslinger payoffs, which are reserved
for the Saruman (WUB) deck elsewhere in the cycle.

## Archetype-diversity constraints (cycle meta)
The 27-deck color cycle reserves certain payoffs to a single deck. Riku's Bird tokens and +1/+1
counter are **incidental**, not the theme (flyers → Storm; +1/+1 counters → Sita Varma; renown →
Aragorn; spellslinger → Saruman). We deliberately leaned on **modes + impulse** so Riku stays
distinct from those decks.

## Composition
- **Ramp / fixing (11):** heavy green ramp (Cultivate, Kodama's Reach, Farseek, Nature's Lore,
  Three Visits, Growth Spiral, Sakura-Tribe Elder) + signets/rocks. Three colors + a top-end curve
  want reliable turn-2/3 ramp.
- **Modal core (20):** the engine — charms, commands, confluences, and modal answers
  (Eldrazi/Cosmium Confluence, Kozilek's/Brutal/Very Cryptic Command, Inscription of Abundance,
  Flame of Anor, Hull Breach, etc.). Every one triggers Riku, most for multiple modes.
- **Impulse / cast-from-exile engine (12) + exile-cast payoffs (3):** the sub-theme package.
- **Interaction (5):** Counterspell, Arcane Denial, Beast Within, Chaos Warp, Blasphemous Act.
- **Finishers / top-end (12):** modal/impulse-flavored bombs (Apex of Power, Aminatou's Augury,
  Etali, Tectonic Giant, Titan of Industry, Bonehoard Dracosaur) plus X-burn (Comet Storm, Fireball).
- **Lands (36):** 19 nonbasics (Temur duals/Triome/Pathways/painlands) + 17 basics.

## Manabase reasoning
Analyzer pip split came out **R 51% / G 28% / U 22%**, so basics were skewed to match:
**7 Mountain / 6 Forest / 4 Island**. Green stays well-represented despite fewer pips because the
green ramp spells fetch Forests (and duals), effectively raising green sources early. Fetch effects
are all basic-land tutors (Cultivate etc.), so the fetch-vs-basics audit is healthy — no fetch
outstrips its basic targets.

## Budget
Mid-budget (~$194 per analyzer). We dropped **Training Center** (a ~$19 marginal dual) for a cheap
untapped **Barkchannel Pathway** to hold budget discipline without hurting fixing. Remaining chase
cards flagged as **proxy candidates** in the list header: Ketria Triome, Delayed Blast Fireball,
Bonehoard Dracosaur, Eldrazi Confluence.

## Guardrails honored
No Game Changers (analyzer lint clean), no non-games (no stax / MLD / extra-turns / infinite combo),
no Day/Night cards. Singleton, exactly 100 cards.
