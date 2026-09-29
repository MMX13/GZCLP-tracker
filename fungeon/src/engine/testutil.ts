// Test-only fixtures + helpers. Replaces the registry contents with a tiny deterministic content set.
import { PLAYER, S } from './types';
import type { Action, CardDef, CardInstance, EnemyDef, EnemyMove, EventDef, GameEvent, RelicDef, RunState, StatusDef } from './types';
import {
  clearRegistry,
  registerCard,
  registerEncounter,
  registerEnemy,
  registerEvent,
  registerRelic,
  registerStatus,
  registerPotion,
} from './registry';
import { act, newRun } from './index';
import { startCombat, engineLog } from './combat';

const card = (d: Partial<CardDef> & Pick<CardDef, 'id'>): CardDef => ({
  name: d.id,
  type: 'skill',
  rarity: 'special',
  cost: 1,
  target: 'none',
  vals: {},
  text: '',
  art: 'bonk',
  ...d,
});

export const FIXTURE_CARDS: CardDef[] = [
  card({ id: 'bonk', type: 'attack', rarity: 'starter', target: 'enemy', vals: { dmg: 6 }, up: { dmg: 9 }, text: 'Deal {dmg} damage.', play: (a, v, t) => void a.attack(t!, v.dmg) }),
  card({ id: 'cap_up', rarity: 'starter', vals: { blk: 5 }, up: { blk: 8 }, text: 'Gain {blk} Block.', play: (a, v) => void a.gainBlock(v.blk) }),
  card({ id: 'spore_puff', type: 'attack', rarity: 'starter', target: 'enemy', vals: { dmg: 3, rot: 3 }, up: { dmg: 4, rot: 4 }, text: 'Deal {dmg} damage. Apply {rot} Rot.', play: (a, v, t) => { a.attack(t!, v.dmg); a.apply(t!, S.rot, v.rot); } }),
  card({
    id: 'seedling', type: 'plant', rarity: 'starter', vals: { blk: 3, draw: 2 }, text: 'Each turn: gain {blk} Block. Bloom: draw {draw}.',
    plant: { grow: 3, onGrow: (a, v) => void a.gainBlock(v.blk), onBloom: (a, v) => void a.draw(v.draw) },
  }),
  card({ id: 'spore', type: 'attack', rarity: 'token', cost: 0, target: 'enemy', vals: { dmg: 3, rot: 1 }, up: { dmg: 4, rot: 2 }, text: 'Deal {dmg} damage. Apply {rot} Rot.', keywords: ['compost'], play: (a, v, t) => { a.attack(t!, v.dmg); a.apply(t!, S.rot, v.rot); } }),
  card({ id: 'mold', type: 'status', rarity: 'special', cost: -1, vals: { hp: 2 }, text: 'End of turn in hand: lose {hp} HP.', keywords: ['unplayable'], onEndTurnInHand: (a, v) => void a.loseHp(PLAYER, v.hp) }),
  card({ id: 'slime', type: 'status', rarity: 'special', text: 'Does nothing.', keywords: ['compost'], play: () => {} }),
  card({ id: 'burr', type: 'status', rarity: 'special', cost: -1, text: 'Sticky.', keywords: ['unplayable', 'fleeting'] }),
  card({ id: 'mildew', type: 'curse', rarity: 'special', cost: -1, text: 'Damp.', keywords: ['unplayable'] }),
  card({ id: 'doubt', type: 'curse', rarity: 'special', cost: -1, vals: { wilt: 1 }, text: 'End of turn in hand: gain {wilt} Wilted.', keywords: ['unplayable'], onEndTurnInHand: (a, v) => void a.apply(PLAYER, S.wilted, v.wilt) }),

  // ---- test cards
  card({ id: 't_sprout', type: 'plant', vals: { blk: 1, dmg: 4 }, text: 'Each turn: block. Bloom: deal {dmg} to all.', plant: { grow: 2, onGrow: (a, v) => { a.gainBlock(v.blk); a.mem.grows = (a.mem.grows ?? 0) + 1; }, onBloom: (a, v) => void a.attackAll(v.dmg) } }),
  card({ id: 't_fern', type: 'plant', vals: { blk: 1 }, text: 'Each turn: block.', plant: { grow: null, onGrow: (a, v) => { a.gainBlock(v.blk); a.mem.fern = (a.mem.fern ?? 0) + 1; } } }),
  card({ id: 't_mulch', vals: { blk: 6 }, text: 'Gain {blk} Block. Compost a card from your hand.', play: (a, v) => { a.gainBlock(v.blk); a.choose({ prompt: 'Compost', from: 'hand', min: 1, max: 1, action: 'compost' }); }, afterChoice: (a, _v, ch) => { a.mem.afterChoice = ch.length; } }),
  card({ id: 't_draw3', vals: { n: 3 }, text: 'Draw {n}.', play: (a, v) => void a.draw(v.n) }),
  card({ id: 't_x', cost: 'X', vals: {}, text: 'Gain {x} x2 Block.', play: (a, v) => void a.gainBlock(v.x * 2, false) }),
  card({ id: 't_bloomcost', type: 'attack', nutrients: 2, target: 'enemy', vals: { dmg: 20 }, text: 'Deal {dmg}.', play: (a, v, t) => void a.attack(t!, v.dmg) }),
  card({ id: 't_fleeting', keywords: ['fleeting'], vals: { blk: 1 }, text: 'Gain {blk}.', play: (a, v) => void a.gainBlock(v.blk) }),
  card({ id: 't_keep', keywords: ['keep'], text: 'Kept.', play: () => {} }),
  card({ id: 't_innate', keywords: ['innate'], text: 'Innate card.', play: () => {} }),
  card({ id: 't_compostme', keywords: ['compost'], text: 'Nothing.', play: () => {} }),
  card({ id: 't_aoe', type: 'attack', vals: { dmg: 5 }, text: 'Deal {dmg} to ALL.', play: (a, v) => void a.attackAll(v.dmg) }),
  card({ id: 't_rot', target: 'enemy', vals: { rot: 5 }, text: 'Apply {rot} Rot.', play: (a, v, t) => void a.apply(t!, S.rot, v.rot) }),
  card({ id: 't_might', vals: { n: 3 }, text: 'Gain {n} Might.', play: (a, v) => void a.apply(PLAYER, S.might, v.n) }),
  card({ id: 't_apply', target: 'enemy', vals: { n: 2 }, text: 'Apply status.', play: (a, v, t) => { a.apply(t!, S.soggy, v.n); a.apply(t!, S.wilted, v.n); } }),
  card({ id: 't_self', vals: { n: 2 }, text: 'Self apply.', play: (a, v) => { a.apply(PLAYER, S.wilted, v.n); a.apply(PLAYER, S.brittle, v.n); a.apply(PLAYER, S.sturdy, v.n); } }),
  card({ id: 't_loseHp', vals: { n: 4 }, text: 'Lose {n} HP.', play: (a, v) => void a.loseHp(PLAYER, v.n) }),
  card({ id: 't_broken', text: 'Throws.', play: () => { throw new Error('boom'); } }),
  card({ id: 't_options', text: 'Pick one.', play: (a) => a.choose({ prompt: 'Pick', from: 'options', min: 1, max: 1, action: 'toHand', options: [a.makeCard('bonk'), a.makeCard('cap_up')] }), afterChoice: (a, _v, ch) => { a.setCost(ch[0].uid, 0, true); a.mem.picked = ch[0].uid; } }),
  card({ id: 't_topdeck', text: 'Topdeck a discarded card.', play: (a) => a.choose({ prompt: 'Top', from: 'discard', min: 0, max: 1, action: 'topdeck' }) }),
  card({ id: 't_spawn', text: 'Spawn.', play: (a) => void a.spawnEnemy('weak', 'left') }),
  card({ id: 't_upcost', cost: 2, upCost: 1, text: 'Upgraded costs 1.', upText: 'Upgraded costs 1 (up).', play: () => {} }),
  card({ id: 't_canplay', text: 'Needs 2 plants.', canPlay: (a) => (a.plants().length >= 2 ? null : 'Need 2 plants.'), play: () => {} }),
  card({ id: 't_kill', target: 'enemy', text: 'Lose all HP.', play: (a, _v, t) => void a.loseHp(t!, 999) }),
  card({ id: 't_power', type: 'power', vals: { n: 2 }, text: 'Gain {n} Test Power.', play: (a, v) => void a.apply(PLAYER, 't_power', v.n) }),
  card({ id: 't_shiver', target: 'none', text: 'Free Spore x2.', play: (a) => void a.addCard('spore', 'hand', 2) }),
  card({ id: 't_filler', text: 'nothing', play: () => {} }),
  card({ id: 't_common', rarity: 'common', text: 'c' }),
  card({ id: 't_uncommon', rarity: 'uncommon', text: 'u' }),
  card({ id: 't_rare', rarity: 'rare', text: 'r' }),
  card({ id: 't_common2', rarity: 'common', text: 'c2' }),
  card({ id: 't_uncommon2', rarity: 'uncommon', text: 'u2' }),
  card({ id: 't_rare2', rarity: 'rare', text: 'r2' }),
  card({ id: 't_rare3', rarity: 'rare', text: 'r3' }),
];

