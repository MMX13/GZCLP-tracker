import type { EncounterDef } from '../engine/types';

type P = EncounterDef['pool'];
const e = (id: string, act: 1 | 2 | 3, pool: P, enemies: string[], weight = 1): EncounterDef => ({ id, act, pool, enemies, weight });

export const ENCOUNTER_LIST: EncounterDef[] = [
  // ---- Act 1: Mossy Hollow
  e('a1_slug', 1, 'easy', ['slug']),
  e('a1_gnat_pair', 1, 'easy', ['gnat', 'gnat']),
  e('a1_snail', 1, 'easy', ['snail']),
  e('a1_toadlet', 1, 'easy', ['toadlet']),
  e('a1_beetle', 1, 'hard', ['bark_beetle'], 2),
  e('a1_gnat_trio', 1, 'hard', ['gnat', 'gnat', 'gnat'], 2),
  e('a1_ants', 1, 'hard', ['worker_ant', 'worker_ant'], 2),
  e('a1_slug_toadlet', 1, 'hard', ['slug', 'toadlet'], 2),
  e('a1_snail_gnat', 1, 'hard', ['snail', 'gnat', 'gnat'], 1),
  e('a1_beetle_gnat', 1, 'hard', ['bark_beetle', 'gnat'], 1),
  e('a1_slug_snail', 1, 'hard', ['slug', 'snail'], 1),
  e('a1_stag', 1, 'elite', ['stag_beetle']),
  e('a1_mole', 1, 'elite', ['mole']),
  e('a1_soldier', 1, 'elite', ['worker_ant', 'soldier_ant', 'worker_ant']),
  e('a1_gloopius', 1, 'boss', ['gloopius']),
  e('a1_toad_king', 1, 'boss', ['toad_king']),

  // ---- Act 2: Glowcap Caverns
  e('a2_cricket', 2, 'easy', ['cave_cricket']),
  e('a2_moth', 2, 'easy', ['moth']),
  e('a2_slime_mold', 2, 'easy', ['slime_mold']),
  e('a2_worm_bat', 2, 'easy', ['glow_worm', 'bat']),
  e('a2_bat_pair', 2, 'hard', ['bat', 'bat'], 2),
  e('a2_centipede', 2, 'hard', ['centipede'], 2),
  e('a2_moth_glow', 2, 'hard', ['moth', 'glow_worm'], 2),
  e('a2_mold_cricket', 2, 'hard', ['slime_mold', 'cave_cricket'], 0.5),
  e('a2_moth_cricket', 2, 'hard', ['moth', 'cave_cricket'], 1),
  e('a2_centi_glow', 2, 'hard', ['centipede', 'glow_worm'], 1),
  e('a2_mold_pair', 2, 'hard', ['slime_mold', 'slime_mold'], 0.5),
  e('a2_spider', 2, 'elite', ['spider']),
  e('a2_crab', 2, 'elite', ['crystal_crab']),
  e('a2_echo', 2, 'elite', ['echo_bat']),
  e('a2_mothmother', 2, 'boss', ['mothmother']),
  e('a2_colossus', 2, 'boss', ['slime_colossus']),

  // ---- Act 3: The Blight
  e('a3_puff', 3, 'easy', ['mold_puff']),
  e('a3_rat', 3, 'easy', ['rot_rat']),
  e('a3_sprout', 3, 'easy', ['blighted_sprout']),
  e('a3_flies_pair', 3, 'easy', ['carrion_fly', 'carrion_fly']),
  e('a3_cultist', 3, 'hard', ['cultist_cap'], 2),
  e('a3_snail', 3, 'hard', ['zombie_snail'], 2),
  e('a3_flies_trio', 3, 'hard', ['carrion_fly', 'carrion_fly', 'carrion_fly'], 2),
  e('a3_sprout_rat', 3, 'hard', ['blighted_sprout', 'rot_rat'], 1),
  e('a3_puff_cultist', 3, 'hard', ['mold_puff', 'cultist_cap'], 1),
  e('a3_rat_pair', 3, 'hard', ['rot_rat', 'rot_rat'], 0.5),
  e('a3_snail_puff', 3, 'hard', ['zombie_snail', 'mold_puff'], 0.5),
  e('a3_cordyceps', 3, 'elite', ['cordyceps_knight']),
  e('a3_morel', 3, 'elite', ['morel']),
  e('a3_hydra', 3, 'elite', ['hydra_head', 'mold_hydra', 'hydra_head']),
  e('a3_queen', 3, 'boss', ['amanita_queen']),
  e('a3_heart', 3, 'boss', ['blight_heart']),
];
