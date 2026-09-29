import type { EnemyDef } from '../engine/types';
import { ACT1_ENEMIES } from './enemies-act1';
import { ACT2_ENEMIES } from './enemies-act2';
import { ACT3_ENEMIES } from './enemies-act3';

export const ENEMY_LIST: EnemyDef[] = [...ACT1_ENEMIES, ...ACT2_ENEMIES, ...ACT3_ENEMIES];
