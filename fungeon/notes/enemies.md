# Enemies, encounters, events (encounter/event designer notes)

Files: `src/content/enemies.ts` (aggregates `enemies-act1/2/3.ts`, helpers in `enemies-util.ts`), `encounters.ts`, `events.ts`.
All enemies rhythm-based (`cyc()` = repeat a fixed move sequence by `history.length`), fully telegraphed. Blight-level scaling is engine-side.

## Engine support needed (please verify)
1. **Own-death hook**: `EnemyDef.hooks.onEnemyDeath(api, 0, deadUid)` must fire for the *dying enemy's own hooks* (with `api.self` = dying enemy), even though it is dead. Used by slime_mold (split 2 slimelets), mold_puff (explode: attack + Mold), zombie_snail (revive), mold_hydra (also reacts to other heads dying: it needs to receive `onEnemyDeath` for other enemies; the dead enemy must still be findable in `combat.enemies` with its `id`).
2. **onHpLoss hook** for enemies (`api.self` = enemy; called after hp is reduced). Used for boss phase changes at 50% (`crossed()` sets `self.mem[flag]`, so it fires once). Death by the same hit: hp<=0 is ignored.
3. **Summons during hooks/turns**: `api.spawnEnemy(id,'right')` must work during player turns too (hooks) and after the killing blow (slime_mold splits). Max 5 alive enemies (we check `api.enemies().length < 5` beforehand; a dying enemy should be counted as dead).
4. **Zombie snail revive** uses spawn-a-new-snail (mem.revived=1, hp=maxHp/2). Victory check must happen AFTER death hooks so the fight doesn't end before the revived snail appears. Counts one extra kill; fine.
5. **Ooze Colossus Absorb**: kills slimelets with `api.loseHp(uid, 999)`; this should fire enemyDeath normally.
6. **Soggy on player**: decays at PLAYER turn end, so Soggy applied on an enemy turn needs **2 stacks** to affect the next enemy attack (1 does nothing). All enemy Soggy applications use 2. Wilted 1 lasts the next player turn; Wilted 2 lasts two.
7. **Events**: after `ctx.selectCards(...)` I return `'screen'` and set `run.screen.event.page` beforehand to the follow-up page (`setPage`). If the engine instead wants the returned page id, it can be ignored. For `'eventCustom'` selections `onCardSelect` is used (Beetle Bazaar); it mutates `run.deck` directly to remove the traded card. `ctx.giveRewards` with card rewards uses `run.nextUid++` for uids.
8. `api.addCardToPlayer('burr'|'slime'|'mold', ...)` and `ctx.addCard('mildew'|'doubt')` assume those ids exist in cards.ts.
9. Relic ids used directly: `golden_spore`, `old_map`. Others via `randomRelicId`.
10. Enemy `gainBlock(n,false)` is used for enemy self-block (no modifiers). Thorns/Prickly on enemies are applied via `S.prickly`.

## Enemies (hp, moves, pattern)
Pattern letters use the order shown; `[a,b,c]` repeats. Damage listed is base (before Might / Blight scaling).

### Act 1
| id | hp | moves | pattern | threat |
|---|---|---|---|---|
| slug | 26-30 | Slime Spit 5+Soggy2, Slug Bump 8 | [spit,bump,bump] | Soggy sets up its bumps; block after spit |
| gnat | 8-10 | Nibble 2x2, Sting 4+Wilted1 | [nibble,sting,nibble] | Come in 2-3; kill fast |
| bark_beetle | 34-38 | Scratch 5, Bark Up (12 block), Ram 15 | [scratch,harden,ram] | Big hit every 3rd turn |
| snail | 30-34 | Shell Bump 7, Hide (6 block); Shelled 2 | [bump,hide,bump] | Tanky, low dmg |
| worker_ant | 15-18 | Rally (+1 Might all), Bite 5, Lunge 8 | 1st ant [rally,bite,bite]; 2nd [bite,bite,lunge] | Kill the rallier first |
| toadlet | 20-23 | Hop 7, Tongue Lash 5+Slime | [hop,lash,hop] | Clogs deck |
| stag_beetle (E) | 84-90 | Polish (10 blk, +1 Might, Armored 2), Lower Antlers (8 blk), Antler Charge 23, Shield Bash 9 | [polish,charge,lance,bash] | Telegraphed charge; must block 23+ |
| mole (E) | 74-80 | Claw 8, Dig Up 4+2 Burr, Burrow (10 blk, Armored 2), Maul 12; Growing 1 | 4-cycle | Scales, clogs draw |
| soldier_ant (E) | 60-64 (+2 worker ants) | Battle Orders (+1 Might all, 6 blk), Mandible Stab 10, Charge 6x2 | [command,stab,charge] | Group dps; kill soldier or ants first |
| gloopius (B) | 165-175 | Slime Wave 7+Soggy2, Great Glop 13, Ooze Up 12 blk, Flail 7x2 | P1 [wave,glop,ooze]; at 50% splits into 2 slugs; P2 [flail,wave,glop] | Split adds ~55 HP |
| toad_king (B) | 175-185 | Royal Swat 9, Tongue Grab 7+2 Slime, Gather Weight (8 blk,+1 Might), Belly Flop 21 | [swat,tongue,gather,flop]; 50%: 2 toadlets | Big flop after gather turn |