const mv = (name: string, dmg: number | undefined, run: EnemyMove['run'] = () => {}): EnemyMove => ({ name, intents: dmg !== undefined ? ['attack'] : ['block'], dmg, hits: dmg !== undefined ? 1 : undefined, run });

const enemy = (d: Partial<EnemyDef> & Pick<EnemyDef, 'id'>): EnemyDef => ({
  name: d.id,
  act: 1,
  tier: 'normal',
  hp: [20, 20],
  art: d.id,
  moves: {},
  ai: () => 'hit',
  ...d,
});

export const FIXTURE_ENEMIES: EnemyDef[] = [
  enemy({
    id: 'dummy',
    hp: [30, 30],
    moves: {
      hit: mv('Hit', 5, (a) => void a.attack(PLAYER, 5)),
      guard: mv('Guard', undefined, (a) => void a.gainBlock(6, false)),
    },
    ai: (c) => (c.history.length % 2 === 0 ? 'hit' : 'guard'),
  }),
  enemy({ id: 'weak', hp: [1, 1], moves: { hit: mv('Hit', 1, (a) => void a.attack(PLAYER, 1)) } }),
  enemy({ id: 'sponge', hp: [1000, 1000], moves: { hit: mv('Hit', 0, (a) => void a.attack(PLAYER, 0)) } }),
  enemy({ id: 'idle', hp: [50, 50], moves: { nap: mv('Nap', undefined) }, ai: () => 'nap' }),
  enemy({ id: 'biter', hp: [50, 50], moves: { hit: mv('Bite', 10, (a) => void a.attack(PLAYER, 10)) } }),
  enemy({ id: 'multi', hp: [50, 50], moves: { flurry: { name: 'Flurry', intents: ['attack'], dmg: 3, hits: 3, run: (a) => { for (let i = 0; i < 3; i++) a.attack(PLAYER, 3); } } }, ai: () => 'flurry' }),
  enemy({ id: 'thorny', hp: [40, 40], onSpawn: (a, s) => a.apply(s.uid, S.prickly, 3), moves: { hit: mv('Hit', 1, (a) => void a.attack(PLAYER, 1)) } }),
  enemy({
    id: 'splitter',
    hp: [10, 10],
    hooks: { onEnemyDeath: (api, _n, dead) => { if (dead !== api.self) return; api.spawnEnemy('weak', 'right'); api.spawnEnemy('weak', 'right'); api.mem.splitSawRot = api.enemy(dead)?.statuses.rot ?? 0; } },
    moves: { hit: mv('Hit', 1, (a) => void a.attack(PLAYER, 1)) },
  }),
  enemy({
    id: 'zombie',
    hp: [10, 10],
    hooks: { onEnemyDeath: (api, _n, dead) => { if (dead !== api.self) return; const e = api.enemy(dead)!; if (e.mem.revived) return; const s = api.spawnEnemy('zombie', 'right'); if (s) { s.mem.revived = 1; s.hp = 5; } } },
    moves: { hit: mv('Hit', 1, (a) => void a.attack(PLAYER, 1)) },
  }),
  enemy({
    id: 'boss_half',
    tier: 'boss',
    act: 3,
    hp: [100, 100],
    hooks: { onHpLoss: (api) => { const e = api.enemy(api.self)!; if (e.hp * 2 <= e.maxHp && !e.mem.phase2) { e.mem.phase2 = 1; api.say(e.uid, 'Phase 2'); } } },
    moves: { hit: mv('Hit', 1, (a) => void a.attack(PLAYER, 1)) },
  }),
  enemy({ id: 'spawner_on_hit', hp: [50, 50], moves: { hit: mv('Hit', 1, (a) => void a.attack(PLAYER, 1)) }, hooks: { onAttacked: (api, _n, _att, dealt) => { api.mem.attackedDealt = dealt; } } }),
  enemy({ id: 'brokenai', hp: [10, 10], moves: { hit: mv('Hit', 1, (a) => void a.attack(PLAYER, 1)) }, ai: () => { throw new Error('ai broke'); } }),
  enemy({ id: 'armored', hp: [50, 50], onSpawn: (a, s) => a.apply(s.uid, S.armored, 2), moves: { guard: mv('Guard', undefined, (a) => void a.gainBlock(10, false)), hit: mv('Hit', 1, (a) => void a.attack(PLAYER, 1)) }, ai: (c) => (c.history.length === 0 ? 'guard' : 'hit') }),
  enemy({ id: 'shelly', hp: [50, 50], onSpawn: (a, s) => a.apply(s.uid, S.shelled, 4), moves: { hit: mv('Hit', 1, (a) => void a.attack(PLAYER, 1)) } }),
  enemy({ id: 'grower', hp: [50, 50], onSpawn: (a, s) => a.apply(s.uid, S.growing, 2), moves: { hit: mv('Hit', 1, (a) => void a.attack(PLAYER, 1)) } }),
  enemy({ id: 'escaper', hp: [50, 50], moves: { flee: { name: 'Flee', intents: ['escape'], run: (a, s) => a.escape(s.uid) } }, ai: () => 'flee' }),
  enemy({ id: 'wgt', hp: [50, 50], moves: { a: mv('A', undefined), b: mv('B', undefined), c: mv('C', undefined) }, ai: (c) => c.weighted({ a: 10, b: 1, c: 1 }, 2) }),
  // per-act flow enemies
  ...([1, 2, 3] as const).flatMap((act) => [
    enemy({ id: `a${act}_norm`, act, hp: [8, 8], moves: { hit: mv('Hit', 2, (a) => void a.attack(PLAYER, 2)) } }),
    enemy({ id: `a${act}_elite`, act, tier: 'elite', hp: [12, 12], moves: { hit: mv('Hit', 3, (a) => void a.attack(PLAYER, 3)) } }),
    enemy({ id: `a${act}_boss1`, act, tier: 'boss', hp: [20, 20], moves: { hit: mv('Hit', 4, (a) => void a.attack(PLAYER, 4)) } }),
    enemy({ id: `a${act}_boss2`, act, tier: 'boss', hp: [22, 22], moves: { hit: mv('Hit', 4, (a) => void a.attack(PLAYER, 4)) } }),
  ]),
];

