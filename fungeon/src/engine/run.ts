// Run flow: newRun and the act() reducer (the only mutator of RunState).
import type { Action, ActResult, CardInstance, EncounterDef, GameEvent, MapNode, RunState } from './types';
import { PLAYER } from './types';
import { allEncounters, allEnemies, findEncounter, findEvent, allEvents, findPotion, getCard } from './registry';
import { hashString, initStreams, pick, randomSeed, stream, weightedPick } from './rng';
import { generateMap, selectableNodes } from './map';
import {
  ApiImpl,
  Battle,
  battleFor,
  endTurn,
  newCombatState,
  passiveSum,
  playCard,
  resolveChoice,
  safe,
  startCombat,
  usePotionInCombat,
} from './combat';
import { finishCombat, grantPotion, grantRelic, randomRelicId, BASE_POTION_SLOTS } from './rewards';
import { generateShop, removalsUsed, setRemovalsUsed, shopBuy } from './shop';
import { makeEventCtx, resolvePage, startPageId, transformCard } from './events';
import { canUpgrade } from './cardutil';
import { findEnemy } from './registry';

export interface NewRunOptions {
  seed?: string;
  ascension?: number;
  /** Timestamp stored in stats.startedAt (default Date.now()); pass a fixed value for fully deterministic states. */
  now?: number;
}

export const STARTING_DECK = ['bonk', 'bonk', 'bonk', 'bonk', 'cap_up', 'cap_up', 'cap_up', 'cap_up', 'spore_puff', 'seedling'];
export const STARTER_RELIC = 'lucky_acorn';
export const START_HP = 70;
export const START_GOLD = 99;

// ---------------------------------------------------------------------------------------------------------------
// New run

function pickBosses(run: RunState): [string, string, string] {
  const rng = stream(run, 'misc');
  const out: string[] = [];
  for (const act of [1, 2, 3] as const) {
    const encs = allEncounters().filter((e) => e.pool === 'boss' && e.act === act);
    let id = '';
    if (encs.length) {
      const enc = pick(rng, encs);
      id = enc.enemies.find((e) => findEnemy(e)?.tier === 'boss') ?? enc.enemies[0] ?? '';
    } else {
      const bosses = allEnemies().filter((e) => e.tier === 'boss' && e.act === act);
      if (bosses.length) id = pick(rng, bosses).id;
    }
    out.push(id);
  }
  return out as [string, string, string];
}

export function createRun(opts: NewRunOptions = {}): RunState {
  const seed = ((opts.seed ?? '').trim() || randomSeed()).toUpperCase();
  const ascension = Math.max(0, Math.min(10, Math.floor(opts.ascension ?? 0)));
  const hp = ascension >= 9 ? Math.floor(START_HP * 0.9) : START_HP;
  const run: RunState = {
    version: 1,
    seed,
    rng: initStreams(seed),
    ascension,
    hp,
    maxHp: START_HP,
    gold: START_GOLD,
    deck: [],
    relics: [],
    potions: Array.from({ length: BASE_POTION_SLOTS }, () => null),
    act: 1,
    floor: 0,
    map: { act: 1, nodes: {}, current: null, visited: [], bossId: '' },
    screen: { kind: 'map' },
    stats: {
      floorsClimbed: 0,
      enemiesKilled: 0,
      elitesKilled: 0,
      bossesKilled: 0,
      damageDealt: 0,
      damageTaken: 0,
      goldEarned: 0,
      cardsPlayed: 0,
      maxDamageHit: 0,
      startedAt: opts.now ?? Date.now(),
    },
    nextUid: 1,
    rareOffset: 0,
    potionChance: 40,
    seenEncounters: [],
    seenEvents: [],
    bosses: ['', '', ''],
    fightsThisAct: 0,
  };
  const ids = [...STARTING_DECK];
  if (ascension >= 6) ids.push('mildew');
  for (const id of ids) run.deck.push({ uid: run.nextUid++, id, upgraded: false });
  run.bosses = pickBosses(run);
  run.map = generateMap(stream(run, 'map'), 1, ascension, run.bosses[0]);
  grantRelic(run, STARTER_RELIC);
  return run;
}

// ---------------------------------------------------------------------------------------------------------------
// act()

export function act(run: RunState, action: Action): ActResult {
  const next = structuredClone(run);
  const events: GameEvent[] = [];
  try {
    const err = reduce(next, action, events);
    if (err) return { run, events: [], error: err };
    return { run: next, events };
  } catch (e) {
    console.error('[fungeon] act() failed', action, e);
    return { run, events: [], error: 'Internal error: ' + (e instanceof Error ? e.message : String(e)) };
  }
}

