// Combat engine: turn flow, damage math, hook dispatch and the Api implementation handed to content code.
// Everything here mutates the (already cloned) RunState in place and pushes GameEvents in the order things happen.
import type {
  Api,
  CardInstance,
  CardDef,
  CombatState,
  EnemyAiCtx,
  EnemyState,
  EntityId,
  GameEvent,
  Hooks,
  PendingChoice,
  PlantState,
  PlayerCombat,
  RunState,
  StatusId,
  Vals,
} from './types';
import { PLAYER, S } from './types';
import { findEnemy, findPotion, findRelic, findStatus, getCard } from './registry';
import { cardCost, cardKeywords, cardNutrients, cardVals, isUnplayable } from './cardutil';
import { randInt, shuffle, stream } from './rng';

export const HAND_LIMIT = 10;
export const BASE_HAND = 5;
export const BASE_ENERGY = 3;
export const BASE_PLOTS = 3;
export const MAX_LIVING_ENEMIES = 7;
const MAX_HOOK_DEPTH = 20;

/** Errors thrown by content hooks are caught and recorded here (also console.error'd unless quiet). */
export const engineLog = { quiet: false, errors: [] as string[] };

export function safe(label: string, fn: () => void): void {
  try {
    fn();
  } catch (e) {
    logError(label, e);
  }
}
function safeVal<T>(label: string, fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (e) {
    logError(label, e);
    return fallback;
  }
}
function logError(label: string, e: unknown): void {
  const msg = `${label}: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`;
  engineLog.errors.push(msg);
  if (engineLog.errors.length > 100) engineLog.errors.shift();
  if (!engineLog.quiet) console.error('[fungeon]', msg);
}

// ---------------------------------------------------------------------------------------------------------------
// Battle context

export interface Battle {
  run: RunState;
  c: CombatState;
  ev: GameEvent[];
  rng: () => number;
  /** Card whose effect is currently resolving (for api.choose -> afterChoice). */
  source: { id: string; upgraded: boolean } | null;
  /** api.choose is honoured only while true (player turn actions / turn start). */
  allowChoice: boolean;
  /** Name of what killed the player. */
  cause: string;
  /** Read-only context for views (no events, no rng advance). */
  dry: boolean;
  /** Current hook nesting depth (recursion guard). */
  depth: number;
}

export function emit(b: Battle, e: GameEvent): void {
  if (!b.dry) b.ev.push(e);
}

/** Battle wrapper around the combat currently on run.screen. */
export function battleFor(run: RunState, ev: GameEvent[]): Battle | null {
  if (run.screen.kind !== 'combat') return null;
  return { run, c: run.screen.combat, ev, rng: stream(run, 'combat'), source: null, allowChoice: true, cause: '', dry: false, depth: 0 };
}

/** Read-only battle for card / intent views. */
export function dryBattle(run: RunState): Battle | null {
  if (run.screen.kind !== 'combat') return null;
  return { run, c: run.screen.combat, ev: [], rng: () => 0, source: null, allowChoice: false, cause: '', dry: true, depth: 0 };
}

export type Ent = PlayerCombat | EnemyState;

export function getEnt(c: CombatState, id: EntityId): Ent | undefined {
  if (id === PLAYER) return c.player;
  for (const e of c.enemies) if (e.uid === id) return e;
  return undefined;
}
function isEnemyState(e: Ent): e is EnemyState {
  return 'uid' in e;
}
function alive(e: Ent | undefined): e is Ent {
  return !!e && (!isEnemyState(e) || e.alive);
}
export function livingEnemies(c: CombatState): EnemyState[] {
  return c.enemies.filter((e) => e.alive);
}
function nameOf(c: CombatState, id: EntityId | undefined): string {
  if (id === undefined) return '';
  if (id === PLAYER) return 'Pip';
  return c.enemies.find((e) => e.uid === id)?.name ?? '';
}

export function passiveSum(run: RunState, key: 'maxEnergy' | 'handSize' | 'gardenPlots' | 'potionSlots' | 'restHealBonus' | 'shopDiscount' | 'cardRewardChoices'): number {
  let n = 0;
  for (const r of run.relics) {
    const v = findRelic(r.id)?.passive?.[key];
    if (typeof v === 'number') n += v;
  }
  return n;
}

// ---------------------------------------------------------------------------------------------------------------
// Hook dispatch

type HookKey = Exclude<keyof Hooks, 'modifyAttack' | 'modifyBlock'>;
interface Src {
  h: Hooks;
  n: number;
  sid?: StatusId;
}

function sources(b: Battle, who: EntityId): Src[] {
  const out: Src[] = [];
  const c = b.c;
  if (who === PLAYER) {
    for (const r of b.run.relics) {
      const d = findRelic(r.id);
      if (d) out.push({ h: d, n: r.counter });
    }
    for (const sid of Object.keys(c.player.statuses)) {
      const d = findStatus(sid);
      if (d) out.push({ h: d, n: c.player.statuses[sid], sid });
    }
  } else {
    const e = c.enemies.find((x) => x.uid === who);
    if (!e) return out;
    for (const sid of Object.keys(e.statuses)) {
      const d = findStatus(sid);
      if (d) out.push({ h: d, n: e.statuses[sid], sid });
    }
    const ed = findEnemy(e.id);
    if (ed?.hooks) out.push({ h: ed.hooks, n: 0 });
  }
  return out;
}

/** Fire a hook on everything owned by `who` (api.self = who). */
export function fireOwner(b: Battle, who: EntityId, key: HookKey, ...args: unknown[]): void {
  if (b.depth >= MAX_HOOK_DEPTH) return;
  const srcs = sources(b, who);
  if (!srcs.length) return;
  let api: ApiImpl | null = null;
  b.depth++;
  try {
  for (const s of srcs) {
    const fn = s.h[key] as ((...a: unknown[]) => void) | undefined;
    if (!fn) continue;
    if (s.sid) {
      const cur = getEnt(b.c, who)?.statuses[s.sid] ?? 0;
      if (cur <= 0) continue;
      s.n = cur;
    }
    api ??= new ApiImpl(b, who);
    const a = api;
    safe(`hook ${key}${s.sid ? ' (status ' + s.sid + ')' : ''}`, () => fn.call(s.h, a, s.n, ...args));
  }
  } finally {
    b.depth--;
  }
}