export const FIXTURE_STATUS: StatusDef[] = [
  {
    id: 't_power', name: 'Test Power', kind: 'buff', decay: 'none', icon: 'st-power', desc: (n) => `Gain ${n} Block at turn start.`,
    onTurnStart: (a, n) => void a.gainBlock(n, false),
    onCardPlayed: (a, n) => { a.mem.cardsSeen = (a.mem.cardsSeen ?? 0) + n; },
  },
  {
    id: 't_thorny', name: 'Test Thorn', kind: 'buff', decay: 'none', icon: 'st-power', desc: () => 'x',
    onAttacked: (a, _n, att, dealt) => { a.mem.thornAtt = dealt; a.mem.thornWho = att === PLAYER ? 1 : 2; },
  },
];

export const FIXTURE_RELICS: RelicDef[] = [
  { id: 'lucky_acorn', name: 'Lucky Acorn', rarity: 'starter', desc: 'Heal 5 at end of combat.', icon: 'acorn', onCombatEnd: (a) => void a.heal(PLAYER, 5) },
  { id: 't_plots', name: 'Plots', rarity: 'common', desc: '+1 plot', icon: 'acorn', passive: { gardenPlots: 1 } },
  { id: 't_energy', name: 'Energy', rarity: 'boss', desc: '+1 energy', icon: 'acorn', passive: { maxEnergy: 1, handSize: 1, potionSlots: 1 } },
  { id: 't_dmg', name: 'Dmg', rarity: 'uncommon', desc: '+2 attack', icon: 'acorn', modifyAttack: (_n, base) => base + 2 },
  { id: 't_blk', name: 'Blk', rarity: 'rare', desc: '+1 block', icon: 'acorn', modifyBlock: (_n, base) => base + 1 },
  { id: 't_start', name: 'Start', rarity: 'common', desc: 'on combat start: 4 block; on turn 1 start energy+1', icon: 'acorn', onCombatStart: (a) => void a.gainBlock(4, false), onTurnStart: (a) => { a.mem.turnStarts = (a.mem.turnStarts ?? 0) + 1; } },
  { id: 't_boss1', name: 'Boss1', rarity: 'boss', desc: 'b', icon: 'acorn' },
  { id: 't_boss2', name: 'Boss2', rarity: 'boss', desc: 'b', icon: 'acorn' },
  { id: 't_boss3', name: 'Boss3', rarity: 'boss', desc: 'b', icon: 'acorn' },
  { id: 't_shop', name: 'ShopRelic', rarity: 'shop', desc: 's', icon: 'acorn' },
  { id: 't_hp', name: 'Hp', rarity: 'common', desc: '+10 max hp', icon: 'acorn', onPickup: (r) => { r.maxHp += 10; r.hp += 10; } },
  { id: 't_rot', name: 'Rot relic', rarity: 'common', desc: 'x', icon: 'acorn', onApplyRot: (a, _n, target, amount) => { a.mem.rotSeen = (a.mem.rotSeen ?? 0) + amount; if (a.mem.rotRecur !== 1) { a.mem.rotRecur = 1; a.apply(target, S.rot, 1); a.mem.rotRecur = 0; } } },
  { id: 't_loop', name: 'Loop', rarity: 'common', desc: 'x', icon: 'acorn', onApplyRot: (a, _n, target) => void a.apply(target, S.rot, 1) },
  { id: 't_rest', name: 'Rest', rarity: 'common', desc: 'x', icon: 'acorn', passive: { restHealBonus: 20, shopDiscount: 0.5, cardRewardChoices: 1 } },
  { id: 't_noheal', name: 'NoHeal', rarity: 'common', desc: 'x', icon: 'acorn', passive: { noHealAtRest: true } },
];

