# Fungeon — Game Design Document

A mobile-first roguelike deckbuilder about a small, brave mushroom adventurer.
**Tone:** cozy, silly, warm (think *Animal Crossing* meets *Slay the Spire*).
**Play:** crunchy, tight, readable. Every number matters, every turn is a puzzle.

---

## 1. Design pillars (from genre research)

Lessons pulled from Slay the Spire, Monster Train, Balatro, Dominion, Inscryption, Wildfrost:

1. **Perfect information on the enemy side.** Enemies telegraph *intents* (exact damage) so each turn is a
   solvable puzzle: "how much do I block vs. how much do I push damage?" (StS).
2. **Deck thinning is as strong as deck growth.** Skipping card rewards must be a real option; removal,
   Compost (exhaust) and upgrades are the tools. Every card reward screen has a *Skip*.
3. **Archetypes that interlock.** Four synergy axes that each work alone but combine (see §4). A deck
   should *feel* like it's becoming something by floor 8.
4. **Few keywords, deep interactions.** ≤ 12 keywords total. Each has an icon + tap-to-explain tooltip.
5. **Resource tension.** Spores (energy) is the main constraint; Nutrients is a slow secondary resource
   that rewards planning over multiple turns; Garden plots are a spatial constraint.
6. **Short sessions.** A full run ≈ 30–40 minutes; fights ≈ 2–4 minutes. Auto-save after every action
   so a phone call never kills a run.
7. **Readable at thumb size.** Portrait 360×640 minimum. Cards readable in hand; tap-to-zoom.
8. **Juice.** Damage numbers, screen shake, card fly-ins, squash-and-stretch mushrooms, soft sounds.

## 2. Run structure

- **3 Acts** ("Biomes"), each a branching map of **10 floors + boss** (floor 11).
  1. **Mossy Hollow** — forest floor. Slugs, beetles, gnats.
  2. **Glowcap Caverns** — bioluminescent cave. Moths, cave crickets, slime molds.
  3. **The Blight** — a corrupted, rotting grove. Mold, rival fungi, the final boss.
- Map: 5 lanes wide, ~2–4 nodes per row, paths never cross. Player picks next node from connected nodes.
- Node types & act-1 weights: Fight 45%, Event 22%, Elite 8% (never floors 1–4), Rest 12%, Shop 8%,
  Treasure fixed on floor 6 (the middle). Floor 1 is always Fight. Floor 10 is always Rest.
- Clearing a boss: pick 1 of 3 boss keepsakes (or skip), heal 75% of missing HP, advance act.
- Win = defeat the Act 3 boss.

## 3. Combat rules

- Player: 70 max HP (Pip the Button Mushroom). HP persists across fights.
- **Spores** (energy): 3 per turn, refilled each turn, unspent Spores are lost.
- Draw 5 each turn. Hand limit 10 (extra draws are discarded with a small puff).
- **Block** absorbs attack damage and hp-loss from attacks. Resets at start of the owner's turn.
- Enemies show an **intent** icon with exact (modified) damage.

### Turn order
**Player turn start:** block → 0; player start-of-turn status ticks (Rot); Spores refill; relic/power
`onTurnStart`; Garden: each plant grows +1 and triggers `onGrow`, then blooms if it reached maturity;
draw 5.
**Player acts:** play cards / use Brews.
**Player turn end:** power/relic `onTurnEnd`; Fleeting cards in hand are Composted; hand discarded
(except Keep cards); player's turn-decaying statuses (Soggy, Wilted, Brittle) tick down by 1.
**Enemy turn:** for each living enemy in order: block → 0; Rot ticks; execute intent; then its
decaying statuses tick down. Then all enemies roll next intent.

### Damage formula
`attack damage = floor((base + Might) × (Wilted on attacker ? 0.75 : 1) × (Soggy on target ? 1.5 : 1))`, min 0.
Block formula: `floor((base + Sturdy) × (Brittle ? 0.75 : 1))`, min 0.
Rot and "lose HP" ignore Block and modifiers.

## 4. Pip's four archetypes

1. **Rot** (poison). Apply Rot; enemies lose HP equal to Rot at the start of their turn, then Rot −1.
   Payoffs: multiply Rot, trigger Rot immediately, spread Rot to all.
2. **Garden** (plants). *Plant* cards go into one of 3 Garden plots instead of the discard pile. Each
   player turn they grow +1 and do something small; when they reach maturity they **Bloom** (a big
   one-shot effect) and return to the discard pile. Perennials never bloom and act every turn.
   Payoffs: Fertilize (grow plants immediately), more plots, effects that scale per plant.
3. **Compost → Nutrients.** Any card that is *Composted* (exhausted) grants **+1 Nutrient**. Nutrients
   persist for the whole combat. **Bloom cost** cards (green leaf gem) require and spend Nutrients in
   addition to Spores, and are powerful.
