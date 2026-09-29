# Cards, Keepsakes and Brews (design table)

Source: `src/content/cards*.ts`, `powers.ts`, `relics.ts`, `potions.ts`. Table below generated from the code.
Columns: name | id | cost (+N = Bloom cost nutrients) | type | rarity | effect (keywords in parens) | upgrade changes.

## Archetype rationale
- **Rot**: Toxic Drip = 5 Rot for 1 (same as StS Deadly Poison); payoffs Touch of Rot (multiply), Putrefy (cash in), Contagion, Rot Wave. Slow Simmer/Fairy Ring/Doomcap give passive Rot.
- **Garden**: 10 plants (blooming + perennial). Fertilize/Green Thumb/Bumper Crop/Harvest Time accelerate; Root Network and Fairy Ring pay per plant/bloom. Root Whip rewards having any plant.
- **Compost -> Nutrients**: Mulch/Prune/Puffball etc. feed Nutrients; Bloom-cost cards (Mycelium Lash, Rootbound, Harvest Moon, Spore Surge, Grave Soil, Mushroom Cloud, Circle of Life, Second Spring) spend them at roughly 2-3 dmg/block per nutrient. Decomposer turns Compost into damage.
- **Spore tokens**: Sow Spores / Puffball Pop / Spore Sack / Sporefall / Mother of Spores create tokens (kept to <= ~2 tokens per Spore of energy since tokens are free to play). Spore-adic Fire rewards many cheap plays.
- **Generic**: Bonk-tier attacks, blocks, Keep blocks, Might (Puff Up, Growth Spurt), Sturdy (Toughen Up), draw (Shiitake Shuffle, Forage, Truffle Shuffle).