function settle(run: RunState, b: Battle, ev: GameEvent[]): void {
  if (b.c.phase !== 'player') finishCombat(run, b, ev);
}

function inCombat(run: RunState, ev: GameEvent[], fn: (b: Battle) => string | null): string | null {
  const b = battleFor(run, ev);
  if (!b) return 'You are not in a fight.';
  const err = fn(b);
  if (err) return err;
  settle(run, b, ev);
  return null;
}

function reduce(run: RunState, a: Action, ev: GameEvent[]): string | null {
  const kind = run.screen.kind;
  if (kind === 'defeat' || kind === 'victory') return 'The run is over.';
  switch (a.type) {
    case 'selectNode':
      if (kind !== 'map') return 'Not on the map.';
      return selectNode(run, a.nodeId, ev);
    case 'playCard':
      return inCombat(run, ev, (b) => playCard(b, a.uid, a.target));
    case 'endTurn':
      return inCombat(run, ev, (b) => endTurn(b));
    case 'usePotion':
      if (kind === 'combat') return inCombat(run, ev, (b) => usePotionInCombat(b, a.slot, a.target));
      return usePotionOutside(run, a.slot, ev);
    case 'discardPotion':
      if (!run.potions[a.slot]) return 'No potion in that slot.';
      run.potions[a.slot] = null;
      return null;
    case 'choose':
      if (kind === 'combat') return inCombat(run, ev, (b) => resolveChoice(b, a.uids));
      if (kind === 'cardSelect') return resolveCardSelect(run, a.uids, ev);
      return 'Nothing to choose.';
    case 'takeReward':
      return takeReward(run, a.index, a.cardIndex, ev);
    case 'skipReward':
      return skipReward(run, a.index);
    case 'leaveRewards':
      return leaveRewards(run, ev);
    case 'rest':
      return doRest(run, a.option, ev);
    case 'shopBuy':
      return shopBuy(run, a.kind, a.index, ev);
    case 'shopRemove':
      return shopRemove(run);
    case 'eventChoice':
      return eventChoice(run, a.index, ev);
    case 'openTreasure':
      return openTreasure(run, ev);
    case 'pickBossRelic':
      return pickBossRelic(run, a.id, ev);
    case 'proceed':
      return proceed(run, ev);
    default:
      return 'Unknown action.';
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Map & nodes

function pickEncounter(run: RunState, pool: EncounterDef['pool']): EncounterDef | null {
  const rng = stream(run, 'misc');
  const forAct = allEncounters().filter((e) => e.act === run.act);
  let cands = forAct.filter((e) => e.pool === pool);
  if (!cands.length && pool === 'easy') cands = forAct.filter((e) => e.pool === 'hard');
  if (!cands.length && pool === 'hard') cands = forAct.filter((e) => e.pool === 'easy');
  if (!cands.length) return null;
  const unseen = cands.filter((e) => !run.seenEncounters.includes(e.id));
  const list = unseen.length ? unseen : cands;
  return weightedPick(rng, list, (e) => e.weight ?? 1) ?? list[0];
}

function bossEncounter(run: RunState): { id: string; enemies: string[] } | null {
  const bossId = run.bosses[run.act - 1];
  if (!bossId) return null;
  const enc = allEncounters().find((e) => e.pool === 'boss' && e.act === run.act && e.enemies.includes(bossId));
  return enc ? { id: enc.id, enemies: enc.enemies } : { id: `boss:${bossId}`, enemies: [bossId] };
}

function selectNode(run: RunState, id: string, ev: GameEvent[]): string | null {
  if (!selectableNodes(run).includes(id)) return 'You cannot go there.';
  const node = run.map.nodes[id];
  const err = enterNode(run, node, ev);
  if (err) return err;
  run.map.current = id;
  run.map.visited.push(id);
  run.floor = node.floor;
  run.stats.floorsClimbed++;
  return null;
}

function enterNode(run: RunState, node: MapNode, ev: GameEvent[]): string | null {
  switch (node.type) {
    case 'fight':
    case 'elite': {
      const normal = node.type === 'fight';
      const enc = pickEncounter(run, normal ? (run.fightsThisAct < 3 ? 'easy' : 'hard') : 'elite');
      if (!enc) return 'No encounter available.';
      run.seenEncounters.push(enc.id);
      if (normal) run.fightsThisAct++;
      const b = startCombat(run, enc.enemies, normal ? 'normal' : 'elite', enc.id, ev);
      settle(run, b, ev);
      return null;
    }
    case 'boss': {
      const enc = bossEncounter(run);
      if (!enc) return 'No boss available.';
      const b = startCombat(run, enc.enemies, 'boss', enc.id, ev);
      settle(run, b, ev);
      return null;
    }
    case 'rest':
      run.screen = { kind: 'rest', done: false };
      return null;
    case 'shop':
      run.screen = { kind: 'shop', shop: generateShop(run) };
      return null;
    case 'treasure': {
      const rng = stream(run, 'rewards');
      run.screen = { kind: 'treasure', opened: false, relicId: randomRelicId(run, rng) };
      return null;
    }
    case 'event': {
      const rng = stream(run, 'events');
      const cands = allEvents().filter((e) => e.acts.includes(run.act) && !run.seenEvents.includes(e.id) && (!e.canAppear || safeCan(e.canAppear, run)));
      if (!cands.length) {
        // nothing left: fall back to an ordinary fight
        return enterNode(run, { ...node, type: 'fight' }, ev);
      }
      const def = cands[Math.floor(rng() * cands.length)];
      run.seenEvents.push(def.id);
      run.screen = { kind: 'event', event: { id: def.id, page: startPageId(def), mem: {} } };
      return null;
    }
    default:
      return 'Unknown node.';
  }
}

function safeCan(fn: (r: RunState) => boolean, run: RunState): boolean {
  try {
    return fn(run);
  } catch (e) {
    console.error('[fungeon] canAppear failed', e);
    return false;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Rewards

function takeReward(run: RunState, index: number, cardIndex: number | undefined, ev: GameEvent[]): string | null {
  if (run.screen.kind !== 'reward') return 'No rewards here.';
  const r = run.screen.rewards[index];
  if (!r) return 'No such reward.';
  if (r.taken) return 'Already taken.';
  switch (r.kind) {
    case 'gold':
      run.gold += r.amount;
      run.stats.goldEarned += r.amount;
      ev.push({ t: 'gold', delta: r.amount, after: run.gold });
      break;
    case 'card': {
      const opt = cardIndex === undefined ? undefined : r.options[cardIndex];
      if (!opt) return 'Pick one of the cards.';
      run.deck.push({ uid: opt.uid, id: opt.id, upgraded: opt.upgraded });
      break;
    }
    case 'relic':
      grantRelic(run, r.id, ev);
      break;
    case 'potion':
      if (!grantPotion(run, r.id, ev)) return 'No free Brew slot.';
      break;
  }
  r.taken = true;
  return null;
}

function skipReward(run: RunState, index: number): string | null {
  if (run.screen.kind !== 'reward') return 'No rewards here.';
  const r = run.screen.rewards[index];
  if (!r) return 'No such reward.';
  if (r.kind !== 'card') return 'Only card rewards can be skipped.';
  if (r.taken) return 'Already taken.';
  r.taken = true;
  return null;
}

function leaveRewards(run: RunState, ev: GameEvent[]): string | null {
  if (run.screen.kind !== 'reward') return 'No rewards here.';
  const cur = run.map.current ? run.map.nodes[run.map.current] : undefined;
  if (cur?.type === 'boss') return afterBoss(run, ev);
  run.screen = { kind: 'map' };
  return null;
}

function afterBoss(run: RunState, ev: GameEvent[]): string | null {
  const rng = stream(run, 'rewards');
  const options: string[] = [];
  for (let i = 0; i < 3; i++) {
    const id = randomRelicId(run, rng, 'boss', options);
    if (!id) break;
    options.push(id);
  }
  if (!options.length) return advanceAct(run, ev);
  run.screen = { kind: 'bossRelic', options };
  return null;
}

function pickBossRelic(run: RunState, id: string | null, ev: GameEvent[]): string | null {
  if (run.screen.kind !== 'bossRelic') return 'No keepsake to pick.';
  if (id !== null && !run.screen.options.includes(id)) return 'That keepsake is not on offer.';
  if (id !== null) grantRelic(run, id, ev);
  return advanceAct(run, ev);
}

function advanceAct(run: RunState, ev: GameEvent[]): string | null {
  if (run.act >= 3) {
    run.screen = { kind: 'victory' };
    ev.push({ t: 'victory' });
    return null;
  }
  const act = (run.act + 1) as 2 | 3;
  run.act = act;
  run.floor = 0;
  run.seenEncounters = [];
  run.fightsThisAct = 0;
  run.map = generateMap(stream(run, 'map'), act, run.ascension, run.bosses[act - 1]);
  const missing = run.maxHp - run.hp;
  const amount = Math.floor(missing * 0.75);
  if (amount > 0) {
    run.hp += amount;
    ev.push({ t: 'heal', target: PLAYER, amount, hpAfter: run.hp });
  }
  run.screen = { kind: 'map' };
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Rest, shop removal, treasure, proceed

function doRest(run: RunState, option: 'heal' | 'upgrade', ev: GameEvent[]): string | null {
  const s = run.screen;
  if (s.kind !== 'rest') return 'There is nothing to rest at.';
  if (s.done) return 'You already rested here.';
  if (option === 'heal') {
    if (run.relics.some((r) => r.id && noHealAtRest(r.id))) return 'You cannot rest to heal.';
    const pct = (run.ascension >= 5 ? 25 : 30) + passiveSum(run, 'restHealBonus');
    const amount = Math.min(run.maxHp - run.hp, Math.floor((run.maxHp * pct) / 100));
    if (amount > 0) {
      run.hp += amount;
      ev.push({ t: 'heal', target: PLAYER, amount, hpAfter: run.hp });
    }
    s.done = true;
    return null;
  }
  if (option === 'upgrade') {
    const candidates = run.deck.filter((c) => canUpgrade(c, getCard(c.id))).map((c) => c.uid);
    if (!candidates.length) return 'Nothing to upgrade.';
    run.screen = {
      kind: 'cardSelect',
      purpose: 'upgrade',
      prompt: 'Nurture which card?',
      count: 1,
      candidates,
      canSkip: true,
      returnTo: { kind: 'rest', done: false },
    };
    return null;
  }
  return 'Unknown rest option.';
}

import { findRelic } from './registry';
function noHealAtRest(id: string): boolean {
  return !!findRelic(id)?.passive?.noHealAtRest;
}

function shopRemove(run: RunState): string | null {
  const s = run.screen;
  if (s.kind !== 'shop') return 'You are not in a shop.';
  if (s.shop.removeUsed) return 'Already removed a card here.';
  if (run.gold < s.shop.removePrice) return 'Not enough Acorns.';
  if (!run.deck.length) return 'Your deck is empty.';
  run.screen = {
    kind: 'cardSelect',
    purpose: 'remove',
    prompt: 'Remove which card?',
    count: 1,
    candidates: run.deck.map((c) => c.uid),
    canSkip: true,
    returnTo: s,
  };
  return null;
}

function openTreasure(run: RunState, ev: GameEvent[]): string | null {
  const s = run.screen;
  if (s.kind !== 'treasure') return 'No chest here.';
  if (s.opened) return 'Already opened.';
  if (s.relicId) grantRelic(run, s.relicId, ev);
  s.opened = true;
  return null;
}

function proceed(run: RunState, ev: GameEvent[]): string | null {
  const s = run.screen;
  switch (s.kind) {
    case 'rest':
    case 'shop':
      run.screen = { kind: 'map' };
      return null;
    case 'treasure':
      if (!s.opened) return 'Open the chest first.';
      run.screen = { kind: 'map' };
      return null;
    case 'reward':
      return leaveRewards(run, ev);
    case 'bossRelic':
      return pickBossRelic(run, null, ev);
    default:
      return 'Nothing to proceed from.';
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Potions outside combat

function usePotionOutside(run: RunState, slot: number, ev: GameEvent[]): string | null {
  const id = run.potions[slot];
  if (!id) return 'No potion in that slot.';
  const def = findPotion(id);
  if (!def) return 'Unknown potion.';
  if (!def.outOfCombat) return 'That Brew can only be used in a fight.';
  if (def.target === 'enemy') return 'That Brew needs a target.';
  const c = newCombatState(run, 'normal', '');
  const b: Battle = { run, c, ev, rng: stream(run, 'combat'), source: null, allowChoice: false, cause: '', dry: false, depth: 0 };
  run.potions[slot] = null;
  ev.push({ t: 'potion', id });
  const api = new ApiImpl(b, PLAYER);
  safe(`potion ${id}.use`, () => def.use(api, undefined));
  run.maxHp = Math.max(1, c.player.maxHp);
  run.hp = Math.max(1, Math.min(c.player.hp, run.maxHp));
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Card select screen

function resolveCardSelect(run: RunState, uids: number[], ev: GameEvent[]): string | null {
  const s = run.screen;
  if (s.kind !== 'cardSelect') return 'Nothing to choose.';
  if (new Set(uids).size !== uids.length) return 'Duplicate cards chosen.';
  for (const u of uids) if (!s.candidates.includes(u)) return 'That card cannot be chosen.';
  const need = Math.min(s.count, s.candidates.length);
  const skipping = uids.length === 0 && s.canSkip;
  if (!skipping && uids.length !== need) return `Choose ${need} card${need === 1 ? '' : 's'}.`;

  const rng = stream(run, 'events');
  const chosen: CardInstance[] = uids.map((u) => run.deck.find((c) => c.uid === u)!).filter(Boolean);
  const back = s.returnTo;
  const purpose = s.purpose;
  const eventId = s.eventId;
  run.screen = back;

  switch (purpose) {
    case 'upgrade':
      for (const c of chosen) c.upgraded = true;
      break;
    case 'remove':
      run.deck = run.deck.filter((c) => !uids.includes(c.uid));
      if (back.kind === 'shop' && chosen.length) {
        run.gold -= back.shop.removePrice;
        ev.push({ t: 'gold', delta: -back.shop.removePrice, after: run.gold });
        back.shop.removeUsed = true;
        setRemovalsUsed(run, removalsUsed(run) + 1);
      }
      break;
    case 'transform':
      for (const c of chosen) {
        const i = run.deck.findIndex((x) => x.uid === c.uid);
        if (i >= 0) run.deck[i] = transformCard(run, c, rng);
      }
      break;
    case 'duplicate':
      for (const c of chosen) run.deck.push({ uid: run.nextUid++, id: c.id, upgraded: c.upgraded });
      break;
    case 'eventCustom': {
      const def = eventId ? findEvent(eventId) : undefined;
      if (def?.onCardSelect && back.kind === 'event') {
        const ctx = makeEventCtx(run, ev, back.event.mem);
        let ret: string | null = null;
        try {
          ret = def.onCardSelect(ctx, chosen);
        } catch (e) {
          console.error('[fungeon] event onCardSelect failed', e);
          ret = null;
        }
        finishEventStep(run, back, ret);
      }
      break;
    }
  }
  if (back.kind === 'rest' && purpose === 'upgrade' && chosen.length) back.done = true;
  if (run.hp <= 0 && run.screen.kind !== 'defeat') defeatFromEvent(run, ev, eventId);
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Events

function defeatFromEvent(run: RunState, ev: GameEvent[], eventId?: string): void {
  const name = eventId ? (findEvent(eventId)?.name ?? eventId) : 'the trail';
  run.hp = 0;
  run.screen = { kind: 'defeat', cause: name };
  ev.push({ t: 'defeat' });
}

/** Apply the return value of an event pick / onCardSelect. `evScreen` is the event screen that was active. */
function finishEventStep(run: RunState, evScreen: { kind: 'event'; event: { page: string } } & object, ret: string | null): void {
  if (run.screen !== evScreen) return; // the effect opened another screen (fight, rewards, card select)
  if (ret === 'screen') return;
  if (ret === null) {
    run.screen = { kind: 'map' };
    return;
  }
  const s = evScreen as { event: { id: string; page: string } };
  const def = findEvent(s.event.id);
  if (def && def.pages[ret]) s.event.page = ret;
  else run.screen = { kind: 'map' };
}

function eventChoice(run: RunState, index: number, ev: GameEvent[]): string | null {
  const s = run.screen;
  if (s.kind !== 'event') return 'No event here.';
  const def = findEvent(s.event.id);
  if (!def) {
    run.screen = { kind: 'map' };
    return null;
  }
  const page = resolvePage(def, run, s.event);
  const choice = page?.choices[index];
  if (!page || !choice) return 'No such choice.';
  const why = choice.disabled ? choice.disabled(run) : null;
  if (why) return why;
  const ctx = makeEventCtx(run, ev, s.event.mem);
  let ret: string | null = null;
  try {
    ret = choice.pick(ctx);
  } catch (e) {
    console.error('[fungeon] event pick failed', e);
    ret = null;
  }
  if (run.hp <= 0 && run.screen.kind !== 'defeat') {
    defeatFromEvent(run, ev, def.id);
    return null;
  }
  finishEventStep(run, s, ret);
  return null;
}

// (hashString is re-exported for tests / tools)
export { hashString };