### Act 2
| id | hp | moves | pattern | threat |
|---|---|---|---|---|
| moth | 40-46 | Wing Dust 7+Wilted2, Flutter Slam 14 | [dust,dust,flutter] | Weakens your dmg |
| cave_cricket | 44-50 | Brace (10 blk), Big Hop 17 | [brace,hop] | Alternating; block every other turn |
| slime_mold | 50-56 | Smother 9+Soggy2, Glob 13, Ooze (8 blk); splits into 2 slimelets on death | [smother,glob,ooze] | Bad for AoE-light decks |
| glow_worm | 36-40 | Glow (+2 Might all), Nibble 6 | [glow,bite,bite] | Priority target in groups |
| bat | 42-46 | Flurry 4x3, Drain 7 (heals for dmg dealt) | [flurry,drain,flurry] | Punishes low block |
| centipede | 56-62 | Sting 8+Wilted1, Skitter 3x5, Coil (10 blk, +1 Prickly); Prickly 2 | [sting,skitter,coil] | Prickly hurts multi-hit; multi-hit vs Might |
| spider (E) | 128-138 | Spin Web (Brittle2 + 2 Burr), Venom Bite 10+Rot3, Pounce 16 | 3-cycle | Brittle + clog |
| crystal_crab (E) | 148-158 | Raise Claws (10 blk, +2 Shelled), Crushing Pinch 24, Snip 10; Shelled 5 | [raise,crush,snip] | Huge block; DPS check |
| echo_bat (E) | 124-134 | Screech (Soggy2+Wilted1), Echo 5x2, 7x2, 9x2, ECHO! 12x2 | 5-cycle escalating | Block the escalating echoes |
| mothmother (B) | 295-305 | Lullaby Call (12 blk, 2 mothlings), Dust Storm 9+Wilted2+Brittle2, Swoop 17, Lamp Frenzy 6x4 | P1 [call,storm,swoop,storm]; 50%: Growing 1, P2 [frenzy,storm,call,swoop] | Adds + debuffs |
| slime_colossus (B) | 305-315 | Ooze Out (2 slimelets), Colossal Slam 16, Absorb (+8 blk/+1 Might per slimelet), Wobble 10+Soggy2 | [spawn,slam,absorb,wobble]; 50%: +2 Might | Kill slimelets before absorb |
| slimelet (m) | 9-11 | Dribble 4, Splat 6 | alt | |
| mothling (m) | 12-14 | Flutter 5, Dust Puff 3+Wilted1 | alt | |

### Act 3
| id | hp | moves | pattern | threat |
|---|---|---|---|---|
| mold_puff | 44-50 | Mold Puff 8+Mold, Sporulate (mold_bud), Spore Cough 12; explodes on death (5 dmg + Mold) | 3-cycle | Clogs deck |
| rot_rat | 46-52 | Plague Bite 9+Rot2, Skitter 5x3 | [plague,skitter,skitter] | Rot on player |
| blighted_sprout | 58-66 | Thrash 8, Twig Lash 5x2; Growing 1 | [thrash,lash,thrash] | Clock: kill it early |
| carrion_fly | 22-26 | Rot Bite 4+Rot1, Buzz 3x2 | [bite,buzz,bite] | Swarm of 3: rot stacks |
| zombie_snail | 68-74 | Gnaw 12, Hunker 10 blk, Rotten Slime 7+Soggy2; Shelled 3; revives once at half HP | 3-cycle | Two health bars |
| cultist_cap | 62-68 | Chant (+2 Might), Heavy Strike 13 | [chant,strike,strike] | Scales |
| cordyceps_knight (E) | 188-198 | Spore Cast (Sporeling, +1 Prickly), Fungal Lance 20, Swipe 11+Wilted1; Prickly 3 | 3-cycle | Prickly + adds |
| morel (E) | 178-188 | Copycat Rot 6+Rot4, Copycat Guard 14blk +1 Might, Copycat Plant (6 blk, Regrow5), Forager Chop 18 | [rot,block,chop,plant,chop] | Attrition |
| mold_hydra (E) | 92-100 + 2 hydra_head (50-56 each) | Spit Mold 7+Mold, Hydra Roar (10 blk, all Regrow5), Chomp 14; +2 Might per fallen head | [spit,roar,chomp] | 3 bodies; heads have Regrow 2 |
| amanita_queen (B) | 395-405 | Decree (12 blk, 2 sporelings), Scepter 16, Spore Storm 8+Wilted1+Rot2, Coronation (+2 Might, sporeling), Bloom Barrage 9x3, Poison Kiss 26 | P1 [decree,scepter,storm,scepter]; 50%: Growing 1 + 25 block; P2 [crown,barrage,kiss,storm] | Phases |
| blight_heart (B) | 425-435 | Pulse 11+Mold, Gather Blight (15 blk,+1 Might), Rot Wave 8+Rot5; P2: Hard Pulse 15+Mold, Spawn Buds (15 blk, 2 mold_bud), Rot Tsunami 10+Rot7; Shelled 3 | [pulse,gather,wave]; 50%: Growing 1 + P2 cycle | Rot wave every 3 turns |
| sporeling / hydra_head / mold_bud (m) | 10-12 / 50-56 / 8-10 | small | | |