export const FIXTURE_EVENTS: EventDef[] = [
  {
    id: 't_event', name: 'Test Event', acts: [1, 2, 3], art: 'well',
    pages: {
      start: {
        text: 'Start',
        choices: [
          { label: 'Gold', pick: (c) => { c.gainGold(10); return 'after'; } },
          { label: 'Hurt', pick: (c) => { c.damage(5); return null; } },
          { label: 'Poor', disabled: (r) => (r.gold < 1000 ? 'Need 1000' : null), pick: () => null },
          { label: 'Remove', pick: (c) => { const s = c.run.screen; if (s.kind === 'event') s.event.page = 'removed'; c.selectCards('remove', 'Remove one', 1, undefined, false); return 'screen'; } },
          { label: 'Custom', pick: (c) => { c.selectCards('eventCustom', 'Pick', 1, undefined, true); return 'screen'; } },
          { label: 'Fight', pick: (c) => { c.startFight('a1_e', 'elite'); return 'screen'; } },
          { label: 'Rewards', pick: (c) => { c.giveRewards([{ kind: 'gold', amount: 7 }]); return 'screen'; } },
          { label: 'Die', disabled: (r) => (r.maxHp > 1000 ? 'bots stay away' : null), pick: (c) => { c.damage(9999); return null; } },
          { label: 'Throw', pick: () => { throw new Error('event boom'); } },
        ],
      },
      after: () => ({ text: 'After', choices: [{ label: 'Leave', pick: () => null }] }),
      removed: { text: 'Removed', choices: [{ label: 'Leave', pick: () => null }] },
      custom_done: { text: 'Custom done', choices: [{ label: 'Leave', pick: () => null }] },
    },
    onCardSelect: (c, chosen) => { c.mem.chosen = chosen.length; c.run.deck = c.run.deck.filter((x) => !chosen.some((y) => y.uid === x.uid)); return chosen.length ? 'custom_done' : null; },
  },
];