## Engine assumptions (not obvious)
- `nutrients` on a CardDef: engine must check the player has >= N Nutrients and spend them when playing (in addition to Spore cost).
- Cost `'X'`: `v.x` is injected into `vals` before `play` (Spore Whirl, Sporefall).
- `api.choose({action:'compost'|'discard'|'topdeck'|'toHand'})`: engine applies the action to chosen cards, then calls `afterChoice` with them. min 1 choices (Mulch, Shiitake Shuffle, Circle of Life) must auto-skip if there are no candidates. `from:'options'` with `options` (Forager's Pick) puts the chosen option into the hand (action 'toHand') and afterChoice receives it (it then gets `setCost(uid,0,true)`).
- `growPlants(99)` (Harvest Time): perennials just fire onGrow once; blooming plants must bloom.
- `api.combat.counters.bloomsCombat` must be updated synchronously during `growPlants` (Bumper Crop); `attacksPlayedTurn` / `cardsPlayedTurn` are read inside `onCardPlayed`/`play`: Smooth Pebble assumes the current attack is already counted (<=1); Spore-adic Fire treats the count as including itself (min 1).
- Power statuses: stacks = magnitude. Playing a second copy stacks. `onTurnStart` on the player's statuses/relics must also fire on turn 1 (Dewdrop Vial, Tiny Lantern, Downy Feather use `combat.turn === 1`).
- `onEnemyDeath` for statuses/relics: the dead enemy's `statuses` must still be readable through `api.enemy(uid)` (Rot Wave reads its Rot).
- `onAttacked` should fire even when the hit is fully blocked (Venom Cap); `attacker` may be checked against PLAYER.
- `onApplyRot` from relics: Rotten Candle applies extra Rot from inside the hook; it is guarded by `api.mem.rotten_candle` to avoid recursion.
- Relic `passive.restHealBonus` is treated as percentage points (15 = +15%); `shopDiscount` as fraction (0.2). Boss relic `Crown of Caps` uses `passive.maxEnergy: 1`; `Nightcap` uses `passive.handSize: 2`.
- Relic per-combat counters use `api.mem` (keys prefixed with relic id); no relic needs a counter persisting across combats (the `counter` field is unused).
- `api.gainBlock(n, false)` is used by relics (no Sturdy/Brittle) and `useModifiers` default for cards.
- Boss relic downsides implemented via onPickup (Heart of the Grove: -12 max HP), `noHealAtRest` (Ironbark Seed), addCardToPlayer Mold (Crown of Caps), loseHp at end of turn (Nightcap).
- `Api.addCard(..., upgraded)` is used for Spore+ (Puffball Pop+, Mother of Spores, Spore Flask).

## Cards
| Name | id | Cost | Type | Rarity | Effect | Upgrade |
|---|---|---|---|---|---|---|
| Bonk | bonk | 1 | attack | starter | Deal 6 damage. | dmg=9 |
| Cap Up | cap_up | 1 | skill | starter | Gain 5 Block. | blk=8 |
| Spore Puff | spore_puff | 1 | attack | starter | Deal 3 damage. Apply 3 Rot. | dmg=4 rot=4 |
| Seedling | seedling | 1 | plant | starter | Each turn: gain 3 Block. Bloom: draw 2 cards. [Plant 3] | blk=4 draw=3 |
| Spore | spore | 0 | attack | token | Deal 3 damage. Apply 1 Rot. (compost) | dmg=4 rot=2 |
| Mold | mold | -1 | status | special | At end of turn, if in hand, lose 2 HP. (unplayable) | - |
| Slime | slime | 1 | status | special | Does nothing. Gross. (compost) | - |
| Burr | burr | -1 | status | special | It sticks to everything. (unplayable,fleeting) | - |
| Mildew | mildew | -1 | curse | special | A damp, clingy smell. (unplayable) | - |
| Doubt | doubt | -1 | curse | special | At end of turn, if in hand, gain 1 Wilted. (unplayable) | - |
| Fun-guy Fisticuffs | fungi_fisticuffs | 1 | attack | common | Deal 4 damage 2 times. | dmg=5 |
| Enoki Needles | enoki_needles | 1 | attack | common | Deal 3 damage to a random enemy 3 times. | dmg=4 |
| Spore Spray | spore_spray | 1 | attack | common | Deal 4 damage to ALL enemies. | dmg=6 |
| Root Whip | root_whip | 1 | attack | common | Deal 5 damage. +4 if you have a Plant. | dmg=6 bonus=5 |
| Puffball Pop | puffball_pop | 1 | attack | common | Deal 3 damage. Add a Spore to your hand. | dmg=4 sup=1 |
| Gill Slice | gill_slice | 1 | attack | common | Deal 5 damage. Apply 2 Rot. | dmg=6 rot=3 |
| Portobello Punch | portobello_punch | 2 | attack | common | Deal 12 damage. | dmg=16 |
| Cap Slam | cap_slam | 1 | attack | common | Deal 6 damage. Put a discarded card on top of your draw pile. | dmg=9 |
| Bark Armor | bark_armor | 1 | skill | common | Gain 5 Block. (keep) | blk=7 |
| Mulch | mulch | 1 | skill | common | Gain 6 Block. Compost a card from your hand. | blk=8 |
| Shiitake Shuffle | shiitake_shuffle | 1 | skill | common | Draw 2 cards. Discard a card. | draw=3 |
| Forage | forage | 1 | skill | common | Gain 4 Block. Draw 1 card. | blk=6 |
| Toxic Drip | toxic_drip | 1 | skill | common | Apply 5 Rot. | rot=7 |
| Fester Cloud | fester_cloud | 2 | skill | common | Apply 4 Rot to ALL enemies. | rot=6 |
| Drizzle | drizzle | 1 | skill | common | Apply 2 Soggy. Draw 1 card. | soggy=3 |
| Bramble Coat | bramble_coat | 1 | skill | common | Gain 5 Block. Gain 2 Prickly. | blk=6 prickly=3 |
| Dewdrop Sip | dewdrop_sip | 1 | skill | common | Gain 4 Block. Gain 3 Regrow. | blk=5 regrow=4 |
| Sow Spores | sow_spores | 1 | skill | common | Add 2 Spores to your hand. | spores=3 |
| Snappy Sprout | snappy_sprout | 1 | plant | common | Each turn: hit a random enemy for 3. Bloom: 3 Rot to ALL. [Plant 2] | dmg=4 rot=4 |
| Fern-ando | fern_ando | 2 | plant | common | Each turn: gain 3 Block. [Perennial] | cost 1; blk=4 |
| Puffball | puffball | 1 | plant | common | Bloom: deal 10 damage to ALL enemies. [Plant 2] | dmg=14 |
| Bramble Patch | bramble_patch | 1 | plant | common | Each turn: gain 1 Prickly. Bloom: gain 8 Block. [Plant 3] | prickly=2 |
| Touch of Rot | touch_of_rot | 1 | skill | uncommon | Multiply the target's Rot by 2. (compost) | times=3 |
| Stinkhorn | stinkhorn | 2 | attack | uncommon | Deal 8 damage. Apply 4 Rot. | dmg=11 rot=6 |
| Putrefy | putrefy | 1 | skill | uncommon | The target loses HP equal to its Rot. | cost 0 |
| Contagion | contagion | 1 | skill | uncommon | Give the target's Rot to all other enemies. | cost 0 |
| Fairy Ring | fairy_ring | 1 | power | uncommon | Whenever a plant blooms, apply 2 Rot to ALL enemies. | n=3 |
| Decomposer | decomposer | 1 | power | uncommon | Whenever you Compost a card, hit a random enemy for 2. | n=3 |
| Slow Simmer | slow_simmer | 2 | power | uncommon | At the start of your turn, apply 2 Rot to ALL enemies. | n=3 |
| Root Network | root_network | 1 | power | uncommon | At end of turn, gain 2 Block per Plant. | n=3 |
| Green Thumb | green_thumb | 1 | power | uncommon | At the start of your turn, your Plants grow 1 extra. | kw innate |
| Glowcap | glowcap | 1 | plant | uncommon | Bloom: gain 2 Spores and draw 2 cards. [Plant 2] | draw=3 |
| Thorny Vine | thorny_vine | 2 | plant | uncommon | Each turn: deal 3 damage to ALL enemies. [Perennial] | dmg=4 |
| Sunflower | sunflower | 2 | plant | uncommon | Each turn: gain 1 Might. Bloom: gain 2 Sturdy. [Plant 3] | cost 1 |
| Fertilize | fertilize | 1 | skill | uncommon | Grow all Plants by 1. Gain 4 Block. | n=2 blk=5 |
| Mycelium Lash | mycelium_lash | 1 +2N | attack | uncommon | Deal 14 damage. | dmg=19 |
| Rootbound | rootbound | 1 +2N | skill | uncommon | Gain 14 Block. | blk=19 |
| Harvest Moon | harvest_moon | 0 +3N | skill | uncommon | Gain 2 Spores. Draw 2 cards. | bloom 2 |
| Spore Surge | spore_surge | 1 +2N | skill | uncommon | Add 3 Spores to your hand. (compost) | spores=4 |
| Grave Soil | grave_soil | 1 +1N | skill | uncommon | Apply 7 Rot. | rot=10 |
| Prune | prune | 1 | skill | uncommon | Compost up to 2 cards from your hand. Draw that many. | cost 0 |
| Hibernate | hibernate | 2 | skill | uncommon | Gain 12 Block. (keep) | blk=16 |
| Puff Up | puff_up | 1 | skill | uncommon | Gain 2 Might. | might=3 |
| Toughen Up | toughen_up | 1 | skill | uncommon | Gain 2 Sturdy. | sturdy=3 |
| Spore Whirl | spore_whirl | X | attack | uncommon | Deal 4 damage to ALL enemies X times. | dmg=5 |
| Forager's Pick | foragers_pick | 1 | skill | uncommon | Choose 1 of 3 random cards. It costs 0 this turn. (compost) | up=1 |
| Spore Sack | spore_sack | 2 | skill | uncommon | Add 4 Spores to your hand. (innate,compost) | spores=5 |
| Spore-adic Fire | sporadic_fire | 1 | attack | uncommon | Deal 2 damage for each card played this turn. | dmg=3 |
| Spore Heart | spore_heart | 1 | power | rare | At the start of your turn, add 1 Spore to your hand. | n=2 |
| Growth Spurt | growth_spurt | 3 | power | rare | At the start of your turn, gain 2 Might. | cost 2 |
| Rot Wave | rot_wave | 1 | power | rare | Whenever an enemy dies, spread its Rot to ALL enemies. | cost 0 |
| Venom Cap | venom_cap | 1 | power | rare | Whenever you are attacked, apply 2 Rot to the attacker. | n=3 |
| Doomcap | doomcap | 2 | plant | rare | Bloom: deal 10 damage and apply 10 Rot to ALL enemies. [Plant 3] | dmg=14 rot=14 |
| Ancient Oak | ancient_oak | 3 | plant | rare | Each turn: gain 5 Block and hit a random enemy for 5. [Perennial] | blk=7 dmg=7 |
| Bumper Crop | bumper_crop | 1 | skill | rare | Grow all Plants by 2. Draw a card for each Bloom. | n=3 |
| Harvest Time | harvest_time | 2 | skill | rare | Grow all Plants until they Bloom. | cost 1 |
| Mushroom Cloud | mushroom_cloud | 2 +4N | attack | rare | Deal 18 damage to ALL enemies. | bloom 3; dmg=22 |
| Circle of Life | circle_of_life | 1 +3N | skill | rare | Return a card from your Compost pile to your hand. | bloom 2 |
| Second Spring | second_spring | 1 +2N | skill | rare | Heal 6 HP. Gain 3 Regrow. (compost) | heal=9 regrow=4 |
| Truffle Shuffle | truffle_shuffle | 0 | skill | rare | Gain 1 Spore. Draw 2 cards. (compost) | draw=3 |
| Death Cap | death_cap | 2 | attack | rare | Deal 10 damage. Apply 8 Rot. (compost) | dmg=13 rot=11 |
| Mother of Spores | mother_of_spores | 2 | skill | rare | Add 4 Spore+ to your hand. (compost) | spores=5 |
| Downpour | downpour | 1 | skill | rare | Apply 2 Soggy and 2 Wilted to ALL enemies. (compost) | cost 0 |
| Sporefall | sporefall | X | skill | rare | Add X+1 Spores to your hand. | plus=2 |

## Keepsakes (relics)
| Name | id | Rarity | Effect |
|---|---|---|---|
| Lucky Acorn | lucky_acorn | starter | End of combat: heal 5. |
| Dewdrop Vial | dewdrop_vial | common | Turn 1: gain 8 Block. |
| Tiny Lantern | tiny_lantern | common | Turn 1: +1 Spore. |
| Downy Feather | downy_feather | common | Turn 1: draw 2 extra. |
| Brass Button | brass_button | common | Start of combat: 1 Sturdy. |
| Pinecone | pinecone | common | Start of combat: 2 Prickly. |
| Honey Jar | honey_jar | common | +7 max HP. |
| Rotten Candle | rotten_candle | common | First Rot application each combat: +3 Rot. |
| Thimble | thimble | common | Every 3rd Compost: gain 4 Block. |
| Smooth Pebble | smooth_pebble | common | First Attack each turn: 2 Block. |
| Ticking Bell | ticking_bell | uncommon | Every 3rd turn: +1 Spore. |
| Mossy Bracer | mossy_bracer | uncommon | Cards give +1 Block. |
| Hand Lens | hand_lens | uncommon | Attacks deal +2 to enemies with Rot. |
| Snail Shell | snail_shell | uncommon | Start of combat: 3 Armored. |
| Beetle Horn | beetle_horn | uncommon | Enemy dies: +1 Might. |
| Old Bone | old_bone | uncommon | First Compost each turn: +1 extra Nutrient. |
| Four-Leaf Clover | four_leaf_clover | uncommon | Planting a Plant: 3 Block. |
| Mossy Teacup | mossy_teacup | uncommon | Rest heals +15%. |
| Brass Compass | compass | rare | +1 card reward choice. |
| Moonpetal | moonpetal | rare | Bloom: +1 Spore. |
| Spore Locket | spore_locket | rare | Each turn: add a Spore to hand. |
| Amber Fossil | amber_fossil | rare | Start of combat: 3 Nutrients. |
| Sunstone | sunstone | rare | Plants grow 1 extra each turn. |
| Grave Blossom | grave_blossom | rare | Enemy dies: 4 Rot to ALL. |
| Crown of Caps | cap_crown | boss | +1 Spore/turn; a Mold shuffled into draw pile each combat. |
| Heart of the Grove | heart_of_the_grove | boss | +2 Garden plots; -12 max HP. |
| Ironbark Seed | ironbark_seed | boss | Start: 4 Sturdy, 3 Prickly; no healing at Rest. |
| Nightcap | nightcap | boss | +2 cards drawn/turn; lose 2 HP at end of turn. |
| Haggler's Purse | coin_purse | shop | -20% shop prices. |
| Traveling Satchel | traveling_satchel | shop | +1 Brew slot. |
| Potted Sprout | potted_sprout | shop | +1 Garden plot. |
| Golden Spore | golden_spore | event | Start: 1 Might, 1 Sturdy. |
| Old Map | old_map | event | -15% shop prices; Rest +10%. |

## Brews (potions)
sting_brew (12 dmg), moss_tonic (10 Block), clarity_dew (draw 3), spark_syrup (+2 Spores), rot_tincture (8 Rot), spore_flask (3 Spore+), mighty_mead (3 Might), sturdy_sap (3 Sturdy + 3 Prickly), healing_honey (heal 15), growth_gel (plants +2), nutrient_nectar (3 Nutrients), plague_flask (7 Rot ALL), elder_elixir (2 Spores, draw 3, 8 Block).