## Encounters (weights in parentheses, default 1)
- **Act 1 easy**: slug; gnat x2; snail; toadlet. **hard**: bark_beetle (2); gnat x3 (2); worker_ant x2 (2); slug+toadlet (2); snail+gnat x2; bark_beetle+gnat; slug+snail. **elite**: stag_beetle; mole; worker_ant+soldier_ant+worker_ant. **boss**: gloopius; toad_king.
- **Act 2 easy**: cave_cricket; moth; slime_mold; glow_worm+bat. **hard**: bat x2 (2); centipede (2); moth+glow_worm+moth (2); slime_mold+cave_cricket (2); moth+cave_cricket; centipede+glow_worm; slime_mold x2. **elite**: spider; crystal_crab; echo_bat. **boss**: mothmother; slime_colossus.
- **Act 3 easy**: mold_puff; rot_rat; blighted_sprout; carrion_fly x2. **hard**: cultist_cap (2); zombie_snail (2); carrion_fly x3 (2); blighted_sprout+rot_rat (2); mold_puff+cultist_cap; rot_rat x2; zombie_snail+mold_puff. **elite**: cordyceps_knight; morel; hydra_head+mold_hydra+hydra_head. **boss**: amanita_queen; blight_heart.

Encounter ids: `a1_*`, `a2_*`, `a3_*` (see encounters.ts). Sleeping Bear event uses `a1_stag` / `a2_crab` / `a3_morel`.

## Events
| id | acts | choices |
|---|---|---|
| wishing_well | 1-3 | Pay 50 Acorns: 65% common Keepsake / 35% Mildew; pay 1 Acorn: 50% heal 8; leave |
| snail_postman | 1-2 | Pay 30: Brew + common card; read letter: +35 Acorns, -6 HP -> reply: upgrade random card; leave |
| ring_fairy | 1-3 | Dance: upgrade 2 random, -5 max HP; sway: heal 12; leave |
| compost_heap | 1-2 | Rummage: remove a card, -5 HP; dig: +45 Acorns + Mildew; leave |
| old_map | 1-2 | Take Old Map + Doubt; copy: +30 Acorns; leave (only if no old_map) |
| golden_spore | 1-3 | Grab: Golden Spore, -10 HP; pay 40: Golden Spore; leave (only if no golden_spore) |
| beetle_bazaar | 1-2 | Trade a card for common Keepsake; 35 Acorns: Brew; sell all Brews for 25 each; leave |
| glowing_pond | 1-3 | Transform a card; drink: heal 18 + Mildew; bottle: Brew, -4 HP; leave |
| sleeping_bear | 1-3 | Sneak: 65% +25 Acorns / 35% -8 HP; honey: +8 max HP, heal 15, elite fight; leave |
| spore_library | 1-3 | 35 Acorns: pick 1 of 3 (2 unc + 1 rare); -8 HP: 1 of 3 rares; upgrade a card; leave |
| cordyceps_whisper | 3 | -12 max HP: rare Keepsake; upgrade 3 random + 2 Mildew; leave |
| friendly_frog | 1-2 | Hug: heal 14; 20 Acorns: heal 25 + Brew; joke: 50% +30 Acorns / 50% -4 HP |
| rain_storm | 1-3 | 20 Acorns: heal 10 + 4 max HP; shelter: heal 12; -8 HP: Brew |
| tea_party | 1-3 | Sip: heal 15 -> (another cup: heal 10 + Doubt / scones: Brew / leave); pocket spoon: +20 Acorns; leave |

## Balance doubts
- Soldier ant elite: soldier (10/12 dmg) + 2 ants with stacking Might could be ~20 dmg/turn early; if too hard, drop Battle Orders Might to first cycle only.
- Act 3 bosses are DPS checks (425 HP); the Heart's Rot Tsunami (Rot 7 = 28 total dmg if not cleansed) is the main spike. Watch Rot-cleanse availability.
- Multi-hit enemies (Centipede 3x5, Echo Bat) get strong from Might/Growing.
- Gloopius total ~225 HP incl. slugs; consider 150 if long.