let installed = false;
/** Replace registry contents by the fixture set (core statuses from content/statuses.ts stay). Idempotent. */
export function installFixtures(): void {
  clearRegistry({ statuses: false });
  for (const c of FIXTURE_CARDS) registerCard(c);
  for (const e of FIXTURE_ENEMIES) registerEnemy(e);
  for (const s of FIXTURE_STATUS) registerStatus(s);
  for (const r of FIXTURE_RELICS) registerRelic(r);
  registerPotion({ id: 't_heal', name: 'Heal', rarity: 'common', desc: 'heal 10', target: 'none', icon: 'potion-red', outOfCombat: true, use: (a) => void a.heal(PLAYER, 10) });
  registerPotion({ id: 't_poison', name: 'Poison', rarity: 'uncommon', desc: 'rot 6', target: 'enemy', icon: 'potion-green', use: (a, t) => void a.apply(t!, S.rot, 6) });
  registerPotion({ id: 't_rare', name: 'Rare', rarity: 'rare', desc: 'draw', target: 'none', icon: 'potion-blue', use: (a) => void a.draw(2) });
  for (const e of FIXTURE_EVENTS) registerEvent(e);
  for (const act of [1, 2, 3] as const) {
    registerEncounter({ id: `a${act}_e1`, act, pool: 'easy', enemies: [`a${act}_norm`] });
    registerEncounter({ id: `a${act}_e2`, act, pool: 'easy', enemies: [`a${act}_norm`, `a${act}_norm`] });
    registerEncounter({ id: `a${act}_e3`, act, pool: 'easy', enemies: [`a${act}_norm`] });
    registerEncounter({ id: `a${act}_e4`, act, pool: 'easy', enemies: [`a${act}_norm`] });
    registerEncounter({ id: `a${act}_h1`, act, pool: 'hard', enemies: [`a${act}_norm`, `a${act}_norm`] });
    registerEncounter({ id: `a${act}_h2`, act, pool: 'hard', enemies: [`a${act}_norm`] });
    registerEncounter({ id: `a${act}_h3`, act, pool: 'hard', enemies: [`a${act}_norm`] });
    registerEncounter({ id: `a${act}_h4`, act, pool: 'hard', enemies: [`a${act}_norm`] });
    registerEncounter({ id: `a${act}_el1`, act, pool: 'elite', enemies: [`a${act}_elite`] });
    registerEncounter({ id: `a${act}_el2`, act, pool: 'elite', enemies: [`a${act}_elite`] });
    registerEncounter({ id: `a${act}_b1`, act, pool: 'boss', enemies: [`a${act}_boss1`] });
    registerEncounter({ id: `a${act}_b2`, act, pool: 'boss', enemies: [`a${act}_boss2`] });
  }
  registerEncounter({ id: 'a1_e', act: 1, pool: 'elite', enemies: ['a1_elite'] });
  installed = true;
  engineLog.quiet = true;
}
export const fixturesInstalled = () => installed;