4. **Spores tokens.** Cards create **Spore** tokens (0 cost: deal 3 damage, apply 1 Rot, Compost).
   Spores feed all three other archetypes: cards-played counters, Rot, and Nutrients via Compost.

Generic: strong basic attacks/blocks, card draw, Might and Sturdy scaling.

## 5. Keywords & statuses (canonical names — use exactly these)

| Keyword | Meaning |
|---|---|
| **Compost** | When played, remove from combat (goes to Compost pile). +1 Nutrient. |
| **Fleeting** | If still in hand at end of turn, it is Composted. |
| **Keep** | Not discarded at end of turn. |
| **Innate** | Starts every combat in your opening hand. |
| **Unplayable** | Cannot be played. |
| **Plant (N)** | Goes into a Garden plot. Grows each turn; blooms at N growth. |
| **Perennial** | Plant that never blooms. |
| **Bloom cost** | Also costs N Nutrients. |

| Status | Kind | Effect | Decay |
|---|---|---|---|
| Might | buff | +N attack damage | permanent (combat) |
| Sturdy | buff | +N Block from cards | permanent |
| Prickly | buff | When attacked, deal N damage back | permanent |
| Regrow | buff | End of turn heal N, then N−1 | self-decays |
| Soggy | debuff | Takes 50% more attack damage | −1 per owner turn end |
| Wilted | debuff | Deals 25% less attack damage | −1 per owner turn end |
| Brittle | debuff | Gains 25% less Block | −1 per owner turn end |
| Rot | debuff | Start of turn: lose N HP, then N−1 | self-decays |
| Shelled | buff | End of turn: gain N Block | permanent (enemies) |
| Growing | buff | End of turn: gain N Might | permanent (enemies) |
| Armored | buff | Keeps Block between turns | N turns |

Power cards create additional named statuses (defined alongside cards).

Status cards/curses added by enemies: **Mold** (Unplayable. At end of turn if in hand, lose 2 HP),
**Slime** (Cost 1. Compost. Does nothing), **Burr** (Unplayable, Fleeting). Curses (from events):
**Mildew** (Unplayable), **Doubt** (Unplayable, at end of turn gain 1 Wilted).

## 6. Content targets

- **Cards:** 4 starter + ~64 Pip cards (22 common / 26 uncommon / 16 rare) + tokens/statuses/curses.
  Every card has an upgrade (+) that is meaningfully better (not just +1 damage when avoidable).
- **Keepsakes (relics):** ~30 (common/uncommon/rare/boss/shop/starter).
- **Brews (potions):** ~12. 3 slots.
- **Enemies:** Act 1: 6 normal, 3 elite, 1 boss (pick 1 of 2 bosses per act? → 2 bosses per act if
  time permits). Act 2 and 3 similar. Encounters: "easy pool" for the first 3 fights of an act, "hard pool" after.
- **Events:** ~14, each with 2–3 choices and real trade-offs.

## 7. Economy & numbers

- Gold ("**Acorns**"): start 99. Normal fight 12–20, elite 28–38, boss 90.
- Card rewards: 3 choices. Normal: common 60 / uncommon 34 / rare 6. Elite: 45/42/13. Boss: all rare.
  Rare chance offset: +1% per non-rare seen, reset on rare (pity).
- Upgraded card in reward: act 1: 0%, act 2: 15%, act 3: 30%.
- Brew drop: 40% base, −10% on drop, +10% on no drop.
- Shop: 5 Pip cards (2 common, 2 uncommon, 1 rare, one random on sale 50%), 3 keepsakes, 3 brews,
  card removal 75 (+25 per use). Prices: common 45–55, uncommon 68–82, rare 135–165,
  keepsake common 140–160 / uncommon 220–260 / rare 280–320 / shop 150, brew 48–75.
- Rest (**Dewdrop Glade**): Rest = heal 30% max HP, or Nurture = upgrade a card.
- After a boss: heal 75% of *missing* HP when entering the next act.
- Starting deck (10): 4× Bonk, 4× Cap Up, 1× Spore Puff, 1× Seedling.
- Starter keepsake: **Lucky Acorn** — at end of combat, heal 5 HP.

## 8. Difficulty ("Blight Levels")

Unlock level N+1 by winning at level N. Up to 10. Each level adds (cumulative):
1 elites more common · 2 normal enemies +10% HP · 3 elites +10% HP · 4 bosses +10% HP & damage ·
5 heal less at rest (25%) · 6 start with 1 Mildew · 7 normal enemy damage +10% · 8 fewer acorns (−25%) ·
9 start at 90% HP · 10 act 3 boss gets an extra phase-2 buff (Growing 2).

## 9. Style guide

- **Palette** (warm forest): cream `#fff4e0`, moss `#6b8f47`, deep moss `#3d5a2a`, cap red `#d9534f`,
  mushroom beige `#e8c9a0`, spore gold `#f2c14e`, glow teal `#4fd1c5`, blight purple `#7b4a9e`,
  ink `#2b2118` (outlines). Dark UI background is a deep earthy `#1f1a14` → `#2d2419` gradient.