/** Fire a hook on the player's things and then every living enemy's things. */
export function fireAll(b: Battle, key: HookKey, ...args: unknown[]): void {
  fireOwner(b, PLAYER, key, ...args);
  const list = b.c.enemies.slice();
  for (const e of list) {
    if (e.alive || (key === 'onEnemyDeath' && e.uid === args[0])) fireOwner(b, e.uid, key, ...args);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Damage math

function ascMult(b: Battle, attacker: EntityId): number {
  if (attacker === PLAYER) return 1;
  const a = b.run.ascension;
  let m = 1;
  if (b.c.kind === 'normal' && a >= 7) m *= 1.1;
  if (b.c.kind === 'boss' && a >= 4) m *= 1.1;
  return m;
}

/** Final per-hit attack damage: floor((base + Might [+ relic mods]) x Wilted x Soggy). */
export function attackDamage(b: Battle, attacker: EntityId, target: EntityId | undefined, base: number): number {
  const c = b.c;
  const a = getEnt(c, attacker);
  const t = target !== undefined ? getEnt(c, target) : undefined;
  let v = base + (a?.statuses[S.might] ?? 0);
  if (attacker === PLAYER) {
    const api = new ApiImpl(b, PLAYER);
    for (const s of sources(b, PLAYER)) {
      const fn = s.h.modifyAttack;
      if (fn) {
        const cur = v;
        v = safeVal('modifyAttack', () => fn.call(s.h, s.n, cur, api, target ?? ''), cur);
      }
    }
  }
  let m = 1;
  if ((a?.statuses[S.wilted] ?? 0) > 0) m *= 0.75;
  if (t && (t.statuses[S.soggy] ?? 0) > 0) m *= 1.5;
  m *= ascMult(b, attacker);
  return Math.max(0, Math.floor(v * m + 1e-9));
}

/** Block gained from a card / effect: floor((base + Sturdy [+ relic mods]) x Brittle). */
export function blockAmount(b: Battle, who: EntityId, base: number, useModifiers = true): number {
  if (!useModifiers) return Math.max(0, Math.floor(base));
  const e = getEnt(b.c, who);
  let v = base + (e?.statuses[S.sturdy] ?? 0);
  if (who === PLAYER) {
    for (const s of sources(b, PLAYER)) {
      const fn = s.h.modifyBlock;
      if (fn) {
        const cur = v;
        v = safeVal('modifyBlock', () => fn.call(s.h, s.n, cur), cur);
      }
    }
  }
  if ((e?.statuses[S.brittle] ?? 0) > 0) v *= 0.75;
  return Math.max(0, Math.floor(v + 1e-9));
}

type DamageKind = 'attack' | 'rot' | 'hp' | 'thorns';

/** Apply raw damage to a target. Attack & thorns are absorbed by Block; Rot & HP loss ignore it. Returns HP lost. */
export function dealDamage(b: Battle, targetId: EntityId, sourceId: EntityId | undefined, rawIn: number, kind: DamageKind): number {
  const c = b.c;
  if (c.phase !== 'player') return 0;
  const t = getEnt(c, targetId);
  if (!alive(t)) return 0;
  const isPlayer = targetId === PLAYER;
  const raw = Math.max(0, Math.floor(rawIn));
  if (raw <= 0 && kind !== 'attack') return 0;
  const blocked = kind === 'attack' || kind === 'thorns' ? Math.min(t.block, raw) : 0;
  const dealt = raw - blocked;
  t.block -= blocked;
  t.hp -= dealt;
  emit(b, {
    t: 'damage',
    target: targetId,
    source: sourceId,
    amount: dealt,
    blocked,
    hpAfter: Math.max(0, t.hp),
    blockAfter: t.block,
    kind,
  });
  const st = b.run.stats;
  if (isPlayer) {
    st.damageTaken += dealt;
    c.counters.damageTakenCombat += dealt;
    if (dealt > 0) {
      b.cause =
        kind === 'rot' ? 'Rot' : kind === 'thorns' ? nameOf(c, sourceId) + ' (thorns)' : sourceId && sourceId !== PLAYER ? nameOf(c, sourceId) : b.source ? getCard(b.source.id).name : 'Self-inflicted';
    }
  } else {
    st.damageDealt += dealt;
    if (sourceId === PLAYER && kind === 'attack') st.maxDamageHit = Math.max(st.maxDamageHit, raw);
  }
  if (kind === 'attack' && sourceId !== undefined) fireOwner(b, targetId, 'onAttacked', sourceId, dealt);
  if (dealt > 0) fireOwner(b, targetId, 'onHpLoss', dealt);

  if (t.hp > 0 && isEnemyState(t)) blightPhaseBuff(b, t);

  if (t.hp <= 0) {
    if (isEnemyState(t)) {
      if (t.alive) killEnemy(b, t);
    } else {
      t.hp = 0;
      c.phase = 'lost';
    }
  }
  return dealt;
}

/** Blight 10: the act 3 boss gets Growing 2 when it drops to half HP. */
function blightPhaseBuff(b: Battle, e: EnemyState): void {
  if (b.run.ascension < 10 || b.run.act !== 3 || b.c.kind !== 'boss') return;
  if (e.mem.blight10 || findEnemy(e.id)?.tier !== 'boss') return;
  if (e.hp * 2 > e.maxHp) return;
  e.mem.blight10 = 1;
  emit(b, { t: 'say', who: e.uid, text: 'Enraged!' });
  addStatus(b, e.uid, S.growing, 2);
}

export function killEnemy(b: Battle, e: EnemyState): void {
  if (!e.alive) return;
  e.hp = 0;
  e.alive = false;
  e.block = 0;
  emit(b, { t: 'enemyDie', enemy: e.uid });
  const tier = findEnemy(e.id)?.tier;
  if (tier !== 'minion') {
    b.run.stats.enemiesKilled++;
    if (tier === 'elite') b.run.stats.elitesKilled++;
    if (tier === 'boss') b.run.stats.bossesKilled++;
  }
  // Hooks run while the enemy is already dead (own hooks included) so they can spawn / revive.
  fireAll(b, 'onEnemyDeath', e.uid);
  checkEnd(b);
}

/** Resolve win / loss. Idempotent. Call after anything that may end the fight. */
export function checkEnd(b: Battle): void {
  const c = b.c;
  if (c.phase !== 'player') return;
  if (c.player.hp <= 0) {
    c.player.hp = 0;
    c.phase = 'lost';
    return;
  }
  if (!c.enemies.some((e) => e.alive)) {
    c.phase = 'won';
    fireOwner(b, PLAYER, 'onCombatEnd');
  }
}

/** Attack from `attacker` to `target` with all modifiers, Prickly and hooks. Returns HP lost. */
export function doAttack(b: Battle, attacker: EntityId, target: EntityId, base: number): number {
  if (b.c.phase !== 'player') return 0;
  const t = getEnt(b.c, target);
  if (!alive(t)) return 0;
  const dmg = attackDamage(b, attacker, target, base);
  const prickly = t.statuses[S.prickly] ?? 0;
  const lost = dealDamage(b, target, attacker, dmg, 'attack');
  if (prickly > 0 && attacker !== target) dealDamage(b, attacker, target, prickly, 'thorns');
  return lost;
}

// ---------------------------------------------------------------------------------------------------------------
// Small state mutators

export function addStatus(b: Battle, who: EntityId, s: StatusId, amount: number): void {
  const e = getEnt(b.c, who);
  if (!alive(e) || !amount) return;
  const before = e.statuses[s] ?? 0;
  const after = Math.max(0, before + amount);
  if (after === before) return;
  if (after === 0) delete e.statuses[s];
  else e.statuses[s] = after;
  emit(b, { t: 'status', target: who, status: s, delta: after - before, after });
}

export function setStatusExact(b: Battle, who: EntityId, s: StatusId, amount: number): void {
  const e = getEnt(b.c, who);
  if (!alive(e)) return;
  const before = e.statuses[s] ?? 0;
  const after = Math.max(0, Math.floor(amount));
  if (after === before) return;
  if (after === 0) delete e.statuses[s];
  else e.statuses[s] = after;
  emit(b, { t: 'status', target: who, status: s, delta: after - before, after });
}

function healEnt(b: Battle, who: EntityId, amount: number): void {
  const e = getEnt(b.c, who);
  if (!alive(e)) return;
  const a = Math.min(Math.floor(amount), e.maxHp - e.hp);
  if (a <= 0) return;
  e.hp += a;
  emit(b, { t: 'heal', target: who, amount: a, hpAfter: e.hp });
}

function addBlock(b: Battle, who: EntityId, amount: number): number {
  const e = getEnt(b.c, who);
  if (!alive(e) || amount <= 0) return 0;
  e.block += amount;
  emit(b, { t: 'block', target: who, amount, blockAfter: e.block });
  return amount;
}

function gainEnergy(b: Battle, n: number): void {
  const p = b.c.player;
  p.energy = Math.max(0, p.energy + n);
  emit(b, { t: 'energy', after: p.energy });
}

export function gainNutrients(b: Battle, n: number): void {
  if (!n) return;
  const p = b.c.player;
  const after = Math.max(0, p.nutrients + n);
  const delta = after - p.nutrients;
  if (!delta) return;
  p.nutrients = after;
  emit(b, { t: 'nutrients', delta, after });
}

// ---------------------------------------------------------------------------------------------------------------
// Cards & piles

export function makeCardInstance(b: Battle, id: string, upgraded = false): CardInstance {
  return { uid: b.run.nextUid++, id, upgraded };
}

type Pile = CardInstance[];
function locate(c: CombatState, uid: number): { pile: Pile; idx: number } | null {
  for (const pile of [c.hand, c.draw, c.discard, c.compost]) {
    const idx = pile.findIndex((x) => x.uid === uid);
    if (idx >= 0) return { pile, idx };
  }
  return null;
}
export function findCardAnywhere(c: CombatState, uid: number): CardInstance | undefined {
  const l = locate(c, uid);
  if (l) return l.pile[l.idx];
  for (const p of c.garden) if (p && p.card.uid === uid) return p.card;
  return undefined;
}

/** Composts a card instance that has already been removed from its pile. +1 Nutrient. */
export function compostInstance(b: Battle, card: CardInstance): void {
  const c = b.c;
  delete card.costOverride;
  delete card.costOverrideTurn;
  c.compost.push(card);
  c.counters.compostedCombat++;
  emit(b, { t: 'compost', uid: card.uid, id: card.id });
  gainNutrients(b, 1);
  fireAll(b, 'onCompost', card);
}

export function compostByUid(b: Battle, uid: number): void {
  const c = b.c;
  for (const pile of [c.hand, c.draw, c.discard]) {
    const idx = pile.findIndex((x) => x.uid === uid);
    if (idx >= 0) {
      const [card] = pile.splice(idx, 1);
      compostInstance(b, card);
      return;
    }
  }
}

function discardInstance(b: Battle, card: CardInstance): void {
  if (card.costOverrideTurn) {
    delete card.costOverride;
    delete card.costOverrideTurn;
  }
  b.c.discard.push(card);
  emit(b, { t: 'discard', uids: [card.uid] });
}

export function discardByUid(b: Battle, uid: number): void {
  const c = b.c;
  for (const pile of [c.hand, c.draw, c.compost]) {
    const idx = pile.findIndex((x) => x.uid === uid);
    if (idx >= 0) {
      const [card] = pile.splice(idx, 1);
      discardInstance(b, card);
      return;
    }
  }
}

function reshuffle(b: Battle): void {
  const c = b.c;
  c.draw = shuffle(b.rng, c.discard.splice(0));
  emit(b, { t: 'shuffle' });
  fireAll(b, 'onShuffle');
}

export function drawCards(b: Battle, n: number): CardInstance[] {
  const c = b.c;
  const got: CardInstance[] = [];
  let batch: number[] = [];
  let over: number[] = [];
  const flush = () => {
    if (batch.length) emit(b, { t: 'draw', uids: batch });
    if (over.length) emit(b, { t: 'discard', uids: over });
    batch = [];
    over = [];
  };
  for (let i = 0; i < n; i++) {
    if (c.draw.length === 0) {
      if (c.discard.length === 0) break;
      flush();
      reshuffle(b);
      if (c.draw.length === 0) break;
    }
    const card = c.draw.shift()!;
    if (c.hand.length >= HAND_LIMIT) {
      c.discard.push(card);
      over.push(card.uid);
    } else {
      c.hand.push(card);
      batch.push(card.uid);
      got.push(card);
    }
  }
  flush();
  return got;
}

export function addCardToPile(b: Battle, id: string, where: 'hand' | 'draw' | 'discard' | 'drawTop', count = 1, upgraded = false): CardInstance[] {
  const c = b.c;
  const out: CardInstance[] = [];
  for (let i = 0; i < count; i++) {
    const card = makeCardInstance(b, id, upgraded);
    out.push(card);
    if (where === 'hand' && c.hand.length < HAND_LIMIT) {
      c.hand.push(card);
      emit(b, { t: 'newCard', uid: card.uid, id, to: 'hand' });
    } else if (where === 'draw') {
      c.draw.splice(Math.floor(b.rng() * (c.draw.length + 1)), 0, card);
      emit(b, { t: 'newCard', uid: card.uid, id, to: 'draw' });
    } else if (where === 'drawTop') {
      c.draw.unshift(card);
      emit(b, { t: 'newCard', uid: card.uid, id, to: 'draw' });
    } else {
      c.discard.push(card);
      emit(b, { t: 'newCard', uid: card.uid, id, to: 'discard' });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Pending choices

function startChoice(
  b: Battle,
  opts: { prompt: string; from: PendingChoice['from']; min: number; max: number; action: PendingChoice['action']; filter?: (c: CardInstance) => boolean; options?: CardInstance[] },
): void {
  const c = b.c;
  if (!b.allowChoice) {
    console.warn('[fungeon] api.choose ignored outside the player action window');
    return;
  }
  if (c.pending) {
    console.warn('[fungeon] api.choose ignored: a choice is already pending');
    return;
  }
  let pool: CardInstance[];
  switch (opts.from) {
    case 'hand': pool = c.hand; break;
    case 'draw': pool = c.draw; break;
    case 'discard': pool = c.discard; break;
    case 'compost': pool = c.compost; break;
    default: pool = opts.options ?? [];
  }
  const cands = opts.filter ? pool.filter((x) => safeVal('choose.filter', () => opts.filter!(x), false)) : pool.slice();
  if (cands.length === 0) return;
  const n = cands.length;
  const min = Math.max(0, Math.min(opts.min, n));
  const max = Math.max(min, Math.min(opts.max, n));
  const p: PendingChoice = {
    prompt: opts.prompt,
    from: opts.from,
    candidates: cands.map((x) => x.uid),
    min,
    max,
    action: opts.action,
  };
  if (b.source) {
    p.sourceCardId = b.source.id;
    p.sourceUpgraded = b.source.upgraded;
  }
  if (opts.from === 'options') p.options = cands.map((x) => ({ ...x }));
  c.pending = p;
}

export function resolveChoice(b: Battle, uids: number[]): string | null {
  const c = b.c;
  const p = c.pending;
  if (!p) return 'There is nothing to choose.';
  if (new Set(uids).size !== uids.length) return 'Duplicate cards chosen.';
  for (const u of uids) if (!p.candidates.includes(u)) return 'That card cannot be chosen.';
  if (uids.length < p.min || uids.length > p.max) {
    return p.min === p.max ? `Choose exactly ${p.min}.` : `Choose between ${p.min} and ${p.max}.`;
  }
  const chosen: CardInstance[] = uids.map((u) => (p.from === 'options' ? p.options!.find((x) => x.uid === u)! : findCardAnywhere(c, u)!));
  c.pending = null;
  b.allowChoice = true;
  switch (p.action) {
    case 'compost':
      for (const card of chosen) compostByUid(b, card.uid);
      break;
    case 'discard':
      for (const card of chosen) discardByUid(b, card.uid);
      break;
    case 'topdeck':
      for (const card of chosen) {
        const l = locate(c, card.uid);
        if (l) {
          l.pile.splice(l.idx, 1);
          c.draw.unshift(card);
        }
      }
      break;
    case 'upgrade':
      for (const card of chosen) card.upgraded = true;
      break;
    case 'toHand': {
      const moved: number[] = [];
      const over: number[] = [];
      for (const card of chosen) {
        if (p.from === 'options') {
          const inst = { ...card };
          if (c.hand.length < HAND_LIMIT) {
            c.hand.push(inst);
            emit(b, { t: 'newCard', uid: inst.uid, id: inst.id, to: 'hand' });
          } else {
            c.discard.push(inst);
            emit(b, { t: 'newCard', uid: inst.uid, id: inst.id, to: 'discard' });
          }
          chosen[chosen.indexOf(card)] = inst;
          continue;
        }
        const l = locate(c, card.uid);
        if (!l || l.pile === c.hand) continue;
        l.pile.splice(l.idx, 1);
        if (c.hand.length < HAND_LIMIT) {
          c.hand.push(card);
          moved.push(card.uid);
        } else {
          c.discard.push(card);
          over.push(card.uid);
        }
      }
      if (moved.length) emit(b, { t: 'draw', uids: moved });
      if (over.length) emit(b, { t: 'discard', uids: over });
      break;
    }
    default:
      break;
  }
  if (p.sourceCardId) {
    const def = getCard(p.sourceCardId);
    if (def.afterChoice) {
      const prev = b.source;
      b.source = { id: def.id, upgraded: !!p.sourceUpgraded };
      const api = new ApiImpl(b, PLAYER);
      const v = cardVals(def, !!p.sourceUpgraded);
      safe(`card ${def.id}.afterChoice`, () => def.afterChoice!(api, v, chosen));
      b.source = prev;
    }
  }
  checkEnd(b);
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Playing cards

function makeApiFor(b: Battle): ApiImpl {
  return new ApiImpl(b, PLAYER);
}

export function playableReason(b: Battle, card: CardInstance, def: CardDef): string | null {
  const c = b.c;
  if (c.phase !== 'player') return 'The fight is over.';
  if (c.pending) return 'Finish your choice first.';
  if (isUnplayable(card, def)) return 'Unplayable.';
  const cost = cardCost(card, def);
  if (cost !== 'X' && cost > c.player.energy) return 'Not enough Spores.';
  if (cardNutrients(card, def) > c.player.nutrients) return 'Not enough Nutrients.';
  if (def.plant && !c.garden.some((p) => p === null)) return 'No free plot in your Garden.';
  if (def.canPlay) {
    const api = makeApiFor(b);
    const v = cardVals(def, card.upgraded);
    const r = safeVal(`card ${def.id}.canPlay`, () => def.canPlay!(api, v), null);
    if (r) return r;
  }
  return null;
}

export function playCard(b: Battle, uid: number, target?: EntityId): string | null {
  const c = b.c;
  if (c.phase !== 'player') return 'The fight is over.';
  if (c.pending) return 'Finish your choice first.';
  const idx = c.hand.findIndex((x) => x.uid === uid);
  if (idx < 0) return 'That card is not in your hand.';
  const card = c.hand[idx];
  const def = getCard(card.id);
  const reason = playableReason(b, card, def);
  if (reason) return reason;

  let tgt: EntityId | undefined;
  if (def.target === 'enemy') {
    let tid = target;
    if (tid === undefined) {
      const l = livingEnemies(c);
      if (l.length === 1) tid = l[0].uid;
      else return 'Choose a target.';
    }
    const te = c.enemies.find((e) => e.uid === tid);
    if (!te || !te.alive) return 'Invalid target.';
    tgt = tid;
  }

  // pay
  const cost = cardCost(card, def);
  let x = 0;
  if (cost === 'X') {
    x = c.player.energy;
    c.player.energy = 0;
    emit(b, { t: 'energy', after: 0 });
  } else if (cost > 0) {
    c.player.energy -= cost;
    emit(b, { t: 'energy', after: c.player.energy });
  }
  const nut = cardNutrients(card, def);
  if (nut > 0) {
    c.player.nutrients -= nut;
    emit(b, { t: 'nutrients', delta: -nut, after: c.player.nutrients });
  }

  // the card is in limbo while its effect resolves (so reshuffles cannot pick it up)
  c.hand.splice(idx, 1);
  emit(b, { t: 'play', uid: card.uid, id: card.id, target: tgt });
  c.counters.cardsPlayedTurn++;
  c.counters.cardsPlayedCombat++;
  if (def.type === 'attack') c.counters.attacksPlayedTurn++;
  b.run.stats.cardsPlayed++;

  const v: Vals = cardVals(def, card.upgraded);
  if (cost === 'X') v.x = x;
  const prev = b.source;
  b.source = { id: def.id, upgraded: card.upgraded };
  if (def.play) {
    const api = makeApiFor(b);
    const play = def.play;
    safe(`card ${def.id}.play`, () => play(api, v, tgt));
  }
  b.source = prev;

  // destination
  if (card.costOverrideTurn) {
    delete card.costOverride;
    delete card.costOverrideTurn;
  }
  const kws = cardKeywords(card, def);
  if (def.plant) {
    const slot = c.garden.findIndex((p) => p === null);
    if (slot >= 0) {
      c.garden[slot] = { card, growth: 0 };
      emit(b, { t: 'plant', uid: card.uid, slot });
      fireAll(b, 'onPlant', card);
    } else {
      discardInstance(b, card);
    }
  } else if (def.type === 'power') {
    // powers leave the game silently (no Nutrient)
  } else if (kws.includes('compost')) {
    compostInstance(b, card);
  } else {
    discardInstance(b, card);
  }

  fireAll(b, 'onCardPlayed', card, def);
  checkEnd(b);
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Garden

function withSource<T>(b: Battle, card: CardInstance, fn: () => T): T {
  const prev = b.source;
  b.source = { id: card.id, upgraded: card.upgraded };
  try {
    return fn();
  } finally {
    b.source = prev;
  }
}

function bloom(b: Battle, slot: number): void {
  const c = b.c;
  const p = c.garden[slot];
  if (!p) return;
  const def = getCard(p.card.id);
  c.garden[slot] = null;
  c.counters.bloomsCombat++;
  emit(b, { t: 'bloom', slot, uid: p.card.uid, id: p.card.id });
  const bl = def.plant?.onBloom;
  if (bl) {
    const api = makeApiFor(b);
    const v = cardVals(def, p.card.upgraded);
    withSource(b, p.card, () => safe(`plant ${def.id}.onBloom`, () => bl(api, v)));
  }
  fireAll(b, 'onBloom', p.card);
  if (cardKeywords(p.card, def).includes('compost')) compostInstance(b, p.card);
  else discardInstance(b, p.card);
}

/** One growth tick for a plant: +1, emit, onGrow, bloom when mature. */
function growStep(b: Battle, slot: number): void {
  const p = b.c.garden[slot];
  if (!p) return;
  const def = getCard(p.card.id);
  p.growth++;
  emit(b, { t: 'grow', slot, growth: p.growth });
  const og = def.plant?.onGrow;
  if (og) {
    const api = makeApiFor(b);
    const v = cardVals(def, p.card.upgraded);
    const growth = p.growth;
    withSource(b, p.card, () => safe(`plant ${def.id}.onGrow`, () => og(api, v, growth)));
  }
  const cur = b.c.garden[slot];
  if (cur === p && def.plant && def.plant.grow !== null && p.growth >= def.plant.grow) bloom(b, slot);
}

/** Perennials tick at most once per call (growPlants(99) must not spam onGrow); other plants tick until they bloom. */
function growSlotSteps(b: Battle, slot: number, n: number): void {
  const p = b.c.garden[slot];
  if (!p) return;
  const perennial = getCard(p.card.id).plant?.grow === null;
  const steps = perennial ? Math.min(n, 1) : n;
  for (let i = 0; i < steps; i++) {
    if (b.c.garden[slot] !== p) return;
    growStep(b, slot);
  }
}
export function growAll(b: Battle, n: number): void {
  for (let s = 0; s < b.c.garden.length; s++) growSlotSteps(b, s, n);
}
export function growSlot(b: Battle, slot: number, n: number): void {
  growSlotSteps(b, slot, n);
}

// ---------------------------------------------------------------------------------------------------------------
// Enemies

function scaleHp(run: RunState, kind: CombatState['kind'], hp: number): number {
  const a = run.ascension;
  let m = 1;
  if (kind === 'normal' && a >= 2) m = 1.1;
  else if (kind === 'elite' && a >= 3) m = 1.1;
  else if (kind === 'boss' && a >= 4) m = 1.1;
  return Math.max(1, Math.round(hp * m));
}

export function spawnEnemy(b: Battle, id: string, position: 'left' | 'right' = 'right', initial = false): EnemyState | undefined {
  const c = b.c;
  const def = findEnemy(id);
  if (!def) return undefined;
  if (!initial && livingEnemies(c).length >= MAX_LIVING_ENEMIES) return undefined;
  const hp = scaleHp(b.run, c.kind, randInt(b.rng, def.hp[0], def.hp[1]));
  const e: EnemyState = {
    uid: `e${c.nextEnemyUid++}`,
    id,
    name: def.name,
    hp,
    maxHp: hp,
    block: 0,
    statuses: {},
    intent: null,
    history: [],
    alive: true,
    mem: {},
  };
  if (position === 'left') c.enemies.unshift(e);
  else c.enemies.push(e);
  emit(b, { t: 'spawn', enemy: e.uid, id });
  if (def.onSpawn) {
    const api = new ApiImpl(b, e.uid);
    safe(`enemy ${id}.onSpawn`, () => def.onSpawn!(api, e));
  }
  if (!initial) rollIntent(b, e, c.turn);
  return e;
}

export function rollIntent(b: Battle, e: EnemyState, turn: number): void {
  const def = findEnemy(e.id);
  if (!def) {
    e.intent = null;
    return;
  }
  const lastMove = () => e.history[e.history.length - 1];
  const weighted = (weights: Record<string, number>, maxRepeat = 2): string => {
    const entries = Object.entries(weights).filter(([, w]) => w > 0);
    const trailing = (id: string) => {
      let n = 0;
      for (let i = e.history.length - 1; i >= 0 && e.history[i] === id; i--) n++;
      return n;
    };
    let pool = entries.filter(([id]) => trailing(id) < maxRepeat);
    if (!pool.length) pool = entries;
    if (!pool.length) return Object.keys(def.moves)[0];
    const total = pool.reduce((s, [, w]) => s + w, 0);
    let r = b.rng() * total;
    for (const [id, w] of pool) {
      r -= w;
      if (r < 0) return id;
    }
    return pool[pool.length - 1][0];
  };
  const ctx: EnemyAiCtx = { self: e, history: e.history, turn, rng: b.rng, combat: b.c, weighted, lastMove };
  let m: string | undefined = safeVal(`enemy ${e.id}.ai`, () => def.ai(ctx), undefined);
  if (!m || !def.moves[m]) {
    if (m) logError(`enemy ${e.id}.ai`, new Error(`unknown move id "${m}"`));
    m = Object.keys(def.moves)[0];
  }
  e.intent = m;
  emit(b, { t: 'intent', enemy: e.uid, move: m });
}

function decay(b: Battle, who: EntityId, present: string[]): void {
  for (const sid of present) {
    const d = findStatus(sid);
    if (d?.decay === 'turn') addStatus(b, who, sid, -1);
  }
}

function enemyTurn(b: Battle): void {
  const c = b.c;
  emit(b, { t: 'turn', who: 'enemy', turn: c.turn });
  const order = c.enemies.filter((e) => e.alive);
  for (const e of order) {
    if (c.phase !== 'player') return;
    if (!e.alive) continue;
    if (!((e.statuses[S.armored] ?? 0) > 0)) e.block = 0;
    const rot = e.statuses[S.rot] ?? 0;
    if (rot > 0) {
      dealDamage(b, e.uid, undefined, rot, 'rot');
      addStatus(b, e.uid, S.rot, -1);
      if (!e.alive) continue;
    }
    const pre = Object.keys(e.statuses);
    fireOwner(b, e.uid, 'onTurnStart', c.turn);
    if (c.phase !== 'player') return;
    if (!e.alive) continue;
    const def = findEnemy(e.id);
    const move = e.intent && def ? def.moves[e.intent] : undefined;
    if (move && e.intent) {
      emit(b, { t: 'enemyMove', enemy: e.uid, move: e.intent, name: move.name });
      e.history.push(e.intent);
      const api = new ApiImpl(b, e.uid);
      safe(`enemy ${e.id}.move ${e.intent}`, () => move.run(api, e));
    }
    if (c.phase !== 'player') return;
    if (!e.alive) continue;
    fireOwner(b, e.uid, 'onTurnEnd', c.turn);
    decay(b, e.uid, pre);
    e.intent = null;
  }
  if (c.phase !== 'player') return;
  for (const e of c.enemies) if (e.alive) rollIntent(b, e, c.turn + 1);
}

// ---------------------------------------------------------------------------------------------------------------
// Turn flow

export function handSize(run: RunState): number {
  return BASE_HAND + passiveSum(run, 'handSize');
}

function beginPlayerTurn(b: Battle, first: boolean): void {
  const c = b.c;
  b.allowChoice = true;
  emit(b, { t: 'turn', who: 'player', turn: c.turn });
  c.counters.cardsPlayedTurn = 0;
  c.counters.attacksPlayedTurn = 0;
  if (!first) {
    if (!((c.player.statuses[S.armored] ?? 0) > 0)) c.player.block = 0;
    const rot = c.player.statuses[S.rot] ?? 0;
    if (rot > 0) {
      dealDamage(b, PLAYER, undefined, rot, 'rot');
      addStatus(b, PLAYER, S.rot, -1);
      if (c.phase !== 'player') return;
    }
  }
  c.player.energy = c.player.maxEnergy;
  emit(b, { t: 'energy', after: c.player.energy });
  fireOwner(b, PLAYER, 'onTurnStart', c.turn);
  if (c.phase !== 'player') return;
  growAll(b, 1);
  if (c.phase !== 'player') return;
  drawCards(b, first ? Math.max(0, handSize(b.run) - c.hand.length) : handSize(b.run));
  fireOwner(b, PLAYER, 'onAfterDraw');
  if (first) fireOwner(b, PLAYER, 'onCombatStart');
  checkEnd(b);
}

function endPlayerTurn(b: Battle): void {
  const c = b.c;
  b.allowChoice = false;
  const pre = Object.keys(c.player.statuses);
  fireOwner(b, PLAYER, 'onTurnEnd', c.turn);
  if (c.phase !== 'player') return;
  for (const card of c.hand.slice()) {
    const def = getCard(card.id);
    if (def.onEndTurnInHand && c.hand.includes(card)) {
      const api = makeApiFor(b);
      const v = cardVals(def, card.upgraded);
      const f = def.onEndTurnInHand;
      safe(`card ${def.id}.onEndTurnInHand`, () => f(api, v));
      if (c.phase !== 'player') return;
    }
  }
  // Fleeting -> Compost
  for (const card of c.hand.slice()) {
    if (cardKeywords(card, getCard(card.id)).includes('fleeting')) {
      const i = c.hand.indexOf(card);
      if (i >= 0) {
        c.hand.splice(i, 1);
        compostInstance(b, card);
      }
    }
  }
  // discard the rest except Keep
  const keep: CardInstance[] = [];
  const gone: number[] = [];
  for (const card of c.hand) {
    if (cardKeywords(card, getCard(card.id)).includes('keep')) keep.push(card);
    else {
      c.discard.push(card);
      gone.push(card.uid);
    }
  }
  c.hand = keep;
  if (gone.length) emit(b, { t: 'discard', uids: gone });
  for (const pile of [c.hand, c.draw, c.discard]) {
    for (const card of pile) {
      if (card.costOverrideTurn) {
        delete card.costOverride;
        delete card.costOverrideTurn;
      }
    }
  }
  decay(b, PLAYER, pre);
}

export function endTurn(b: Battle): string | null {
  const c = b.c;
  if (c.phase !== 'player') return 'The fight is over.';
  if (c.pending) return 'Finish your choice first.';
  endPlayerTurn(b);
  if (c.phase === 'player') enemyTurn(b);
  if (c.phase === 'player') {
    c.turn++;
    beginPlayerTurn(b, false);
  }
  return null;
}

export function usePotionInCombat(b: Battle, slot: number, target?: EntityId): string | null {
  const c = b.c;
  const id = b.run.potions[slot];
  if (!id) return 'No potion in that slot.';
  const def = findPotion(id);
  if (!def) return 'Unknown potion.';
  if (c.phase !== 'player') return 'The fight is over.';
  if (c.pending) return 'Finish your choice first.';
  let tgt: EntityId | undefined;
  if (def.target === 'enemy') {
    let tid = target;
    if (tid === undefined) {
      const l = livingEnemies(c);
      if (l.length === 1) tid = l[0].uid;
      else return 'Choose a target.';
    }
    const te = c.enemies.find((e) => e.uid === tid);
    if (!te || !te.alive) return 'Invalid target.';
    tgt = tid;
  }
  b.run.potions[slot] = null;
  emit(b, { t: 'potion', id });
  b.source = null;
  const api = makeApiFor(b);
  safe(`potion ${id}.use`, () => def.use(api, tgt));
  checkEnd(b);
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Combat setup

export function newCombatState(run: RunState, kind: CombatState['kind'], encounterId: string): CombatState {
  const plots = BASE_PLOTS + passiveSum(run, 'gardenPlots');
  return {
    kind,
    encounterId,
    turn: 1,
    phase: 'player',
    player: {
      hp: run.hp,
      maxHp: run.maxHp,
      block: 0,
      statuses: {},
      energy: 0,
      maxEnergy: BASE_ENERGY + passiveSum(run, 'maxEnergy'),
      nutrients: 0,
    },
    enemies: [],
    draw: [],
    hand: [],
    discard: [],
    compost: [],
    garden: Array.from({ length: plots }, () => null as PlantState | null),
    pending: null,
    counters: { cardsPlayedTurn: 0, attacksPlayedTurn: 0, cardsPlayedCombat: 0, compostedCombat: 0, bloomsCombat: 0, damageTakenCombat: 0 },
    mem: {},
    nextEnemyUid: 1,
  };
}

/** Starts a fight: sets run.screen to the combat and runs turn 1's start. The caller must settle it afterwards. */
export function startCombat(run: RunState, enemyIds: string[], kind: CombatState['kind'], encounterId: string, ev: GameEvent[]): Battle {
  const c = newCombatState(run, kind, encounterId);
  run.screen = { kind: 'combat', combat: c };
  const b: Battle = { run, c, ev, rng: stream(run, 'combat'), source: null, allowChoice: true, cause: '', dry: false, depth: 0 };
  c.draw = shuffle(
    b.rng,
    run.deck.map((x) => ({ ...x })),
  );
  for (const id of enemyIds) spawnEnemy(b, id, 'right', true);
  // Innate cards start in hand
  const innate = c.draw.filter((x) => cardKeywords(x, getCard(x.id)).includes('innate'));
  if (innate.length) {
    c.draw = c.draw.filter((x) => !innate.includes(x));
    c.hand.push(...innate);
    emit(b, { t: 'draw', uids: innate.map((x) => x.uid) });
  }
  for (const e of c.enemies) if (e.alive) rollIntent(b, e, 1);
  beginPlayerTurn(b, true);
  return b;
}

// ---------------------------------------------------------------------------------------------------------------
// The Api given to content code

export class ApiImpl implements Api {
  readonly combat: CombatState;
  readonly run: RunState;
  rng: () => number;
  mem: Record<string, number>;
  constructor(
    private readonly b: Battle,
    readonly self: EntityId,
  ) {
    this.combat = b.c;
    this.run = b.run;
    this.rng = b.rng;
    this.mem = b.c.mem;
  }

  player(): PlayerCombat {
    return this.b.c.player;
  }
  enemy(uid: EntityId): EnemyState | undefined {
    return this.b.c.enemies.find((e) => e.uid === uid);
  }
  enemies(): EnemyState[] {
    return livingEnemies(this.b.c);
  }
  randomEnemy(): EnemyState | undefined {
    const l = livingEnemies(this.b.c);
    return l.length ? l[Math.floor(this.b.rng() * l.length)] : undefined;
  }
  status(who: EntityId, s: StatusId): number {
    return getEnt(this.b.c, who)?.statuses[s] ?? 0;
  }
  hasRelic(id: string): boolean {
    return this.b.run.relics.some((r) => r.id === id);
  }
  plants(): PlantState[] {
    return this.b.c.garden.filter((p): p is PlantState => p !== null);
  }
  freePlots(): number {
    return this.b.c.garden.filter((p) => p === null).length;
  }

  attack(target: EntityId, base: number): number {
    return doAttack(this.b, this.self, target, base);
  }
  attackAll(base: number): number {
    let total = 0;
    if (this.self === PLAYER) {
      for (const e of livingEnemies(this.b.c)) total += doAttack(this.b, PLAYER, e.uid, base);
    } else {
      total = doAttack(this.b, this.self, PLAYER, base);
    }
    return total;
  }
  loseHp(target: EntityId, amount: number): number {
    return dealDamage(this.b, target, this.self, amount, 'hp');
  }
  gainBlock(amount: number, useModifiers = true): number {
    const v = blockAmount(this.b, this.self, amount, useModifiers);
    return addBlock(this.b, this.self, v);
  }
  giveBlock(target: EntityId, amount: number): void {
    addBlock(this.b, target, Math.max(0, Math.floor(amount)));
  }
  heal(target: EntityId, amount: number): void {
    healEnt(this.b, target, amount);
  }

  setHp(target: EntityId, hp: number, maxHp?: number): void {
    const e = getEnt(this.b.c, target);
    if (!alive(e)) return;
    if (maxHp !== undefined) e.maxHp = Math.max(1, Math.floor(maxHp));
    const nh = Math.min(e.maxHp, Math.max(1, Math.floor(hp)));
    const d = nh - e.hp;
    e.hp = nh;
    if (d < 0) emit(this.b, { t: 'damage', target, source: undefined, amount: -d, blocked: 0, hpAfter: nh, blockAfter: e.block, kind: 'hp' });
    else if (d > 0) emit(this.b, { t: 'heal', target, amount: d, hpAfter: nh });
  }

  apply(target: EntityId, s: StatusId, amount: number): void {
    addStatus(this.b, target, s, amount);
    if (s === S.rot && amount > 0 && this.self === PLAYER && target !== PLAYER) fireAll(this.b, 'onApplyRot', target, amount);
  }
  applyAll(s: StatusId, amount: number): void {
    for (const e of livingEnemies(this.b.c)) this.apply(e.uid, s, amount);
  }
  setStatus(target: EntityId, s: StatusId, amount: number): void {
    setStatusExact(this.b, target, s, amount);
  }

  draw(n: number): CardInstance[] {
    return drawCards(this.b, n);
  }
  gainEnergy(n: number): void {
    gainEnergy(this.b, n);
  }
  gainNutrients(n: number): void {
    gainNutrients(this.b, n);
  }
  spendNutrients(n: number): boolean {
    if (n <= 0) return true;
    if (this.b.c.player.nutrients < n) return false;
    gainNutrients(this.b, -n);
    return true;
  }
  addCard(id: string, where: 'hand' | 'draw' | 'discard' | 'drawTop', count = 1, upgraded = false): CardInstance[] {
    return addCardToPile(this.b, id, where, count, upgraded);
  }
  compostCard(uid: number): void {
    compostByUid(this.b, uid);
  }
  discardCard(uid: number): void {
    discardByUid(this.b, uid);
  }
  choose(opts: Parameters<Api['choose']>[0]): void {
    if (this.self !== PLAYER) return;
    startChoice(this.b, opts);
  }
  makeCard(id: string, upgraded = false): CardInstance {
    return makeCardInstance(this.b, id, upgraded);
  }
  cardDef(id: string): CardDef {
    return getCard(id);
  }
  upgradeCard(uid: number): void {
    const c = findCardAnywhere(this.b.c, uid);
    if (c) c.upgraded = true;
  }
  setCost(uid: number, cost: number, thisTurnOnly: boolean): void {
    const c = findCardAnywhere(this.b.c, uid);
    if (!c) return;
    c.costOverride = Math.max(0, cost);
    if (thisTurnOnly) c.costOverrideTurn = true;
    else delete c.costOverrideTurn;
  }

  growPlants(n: number): void {
    growAll(this.b, n);
  }
  growPlant(slot: number, n: number): void {
    growSlot(this.b, slot, n);
  }

  spawnEnemy(id: string, position: 'left' | 'right' = 'right'): EnemyState | undefined {
    return spawnEnemy(this.b, id, position);
  }
  addCardToPlayer(id: string, where: 'hand' | 'draw' | 'discard', count = 1): void {
    addCardToPile(this.b, id, where, count, false);
  }
  escape(uid: EntityId): void {
    const e = this.b.c.enemies.find((x) => x.uid === uid);
    if (!e || !e.alive) return;
    e.alive = false;
    e.block = 0;
    e.mem.escaped = 1;
    emit(this.b, { t: 'escape', enemy: uid });
    checkEnd(this.b);
  }

  flashRelic(id: string): void {
    emit(this.b, { t: 'relic', id });
  }
  say(who: EntityId, text: string): void {
    emit(this.b, { t: 'say', who, text });
  }
}