// ---------------------------------------------------------------------------------------------------------------
// Scenario helpers

export interface Scenario {
  run: RunState;
  events: GameEvent[];
}

export interface SetupOpts {
  enemies?: string[];
  hand?: string[];
  draw?: string[];
  discard?: string[];
  relics?: string[];
  ascension?: number;
  kind?: 'normal' | 'elite' | 'boss';
  seed?: string;
  energy?: number;
  /** keep the natural draw (do not override piles) */
  natural?: boolean;
  /** replace the run deck (card ids) before the fight starts */
  deck?: string[];
}

let uidBase = 100000;
export const inst = (id: string, upgraded = false): CardInstance => ({ uid: ++uidBase, id, upgraded });

/** Start a combat with a hand you choose (default enemies: one dummy). Returns the run positioned in the player's turn 1. */
export function setup(o: SetupOpts = {}): Scenario {
  const run = newRun({ seed: o.seed ?? 'TEST', ascension: o.ascension ?? 0, now: 0 });
  for (const r of o.relics ?? []) run.relics.push({ id: r, counter: 0 });
  if (o.deck) run.deck = o.deck.map((id) => ({ uid: run.nextUid++, id, upgraded: false }));
  const events: GameEvent[] = [];
  startCombat(run, o.enemies ?? ['dummy'], o.kind ?? 'normal', 'test', events);
  if (run.screen.kind !== 'combat') throw new Error('combat did not start');
  const c = run.screen.combat;
  if (!o.natural) {
    c.hand = (o.hand ?? []).map((id) => ({ uid: run.nextUid++, id, upgraded: false }));
    c.draw = (o.draw ?? Array(40).fill('t_filler')).map((id) => ({ uid: run.nextUid++, id, upgraded: false }));
    c.discard = (o.discard ?? []).map((id) => ({ uid: run.nextUid++, id, upgraded: false }));
    c.player.energy = o.energy ?? c.player.maxEnergy;
  }
  return { run, events: [] };
}

export function cbt(run: RunState) {
  if (run.screen.kind !== 'combat') throw new Error('not in combat, screen=' + run.screen.kind);
  return run.screen.combat;
}

/** Apply an action and assert it succeeded. */
export function step(sc: Scenario, action: Action): Scenario {
  const r = act(sc.run, action);
  if (r.error) throw new Error(`action ${JSON.stringify(action)} rejected: ${r.error}`);
  return { run: r.run, events: r.events };
}
export function play(sc: Scenario, idOrUid: string | number, target?: string): Scenario {
  const c = cbt(sc.run);
  const card = typeof idOrUid === 'number' ? c.hand.find((x) => x.uid === idOrUid) : c.hand.find((x) => x.id === idOrUid);
  if (!card) throw new Error(`card ${idOrUid} not in hand: ${c.hand.map((x) => x.id).join(',')}`);
  return step(sc, { type: 'playCard', uid: card.uid, target: target ?? (c.enemies.find((e) => e.alive)?.uid) });
}
export const endTurn = (sc: Scenario) => step(sc, { type: 'endTurn' });
export const enemyOf = (run: RunState, i = 0) => cbt(run).enemies[i];
