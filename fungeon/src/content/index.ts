// Content registry: every definition the engine can look up by id.
import type { CardDef, EncounterDef, EnemyDef, EventDef, PotionDef, RelicDef, StatusDef } from '../engine/types';
import { CARD_LIST } from './cards';
import { RELIC_LIST } from './relics';
import { POTION_LIST } from './potions';
import { STATUS_LIST } from './statuses';
import { POWER_STATUS_LIST } from './powers';
import { ENEMY_LIST } from './enemies';
import { ENCOUNTER_LIST } from './encounters';
import { EVENT_LIST } from './events';

function byId<T extends { id: string }>(list: T[], what: string): Record<string, T> {
  const map: Record<string, T> = {};
  for (const item of list) {
    if (map[item.id]) throw new Error(`Duplicate ${what} id: ${item.id}`);
    map[item.id] = item;
  }
  return map;
}

export const CARDS: Record<string, CardDef> = byId(CARD_LIST, 'card');
export const RELICS: Record<string, RelicDef> = byId(RELIC_LIST, 'relic');
export const POTIONS: Record<string, PotionDef> = byId(POTION_LIST, 'potion');
export const STATUSES: Record<string, StatusDef> = byId([...STATUS_LIST, ...POWER_STATUS_LIST], 'status');
export const ENEMIES: Record<string, EnemyDef> = byId(ENEMY_LIST, 'enemy');
export const ENCOUNTERS: Record<string, EncounterDef> = byId(ENCOUNTER_LIST, 'encounter');
export const EVENTS: Record<string, EventDef> = byId(EVENT_LIST, 'event');
