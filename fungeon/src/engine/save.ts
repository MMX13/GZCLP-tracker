// Save / load with version check and basic shape validation.
import type { RunState } from './types';

export const SAVE_VERSION = 1;

export function serialize(run: RunState): string {
  return JSON.stringify(run);
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isStr = (x: unknown): x is string => typeof x === 'string';
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isArr = Array.isArray;

function isCard(x: unknown): boolean {
  return isObj(x) && isNum(x.uid) && isStr(x.id) && typeof x.upgraded === 'boolean';
}
function isCardList(x: unknown): boolean {
  return isArr(x) && x.every(isCard);
}
function isStatuses(x: unknown): boolean {
  return isObj(x) && Object.values(x).every(isNum);
}

function validCombat(c: unknown): boolean {
  if (!isObj(c)) return false;
  const p = c.player;
  if (!isObj(p) || !isNum(p.hp) || !isNum(p.maxHp) || !isNum(p.block) || !isStatuses(p.statuses) || !isNum(p.energy) || !isNum(p.maxEnergy) || !isNum(p.nutrients)) return false;
  if (!isArr(c.enemies)) return false;
  for (const e of c.enemies) {
    if (!isObj(e) || !isStr(e.uid) || !isStr(e.id) || !isNum(e.hp) || !isNum(e.maxHp) || !isNum(e.block) || !isStatuses(e.statuses)) return false;
    if (typeof e.alive !== 'boolean' || !isArr(e.history) || !isObj(e.mem)) return false;
  }
  if (!isCardList(c.draw) || !isCardList(c.hand) || !isCardList(c.discard) || !isCardList(c.compost)) return false;
  if (!isArr(c.garden) || !c.garden.every((g) => g === null || (isObj(g) && isCard(g.card) && isNum(g.growth)))) return false;
  if (c.pending !== null && !isObj(c.pending)) return false;
  return isNum(c.turn) && isNum(c.nextEnemyUid) && isObj(c.counters) && isObj(c.mem) && isStr(c.kind) && isStr(c.phase);
}

function validScreen(s: unknown): boolean {
  if (!isObj(s) || !isStr(s.kind)) return false;
  switch (s.kind) {
    case 'map':
    case 'victory':
      return true;
    case 'defeat':
      return isStr(s.cause);
    case 'combat':
      return validCombat(s.combat);
    case 'reward':
      return isArr(s.rewards) && s.rewards.every((r) => isObj(r) && isStr(r.kind)) && isStr(s.title);
    case 'rest':
      return typeof s.done === 'boolean';
    case 'shop':
      return isObj(s.shop) && isArr(s.shop.cards) && isArr(s.shop.relics) && isArr(s.shop.potions) && isNum(s.shop.removePrice);
    case 'event':
      return isObj(s.event) && isStr(s.event.id) && isStr(s.event.page) && isObj(s.event.mem);
    case 'treasure':
      return typeof s.opened === 'boolean' && isStr(s.relicId);
    case 'bossRelic':
      return isArr(s.options) && s.options.every(isStr);
    case 'cardSelect':
      return isStr(s.purpose) && isArr(s.candidates) && s.candidates.every(isNum) && isNum(s.count) && validScreen(s.returnTo);
    default:
      return false;
  }
}

function validRun(o: unknown): o is RunState {
  if (!isObj(o) || o.version !== SAVE_VERSION) return false;
  if (!isStr(o.seed) || !isObj(o.rng)) return false;
  for (const k of ['map', 'combat', 'rewards', 'shop', 'events', 'misc']) if (!isNum(o.rng[k])) return false;
  for (const k of ['ascension', 'hp', 'maxHp', 'gold', 'act', 'floor', 'nextUid', 'rareOffset', 'potionChance', 'fightsThisAct']) if (!isNum(o[k])) return false;
  if (![1, 2, 3].includes(o.act as number)) return false;
  if (!isCardList(o.deck)) return false;
  if (!isArr(o.relics) || !o.relics.every((r) => isObj(r) && isStr(r.id) && isNum(r.counter))) return false;
  if (!isArr(o.potions) || !o.potions.every((p) => p === null || isStr(p))) return false;
  const m = o.map;
  if (!isObj(m) || !isObj(m.nodes) || !isArr(m.visited) || !isStr(m.bossId) || !(m.current === null || isStr(m.current))) return false;
  for (const n of Object.values(m.nodes)) {
    if (!isObj(n) || !isStr(n.id) || !isNum(n.floor) || !isNum(n.lane) || !isStr(n.type) || !isArr(n.next)) return false;
  }
  if (!validScreen(o.screen)) return false;
  const st = o.stats;
  if (!isObj(st) || !Object.values(st).every(isNum)) return false;
  if (!isArr(o.bosses) || o.bosses.length !== 3 || !o.bosses.every(isStr)) return false;
  if (!isArr(o.seenEncounters) || !isArr(o.seenEvents)) return false;
  return true;
}

/** Returns null for corrupt / incompatible saves. */
export function deserialize(json: string): RunState | null {
  try {
    const o: unknown = JSON.parse(json);
    return validRun(o) ? o : null;
  } catch {
    return null;
  }
}