- **Art:** chunky SVG, 3–4 px dark outlines (`#2b2118`), flat fills + one soft highlight, round
  shapes, big eyes with white glints. Idle "breathing" squash animation for all creatures.
- **Type:** "Fredoka" (headings, numbers — rounded & friendly), "Nunito" (body). Numbers on cards
  and HP are bold and large.
- **Card frame colors:** Attack = cap red, Skill = moss green, Power = spore gold, Plant = teal,
  Status/Curse = blight purple. Cost gem top-left (spore icon), Bloom cost leaf gem below it.
- **Copy voice:** short, punny, kind. "Bonk!", "Cap Up", "You have been composted." Flavor text on
  events is 1–3 sentences.
- **Touch:** min 44px targets. Tap card → lifts & shows details; tap target enemy (or drag up) to play;
  non-targeted cards play on second tap or drag. Long-press any status/keyword/keepsake for tooltip.

## 10. Enemy roster (ids are canonical — art and content must use these exact ids)

Player character: `pip` — Pip, a round button mushroom with a cream cap, tiny satchel and a twig sword.

| Act | Tier | id | Name | Concept |
|---|---|---|---|---|
| 1 | normal | `slug` | Soggy Slug | Slimy, applies Soggy, medium hits |
| 1 | normal | `gnat` | Gnat | Tiny flier, 2× small hits; comes in groups of 3 |
| 1 | normal | `bark_beetle` | Bark Beetle | Blocks a lot, then big hit |
| 1 | normal | `snail` | Shellby | Shelled; hides (block) and bumps |
| 1 | normal | `worker_ant` | Worker Ant | Comes in pairs; one buffs Might, one attacks |
| 1 | normal | `toadlet` | Toadlet | Tongue lash; shuffles Slime into your deck |
| 1 | elite | `stag_beetle` | Sir Stagsworth | Armored knight beetle; charges up a huge hit |
| 1 | elite | `mole` | Mole Miner | Burrows (Armored), digs up Burr cards, Growing |
| 1 | elite | `soldier_ant` | Soldier Ant | Comes with 2 worker ants; buffs allies |
| 1 | boss | `gloopius` | Grand Slug Gloopius | Big slime slug; Soggy spam; splits into 2 slugs at half HP |
| 1 | boss | `toad_king` | Old King Warts | Toad on a lily pad; tongue grabs cards (adds Slime), belly-flop |
| 2 | normal | `moth` | Dusty Moth | Wing dust applies Wilted |
| 2 | normal | `cave_cricket` | Cave Cricket | Hops: alternates big hit / block |
| 2 | normal | `slime_mold` | Slime Mold | Splits into 2 `slimelet` when killed |
| 2 | normal | `glow_worm` | Glow Worm | Glows (buffs allies' Might), weak |
| 2 | normal | `bat` | Pipistrelle | Multi-hit, drains (heals) |
| 2 | normal | `centipede` | Centipede | Many-legged multi-hit ×5, Prickly |
| 2 | elite | `spider` | Webweaver | Web: Brittle + adds Burr; poison bite |
| 2 | elite | `crystal_crab` | Quartz Crab | Big Shelled; slow heavy pinches |
| 2 | elite | `echo_bat` | Echo Bat | Screech (Soggy+Wilted), escalating hits |
| 2 | boss | `mothmother` | Mothmother | Summons mothlings, dust storm, lamp-drawn frenzy |
| 2 | boss | `slime_colossus` | Ooze Colossus | Huge; absorbs slimelets for block/Might |
| 3 | normal | `mold_puff` | Mold Puff | Adds Mold to your deck, explodes on death |
| 3 | normal | `rot_rat` | Rot Rat | Applies Rot to you, fast |
| 3 | normal | `blighted_sprout` | Blighted Sprout | Corrupted mushroom kid; Growing |
| 3 | normal | `carrion_fly` | Carrion Fly | Swarm of 3, Rot bites |
| 3 | normal | `zombie_snail` | Zombie Snail | Shelled, revives once at half HP |
| 3 | normal | `cultist_cap` | Death Cap Cultist | Chants (Might), heavy strike |
| 3 | elite | `cordyceps_knight` | Cordyceps Knight | Infected ant knight; Prickly, spawns spores |
| 3 | elite | `morel` | Morel the Rival | Rival forager; copies your tricks: Rot, block, plants |
| 3 | elite | `mold_hydra` | Mold Hydra | 3 heads = 3 enemies (`hydra_head`), regrow |
| 3 | boss | `amanita_queen` | Queen Amanita | Red-and-white royal toadstool; phases; summons `sporeling` |
| 3 | boss | `blight_heart` | The Blight Heart | Pulsing purple mass; every 3 turns a huge Rot wave |
| any | minion | `slimelet`, `mothling`, `sporeling`, `hydra_head`, `mold_bud` | — | small summons |

Balance target for a competent player at Blight 0: ~45–60% win rate; median death in act 2–3.
