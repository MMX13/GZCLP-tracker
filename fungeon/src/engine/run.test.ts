import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { act, newRun, serialize, deserialize, selectableNodes, eventView, hashSeedForTests, restInfo } from './index';
import type { Action, GameEvent, RunState, MapNode } from './types';
import { installFixtures, step, cbt } from './testutil';
import { generateMap } from './map';
import { stream, hashString } from './rng';
import { randomAction } from './autoplay';
import { generateShop } from './shop';

before(() => installFixtures());

const mkRng = (seed: string) => {
  let s = hashString(seed);
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const fresh = (o: Parameters<typeof newRun>[0] = {}) => newRun({ seed: 'RUN', now: 0, ...o });

describe('rng', () => {
  test('hashSeed is stable and streams are independent', () => {
    assert.equal(hashSeedForTests('ABC'), hashSeedForTests('ABC'));
    assert.notEqual(hashSeedForTests('ABC'), hashSeedForTests('ABD'));
    const a = fresh();
    const b = fresh();
    assert.deepEqual(a.rng, b.rng);
    const before = { ...a.rng };
    stream(a, 'combat')();
    assert.equal(a.rng.map, before.map);
    assert.notEqual(a.rng.combat, before.combat);
    for (const v of Object.values(a.rng)) assert.ok(Number.isInteger(v) && v >= 0 && v < 2 ** 32);
  });
  test('stream values are in [0,1) and roughly uniform', () => {
    const run = fresh();
    const r = stream(run, 'misc');
    let sum = 0;
    for (let i = 0; i < 5000; i++) {
      const v = r();
      assert.ok(v >= 0 && v < 1);
      sum += v;
    }
    assert.ok(Math.abs(sum / 5000 - 0.5) < 0.03);
  });
});

describe('new run', () => {
  test('starting state', () => {
    const r = fresh();
    assert.equal(r.hp, 70);
    assert.equal(r.maxHp, 70);
    assert.equal(r.gold, 99);
    assert.equal(r.potions.length, 3);
    assert.deepEqual(r.deck.map((c) => c.id).sort(), ['bonk', 'bonk', 'bonk', 'bonk', 'cap_up', 'cap_up', 'cap_up', 'cap_up', 'seedling', 'spore_puff']);
    assert.deepEqual(r.relics, [{ id: 'lucky_acorn', counter: 0 }]);
    assert.equal(r.screen.kind, 'map');
    assert.equal(r.act, 1);
    assert.equal(r.floor, 0);
    assert.equal(new Set(r.deck.map((c) => c.uid)).size, 10);
    assert.equal(r.bosses.length, 3);
    assert.ok(r.bosses[0].startsWith('a1_boss'));
    assert.ok(r.bosses[2].startsWith('a3_boss'));
    assert.equal(r.map.bossId, r.bosses[0]);
  });
  test('blight levels 6 and 9', () => {
    assert.ok(fresh({ ascension: 6 }).deck.some((c) => c.id === 'mildew'));
    assert.ok(!fresh({ ascension: 5 }).deck.some((c) => c.id === 'mildew'));
    assert.equal(fresh({ ascension: 9 }).hp, 63);
    assert.equal(fresh({ ascension: 9 }).maxHp, 70);
    assert.equal(fresh({ ascension: 99 }).ascension, 10);
  });
  test('seeds are normalised; a random one is uppercase', () => {
    assert.equal(fresh({ seed: 'abc' }).seed, 'ABC');
    assert.match(newRun({}).seed, /^[A-Z]+$/);
  });
});

function checkMap(m: { nodes: Record<string, MapNode> }, label: string) {
  const nodes = Object.values(m.nodes);
  const byFloor = new Map<number, MapNode[]>();
  for (const n of nodes) byFloor.set(n.floor, [...(byFloor.get(n.floor) ?? []), n]);
  const start = byFloor.get(1)!;
  assert.ok(start.length >= 3 && start.length <= 4, `${label}: ${start.length} starting nodes`);
  assert.equal(byFloor.get(11)!.length, 1, label);
  const boss = byFloor.get(11)![0];
  assert.equal(boss.type, 'boss');
  assert.equal(boss.id, '11-2');
  for (let f = 1; f <= 10; f++) assert.ok((byFloor.get(f)?.length ?? 0) >= 2, `${label}: floor ${f} has <2 nodes`);
  const parents = new Map<string, string[]>();
  for (const n of nodes) {
    if (n.floor < 11) assert.ok(n.next.length >= 1 && n.next.length <= 3, `${label}: ${n.id} has ${n.next.length} next`);
    for (const t of n.next) {
      const tn = m.nodes[t];
      assert.ok(tn, `${label}: dangling edge ${n.id}->${t}`);
      assert.equal(tn.floor, n.floor + 1);
      if (n.floor < 10) assert.ok(Math.abs(tn.lane - n.lane) <= 1, `${label}: edge ${n.id}->${t} too wide`);
      parents.set(t, [...(parents.get(t) ?? []), n.id]);
    }
    assert.equal(n.id, `${n.floor}-${n.lane}`);
  }
  // no crossing
  for (let f = 1; f <= 10; f++) {
    const row = byFloor.get(f)!;
    for (const a of row) for (const b of row) {
      if (a.lane < b.lane) for (const ta of a.next) for (const tb of b.next) assert.ok(m.nodes[ta].lane <= m.nodes[tb].lane, `${label}: paths cross ${a.id}->${ta} vs ${b.id}->${tb}`);
    }
  }
  // reachability from start, and every node reaches the boss
  const seen = new Set<string>(start.map((n) => n.id));
  const queue = [...seen];
  while (queue.length) for (const t of m.nodes[queue.shift()!].next) if (!seen.has(t)) { seen.add(t); queue.push(t); }
  assert.equal(seen.size, nodes.length, `${label}: unreachable nodes`);
  const reach = new Set<string>([boss.id]);
  for (let f = 10; f >= 1; f--) for (const n of byFloor.get(f)!) if (n.next.some((t) => reach.has(t))) reach.add(n.id);
  assert.equal(reach.size, nodes.length, `${label}: dead-end nodes`);
  // types
  for (const n of nodes) {
    if (n.floor === 1) assert.equal(n.type, 'fight');
    if (n.floor === 6) assert.equal(n.type, 'treasure');
    if (n.floor === 10) assert.equal(n.type, 'rest');
    if (n.floor < 5) assert.notEqual(n.type, 'elite');
    if (n.floor === 9) assert.notEqual(n.type, 'rest');
    if (n.floor !== 6 && n.floor < 11) assert.notEqual(n.type, 'treasure');
    if (n.floor !== 11) assert.notEqual(n.type, 'boss');
    if (n.type === 'shop' || n.type === 'rest') for (const p of parents.get(n.id) ?? []) assert.notEqual(m.nodes[p].type, n.type, `${label}: two ${n.type}s in a row at ${n.id}`);
  }
}

describe('map generation', () => {
  test('200 seeds: valid maps for all acts', () => {
    const counts = { fight: 0, event: 0, elite: 0, rest: 0, shop: 0, treasure: 0 } as Record<string, number>;
    let over4 = 0;
    for (let i = 0; i < 200; i++) {
      const run = fresh({ seed: 'MAP' + i });
      for (const act of [1, 2, 3] as const) {
        const m = act === 1 ? run.map : generateMap(stream(run, 'map'), act, i % 11, 'x');
        checkMap(m, `seed ${i} act ${act}`);
        for (const n of Object.values(m.nodes)) {
          counts[n.type] = (counts[n.type] ?? 0) + 1;
          if (n.floor > 1 && n.floor < 11 && Object.values(m.nodes).filter((x) => x.floor === n.floor).length > 4) over4++;
        }
      }
    }
    assert.equal(over4, 0);
    assert.ok(counts.fight > counts.event && counts.event > counts.rest && counts.elite > 0 && counts.shop > 0);
  });
  test('same seed -> same map; different seeds differ', () => {
    assert.deepEqual(fresh({ seed: 'X' }).map, fresh({ seed: 'X' }).map);
    assert.notDeepEqual(fresh({ seed: 'X' }).map.nodes, fresh({ seed: 'Y' }).map.nodes);
  });
  test('selectableNodes: start nodes, then next of current', () => {
    let r = fresh();
    const start = selectableNodes(r);
    assert.ok(start.length >= 3);
    assert.ok(start.every((id) => id.startsWith('1-')));
    assert.ok(act(r, { type: 'selectNode', nodeId: '5-0' }).error);
    r = step({ run: r, events: [] }, { type: 'selectNode', nodeId: start[0] }).run;
    assert.equal(r.screen.kind, 'combat');
    assert.deepEqual(selectableNodes(r), []);
    assert.equal(r.floor, 1);
    assert.equal(r.map.current, start[0]);
    assert.deepEqual(r.map.visited, [start[0]]);
  });
  test('blight 1 makes elites more common', () => {
    let e0 = 0;
    let e1 = 0;
    for (let i = 0; i < 100; i++) {
      const run = fresh({ seed: 'EL' + i });
      e0 += Object.values(generateMap(stream(run, 'map'), 1, 0, 'x').nodes).filter((n) => n.type === 'elite').length;
      const run2 = fresh({ seed: 'EL' + i });
      e1 += Object.values(generateMap(stream(run2, 'map'), 1, 1, 'x').nodes).filter((n) => n.type === 'elite').length;
    }
    assert.ok(e1 > e0, `${e1} > ${e0}`);
  });
});

/** Walk to the first node of the given type on a fabricated map (edges are rewired so the walk is short). */
function goto(run: RunState, type: MapNode['type']): { run: RunState; events: GameEvent[] } {
  const r = structuredClone(run);
  r.map.current = null;
  const id = `1-0`;
  r.map.nodes[id] = { id, floor: 1, lane: 0, type, next: [] };
  r.map.nodes['1-1'] = { id: '1-1', floor: 1, lane: 1, type: 'fight', next: [] };
  for (const n of Object.values(r.map.nodes)) if (n.floor === 1 && n.id !== id && n.id !== '1-1') delete r.map.nodes[n.id];
  return step({ run: r, events: [] }, { type: 'selectNode', nodeId: id });
}

describe('rewards', () => {
  function fightAndWin(run: RunState, type: 'fight' | 'elite' | 'boss') {
    let sc = goto(run, type);
    const c = cbt(sc.run);
    for (const e of c.enemies) e.hp = 1;
    c.hand.push({ uid: 900001, id: 'bonk', upgraded: false });
    for (const e of c.enemies.filter((x) => x.alive)) {
      sc = step(sc, { type: 'playCard', uid: cbt(sc.run).hand.find((h) => h.id === 'bonk')!.uid, target: e.uid });
      if (sc.run.screen.kind !== 'combat') break;
      cbt(sc.run).hand.push({ uid: sc.run.nextUid++, id: 'bonk', upgraded: false });
      cbt(sc.run).player.energy = 3;
    }
    return sc;
  }
  test('normal fight: gold 12-20, 3 card choices, pity offset, potion chance', () => {
    const golds = new Set<number>();
    for (let i = 0; i < 40; i++) {
      const sc = fightAndWin(fresh({ seed: 'RW' + i }), 'fight');
      assert.equal(sc.run.screen.kind, 'reward');
      const rw = (sc.run.screen as Extract<RunState['screen'], { kind: 'reward' }>).rewards;
      const gold = rw.find((r) => r.kind === 'gold') as { amount: number };
      assert.ok(gold.amount >= 12 && gold.amount <= 20);
      golds.add(gold.amount);
      const card = rw.find((r) => r.kind === 'card') as { options: { id: string; uid: number }[] };
      assert.equal(card.options.length, 3);
      assert.equal(new Set(card.options.map((o) => o.id)).size, 3);
      assert.ok(card.options.every((o) => !['bonk', 'cap_up', 'spore', 'mold', 'mildew'].includes(o.id)));
      let offset = 0;
      for (const o of card.options) offset = o.id.startsWith('t_rare') ? 0 : offset + 1;
      assert.equal(sc.run.rareOffset, offset);
      assert.equal(sc.run.potionChance === 30 || sc.run.potionChance === 50, true);
      assert.equal(rw.some((r) => r.kind === 'potion'), sc.run.potionChance === 30);
    }
    assert.ok(golds.size > 3);
  });
  test('taking / skipping / leaving rewards', () => {
    let sc = fightAndWin(fresh(), 'fight');
    const before = sc.run.gold;
    assert.ok(act(sc.run, { type: 'takeReward', index: 1 }).error); // needs cardIndex
    assert.ok(act(sc.run, { type: 'takeReward', index: 9 }).error);
    sc = step(sc, { type: 'takeReward', index: 0 });
    assert.ok(sc.run.gold > before);
    assert.ok(act(sc.run, { type: 'takeReward', index: 0 }).error); // already taken
    const opt = (sc.run.screen as { rewards: { options: { id: string }[] }[] }).rewards[1].options[2];
    sc = step(sc, { type: 'takeReward', index: 1, cardIndex: 2 });
    assert.equal(sc.run.deck.length, 11);
    assert.equal(sc.run.deck[10].id, opt.id);
    assert.ok(act(sc.run, { type: 'skipReward', index: 0 }).error);
    sc = step(sc, { type: 'leaveRewards' });
    assert.equal(sc.run.screen.kind, 'map');
    let sk = fightAndWin(fresh(), 'fight');
    sk = step(sk, { type: 'skipReward', index: 1 });
    assert.equal(sk.run.deck.length, 10);
  });
  test('elite gives a relic and more gold; boss gives 90 gold + 3 rare cards, then a boss relic and the next act', () => {
    const el = fightAndWin(fresh(), 'elite');
    const rw = (el.run.screen as { rewards: { kind: string; amount?: number; id?: string }[] }).rewards;
    assert.ok(rw.some((r) => r.kind === 'relic'));
    assert.ok(rw[0].amount! >= 28 && rw[0].amount! <= 38);

    let run = fresh({ seed: 'BOSS' });
    run.hp = 20;
    let sc = goto(run, 'boss');
    assert.equal(cbt(sc.run).kind, 'boss');
    assert.equal(cbt(sc.run).encounterId.startsWith('a1_b'), true);
    assert.equal(cbt(sc.run).enemies[0].id, run.bosses[0]);
    cbt(sc.run).enemies[0].hp = 1;
    cbt(sc.run).hand.push({ uid: 900002, id: 'bonk', upgraded: false });
    sc = step(sc, { type: 'playCard', uid: 900002, target: 'e1' });
    const screen = sc.run.screen as { kind: 'reward'; rewards: { kind: string; amount?: number; options?: { id: string }[] }[] };
    assert.equal(screen.kind, 'reward');
    assert.equal(screen.rewards[0].amount, 90);
    assert.ok(screen.rewards[1].options!.every((o) => o.id.startsWith('t_rare')));
    assert.ok(!screen.rewards.some((r) => r.kind === 'potion'));
    const hpAfterFight = sc.run.hp;
    sc = step(sc, { type: 'leaveRewards' });
    assert.equal(sc.run.screen.kind, 'bossRelic');
    const opts = (sc.run.screen as { options: string[] }).options;
    assert.equal(opts.length, 3);
    assert.ok(opts.every((o) => ['t_boss1', 't_boss2', 't_boss3', 't_energy'].includes(o)));
    assert.ok(act(sc.run, { type: 'pickBossRelic', id: 'nope' }).error);
    sc = step(sc, { type: 'pickBossRelic', id: opts[0] });
    assert.ok(sc.run.relics.some((r) => r.id === opts[0]));
    assert.equal(sc.run.act, 2);
    assert.equal(sc.run.floor, 0);
    assert.equal(sc.run.screen.kind, 'map');
    assert.equal(sc.run.map.act, 2);
    assert.equal(sc.run.map.current, null);
    assert.equal(sc.run.map.bossId, sc.run.bosses[1]);
    assert.equal(sc.run.fightsThisAct, 0);
    assert.deepEqual(sc.run.seenEncounters, []);
    assert.equal(sc.run.hp, hpAfterFight + Math.floor((70 - hpAfterFight) * 0.75));
    assert.equal(Object.keys(sc.run.map.nodes).length > 20, true);
    // skipping the boss keepsake is allowed
    let s2 = goto(fresh({ seed: 'BOSS2' }), 'boss');
    cbt(s2.run).enemies[0].hp = 1;
    cbt(s2.run).hand.push({ uid: 900003, id: 'bonk', upgraded: false });
    s2 = step(s2, { type: 'playCard', uid: 900003, target: 'e1' });
    s2 = step(s2, { type: 'leaveRewards' });
    s2 = step(s2, { type: 'pickBossRelic', id: null });
    assert.equal(s2.run.act, 2);
    assert.equal(s2.run.relics.length, 1);
  });
  test('act 3 boss -> victory', () => {
    const run = fresh({ seed: 'V' });
    run.act = 3;
    run.map.act = 3;
    let sc = goto(run, 'boss');
    cbt(sc.run).enemies[0].hp = 1;
    cbt(sc.run).hand.push({ uid: 900004, id: 'bonk', upgraded: false });
    sc = step(sc, { type: 'playCard', uid: 900004, target: 'e1' });
    assert.equal(sc.run.screen.kind, 'victory');
    assert.equal(sc.events[sc.events.length - 1].t, 'victory');
    assert.equal(sc.run.stats.bossesKilled, 1);
    assert.ok(act(sc.run, { type: 'proceed' }).error);
  });
  test('blight 8 reduces gold by 25%', () => {
    const sc = fightAndWin(fresh({ ascension: 8 }), 'fight');
    const g = (sc.run.screen as { rewards: { amount: number }[] }).rewards[0].amount;
    assert.ok(g >= 9 && g <= 15);
  });
  test('encounter selection: easy for the first 3 normal fights, hard after, no repeats within an act', () => {
    let run = fresh({ seed: 'ENC' });
    const seen: string[] = [];
    for (let i = 0; i < 7; i++) {
      const sc = goto(run, 'fight');
      const id = cbt(sc.run).encounterId;
      seen.push(id);
      run = { ...sc.run };
      run.screen = { kind: 'map' };
      run.map.current = null;
    }
    assert.ok(seen.slice(0, 3).every((s) => s.includes('_e')), seen.join());
    assert.ok(seen.slice(3).every((s) => s.includes('_h')), seen.join());
    assert.equal(new Set(seen).size, seen.length);
    assert.equal(run.fightsThisAct, 7);
  });
});

describe('rest, treasure, shop', () => {
  test('rest: heal 30% (25% at blight 5, plus relic bonus), upgrade via cardSelect', () => {
    let sc = goto(fresh(), 'rest');
    sc.run.hp = 40;
    assert.equal(sc.run.screen.kind, 'rest');
    assert.deepEqual(restInfo(sc.run), { done: false, canHeal: true, healAmount: 21, healPercent: 30, canUpgrade: true });
    assert.equal(restInfo(fresh()), null);
    sc = step(sc, { type: 'rest', option: 'heal' });
    assert.equal(sc.run.hp, 61);
    assert.equal((sc.run.screen as { done: boolean }).done, true);
    assert.ok(act(sc.run, { type: 'rest', option: 'heal' }).error);
    sc = step(sc, { type: 'proceed' });
    assert.equal(sc.run.screen.kind, 'map');

    let s5 = goto(fresh({ ascension: 5 }), 'rest');
    s5.run.hp = 40;
    s5 = step(s5, { type: 'rest', option: 'heal' });
    assert.equal(s5.run.hp, 40 + 17);

    const bonus = fresh();
    bonus.relics.push({ id: 't_rest', counter: 0 });
    let sb = goto(bonus, 'rest');
    sb.run.hp = 10;
    sb = step(sb, { type: 'rest', option: 'heal' });
    assert.equal(sb.run.hp, 10 + 35);

    const nh = fresh();
    nh.relics.push({ id: 't_noheal', counter: 0 });
    assert.ok(act(goto(nh, 'rest').run, { type: 'rest', option: 'heal' }).error);

    let su = goto(fresh(), 'rest');
    su = step(su, { type: 'rest', option: 'upgrade' });
    assert.equal(su.run.screen.kind, 'cardSelect');
    const cs = su.run.screen as { candidates: number[]; canSkip: boolean; purpose: string };
    assert.equal(cs.purpose, 'upgrade');
    assert.equal(cs.candidates.length, 10);
    assert.ok(act(su.run, { type: 'choose', uids: [12345] }).error);
    assert.ok(act(su.run, { type: 'choose', uids: cs.candidates.slice(0, 2) }).error);
    const skip = step(su, { type: 'choose', uids: [] });
    assert.deepEqual(skip.run.screen, { kind: 'rest', done: false });
    su = step(su, { type: 'choose', uids: [cs.candidates[0]] });
    assert.equal(su.run.deck.find((c) => c.uid === cs.candidates[0])!.upgraded, true);
    assert.deepEqual(su.run.screen, { kind: 'rest', done: true });
  });
  test('treasure', () => {
    let sc = goto(fresh(), 'treasure');
    const s = sc.run.screen as { kind: 'treasure'; relicId: string; opened: boolean };
    assert.ok(s.relicId);
    assert.ok(act(sc.run, { type: 'proceed' }).error);
    sc = step(sc, { type: 'openTreasure' });
    assert.ok(sc.run.relics.some((r) => r.id === s.relicId));
    assert.ok(act(sc.run, { type: 'openTreasure' }).error);
    sc = step(sc, { type: 'proceed' });
    assert.equal(sc.run.screen.kind, 'map');
  });
  test('shop contents, prices, buying, removal price growth', () => {
    for (let i = 0; i < 30; i++) {
      const run = fresh({ seed: 'SH' + i });
      const shop = generateShop(run);
      assert.equal(shop.cards.length, 5);
      const rar = shop.cards.map((c) => (c.card.id.startsWith('t_common') ? 'c' : c.card.id.startsWith('t_uncommon') ? 'u' : 'r'));
      assert.deepEqual(rar, ['c', 'c', 'u', 'u', 'r']);
      const lows = shop.cards.filter((c, k) => c.price < [45, 45, 68, 68, 135][k]);
      assert.equal(lows.length, 1, 'exactly one card on sale');
      assert.equal(new Set(shop.cards.map((c) => c.card.id)).size, 5);
      assert.equal(shop.relics.length, 3);
      assert.equal(shop.relics[2].price, 150);
      for (const r of shop.relics.slice(0, 2)) assert.ok(r.price >= 140 && r.price <= 320);
      assert.equal(shop.potions.length, 3);
      for (const p of shop.potions) assert.ok(p.price >= 48 && p.price <= 75);
      assert.equal(shop.removePrice, 75);
      assert.equal(shop.removeUsed, false);
    }
    let sc = goto(fresh({ seed: 'SHOP' }), 'shop');
    assert.equal(sc.run.screen.kind, 'shop');
    const shop = (sc.run.screen as { shop: ReturnType<typeof generateShop> }).shop;
    sc.run.gold = 500;
    const price = shop.cards[0].price;
    sc = step(sc, { type: 'shopBuy', kind: 'card', index: 0 });
    assert.equal(sc.run.gold, 500 - price);
    assert.equal(sc.run.deck.length, 11);
    assert.ok(act(sc.run, { type: 'shopBuy', kind: 'card', index: 0 }).error);
    assert.ok(act(sc.run, { type: 'shopBuy', kind: 'card', index: 77 }).error);
    sc.run.gold = 1;
    assert.match(act(sc.run, { type: 'shopBuy', kind: 'card', index: 1 }).error ?? '', /Acorns/);
    assert.ok(act(sc.run, { type: 'shopRemove' }).error);
    sc.run.gold = 300;
    sc = step(sc, { type: 'shopBuy', kind: 'relic', index: 0 });
    assert.equal(sc.run.relics.length, 2);
    sc = step(sc, { type: 'shopBuy', kind: 'potion', index: 0 });
    assert.equal(sc.run.potions.filter(Boolean).length, 1);
    sc.run.gold = 400;
    sc = step(sc, { type: 'shopRemove' });
    assert.equal(sc.run.screen.kind, 'cardSelect');
    const target = (sc.run.screen as { candidates: number[] }).candidates[3];
    sc = step(sc, { type: 'choose', uids: [target] });
    assert.equal(sc.run.screen.kind, 'shop');
    assert.equal(sc.run.gold, 325);
    assert.ok(!sc.run.deck.some((c) => c.uid === target));
    assert.equal((sc.run.screen as { shop: { removeUsed: boolean } }).shop.removeUsed, true);
    assert.ok(act(sc.run, { type: 'shopRemove' }).error);
    sc = step(sc, { type: 'proceed' });
    assert.equal(sc.run.screen.kind, 'map');
    // second shop: removal costs 100
    const again = goto({ ...sc.run, screen: { kind: 'map' }, map: { ...sc.run.map, current: null } }, 'shop');
    assert.equal((again.run.screen as { shop: { removePrice: number } }).shop.removePrice, 100);
    // cancelling a removal costs nothing
    let c2 = goto(fresh({ seed: 'SHOP3' }), 'shop');
    c2.run.gold = 200;
    c2 = step(c2, { type: 'shopRemove' });
    c2 = step(c2, { type: 'choose', uids: [] });
    assert.equal(c2.run.gold, 200);
    assert.equal((c2.run.screen as { shop: { removeUsed: boolean } }).shop.removeUsed, false);
  });
  test('shop discount relic halves prices; brew slots limit', () => {
    const r = fresh({ seed: 'SHOP' });
    r.relics.push({ id: 't_rest', counter: 0 });
    const shop = generateShop(r);
    for (const c of shop.cards) assert.ok(c.price <= 82 / 2 + 1);
    let sc = goto(fresh({ seed: 'SHOP' }), 'shop');
    sc.run.gold = 999;
    sc.run.potions = ['t_heal', 't_heal', 't_heal'];
    assert.match(act(sc.run, { type: 'shopBuy', kind: 'potion', index: 0 }).error ?? '', /slot/i);
    sc = step(sc, { type: 'discardPotion', slot: 0 });
    sc = step(sc, { type: 'shopBuy', kind: 'potion', index: 0 });
  });
  test('relic pickup: onPickup, extra potion slots', () => {
    const run = fresh();
    let sc = goto(run, 'treasure');
    (sc.run.screen as { relicId: string }).relicId = 't_hp';
    sc = step(sc, { type: 'openTreasure' });
    assert.equal(sc.run.maxHp, 80);
    assert.equal(sc.run.hp, 80);
    let s2 = goto(run, 'treasure');
    (s2.run.screen as { relicId: string }).relicId = 't_energy';
    s2 = step(s2, { type: 'openTreasure' });
    assert.equal(s2.run.potions.length, 4);
  });
  test('potions out of combat', () => {
    let sc = { run: fresh(), events: [] as GameEvent[] };
    sc.run.hp = 50;
    sc.run.potions = ['t_heal', 't_poison', null];
    sc = step(sc, { type: 'usePotion', slot: 0 });
    assert.equal(sc.run.hp, 60);
    assert.equal(sc.run.potions[0], null);
    assert.ok(act(sc.run, { type: 'usePotion', slot: 1 }).error);
    assert.ok(act(sc.run, { type: 'usePotion', slot: 2 }).error);
    sc = step(sc, { type: 'discardPotion', slot: 1 });
    assert.deepEqual(sc.run.potions, [null, null, null]);
  });
});

describe('events', () => {
  const inEvent = () => {
    const r = fresh({ seed: 'EV' });
    r.screen = { kind: 'event', event: { id: 't_event', page: 'start', mem: {} } };
    r.map.current = '1-0';
    return { run: r, events: [] as GameEvent[] };
  };
  test('view, dynamic pages, disabled choices, leaving', () => {
    let sc = inEvent();
    const v = eventView(sc.run)!;
    assert.equal(v.name, 'Test Event');
    assert.equal(v.choices.length, 9);
    assert.equal(v.choices[2].disabled, 'Need 1000');
    assert.equal(v.choices[0].disabled, null);
    assert.equal(act(sc.run, { type: 'eventChoice', index: 2 }).error, 'Need 1000');
    assert.ok(act(sc.run, { type: 'eventChoice', index: 99 }).error);
    sc = step(sc, { type: 'eventChoice', index: 0 });
    assert.equal(sc.run.gold, 109);
    assert.equal(eventView(sc.run)!.text, 'After');
    sc = step(sc, { type: 'eventChoice', index: 0 });
    assert.equal(sc.run.screen.kind, 'map');
    assert.equal(eventView(sc.run), null);
  });
  test('damage, lethal damage -> defeat, throwing pick leaves the event', () => {
    let sc = step(inEvent(), { type: 'eventChoice', index: 1 });
    assert.equal(sc.run.hp, 65);
    assert.equal(sc.run.screen.kind, 'map');
    sc = step(inEvent(), { type: 'eventChoice', index: 7 });
    assert.equal(sc.run.screen.kind, 'defeat');
    sc = step(inEvent(), { type: 'eventChoice', index: 8 });
    assert.equal(sc.run.screen.kind, 'map');
  });
  test('selectCards (remove) returns to the page set by the event; eventCustom uses onCardSelect', () => {
    let sc = step(inEvent(), { type: 'eventChoice', index: 3 });
    assert.equal(sc.run.screen.kind, 'cardSelect');
    const cs = sc.run.screen as { candidates: number[]; purpose: string; canSkip: boolean };
    assert.equal(cs.purpose, 'remove');
    assert.equal(cs.canSkip, false);
    assert.ok(act(sc.run, { type: 'choose', uids: [] }).error);
    sc = step(sc, { type: 'choose', uids: [cs.candidates[0]] });
    assert.equal(sc.run.deck.length, 9);
    assert.equal(eventView(sc.run)!.text, 'Removed');

    let c = step(inEvent(), { type: 'eventChoice', index: 4 });
    const cc = c.run.screen as { candidates: number[]; eventId: string; purpose: string };
    assert.equal(cc.purpose, 'eventCustom');
    assert.equal(cc.eventId, 't_event');
    c = step(c, { type: 'choose', uids: [cc.candidates[2]] });
    assert.equal(c.run.deck.length, 9);
    assert.equal(eventView(c.run)!.text, 'Custom done');
    let c2 = step(inEvent(), { type: 'eventChoice', index: 4 });
    c2 = step(c2, { type: 'choose', uids: [] });
    assert.equal(c2.run.screen.kind, 'map');
  });
  test('startFight and giveRewards', () => {
    let sc = step(inEvent(), { type: 'eventChoice', index: 5 });
    assert.equal(sc.run.screen.kind, 'combat');
    assert.equal(cbt(sc.run).kind, 'elite');
    assert.equal(cbt(sc.run).encounterId, 'a1_e');
    cbt(sc.run).enemies[0].hp = 1;
    cbt(sc.run).hand.push({ uid: 900010, id: 'bonk', upgraded: false });
    sc = step(sc, { type: 'playCard', uid: 900010, target: 'e1' });
    assert.equal(sc.run.screen.kind, 'reward');
    assert.ok((sc.run.screen as { rewards: { kind: string }[] }).rewards.some((r) => r.kind === 'relic'));
    sc = step(sc, { type: 'leaveRewards' });
    assert.equal(sc.run.screen.kind, 'map');

    let r = step(inEvent(), { type: 'eventChoice', index: 6 });
    assert.equal(r.run.screen.kind, 'reward');
    r = step(r, { type: 'takeReward', index: 0 });
    assert.equal(r.run.gold, 106);
    r = step(r, { type: 'leaveRewards' });
    assert.equal(r.run.screen.kind, 'map');
  });
  test('node type event picks unseen events for the act and records them', () => {
    const sc = goto(fresh({ seed: 'EVN' }), 'event');
    assert.equal(sc.run.screen.kind, 'event');
    assert.deepEqual(sc.run.seenEvents, ['t_event']);
    // all events seen: falls back to a fight
    const r = fresh({ seed: 'EVN' });
    r.seenEvents.push('t_event');
    assert.equal(goto(r, 'event').run.screen.kind, 'combat');
  });
});

describe('determinism, invalid actions, save/load', () => {
  function playthrough(seed: string, steps: number) {
    const rnd = mkRng('bot' + seed);
    let run = fresh({ seed });
    run.hp = run.maxHp = 3000;
    const log: GameEvent[][] = [];
    const actions: Action[] = [];
    for (let i = 0; i < steps; i++) {
      const a = randomAction(run, rnd);
      if (!a) break;
      const r = act(run, a);
      if (r.error) continue;
      actions.push(a);
      log.push(r.events);
      run = r.run;
    }
    return { run, log, actions };
  }
  test('same seed + same actions = same run and same events', () => {
    const a = playthrough('DET', 600);
    const b = playthrough('DET', 600);
    assert.ok(a.actions.length > 100);
    assert.deepEqual(a.actions, b.actions);
    assert.equal(JSON.stringify(a.run), JSON.stringify(b.run));
    assert.equal(JSON.stringify(a.log), JSON.stringify(b.log));
    // replaying the recorded actions reproduces the run
    let run = fresh({ seed: 'DET' });
    run.hp = run.maxHp = 3000;
    for (const act1 of a.actions) run = step({ run, events: [] }, act1).run;
    assert.equal(JSON.stringify(run), JSON.stringify(a.run));
    const c = playthrough('DET2', 600);
    assert.notEqual(JSON.stringify(c.run), JSON.stringify(a.run));
  });
  test('act() never mutates its input', () => {
    const rnd = mkRng('mut');
    let run = fresh({ seed: 'MUT' });
    run.hp = run.maxHp = 3000;
    for (let i = 0; i < 300; i++) {
      const a = randomAction(run, rnd);
      if (!a) break;
      const snap = JSON.stringify(run);
      const r = act(run, a);
      assert.equal(JSON.stringify(run), snap, 'input mutated by ' + JSON.stringify(a));
      if (!r.error) run = r.run;
    }
  });
  test('invalid actions: error, same run object back, no throw, on every screen', () => {
    const bogus: Action[] = [
      { type: 'playCard', uid: -5 },
      { type: 'endTurn' },
      { type: 'selectNode', nodeId: 'zzz' },
      { type: 'takeReward', index: 3 },
      { type: 'skipReward', index: 0 },
      { type: 'leaveRewards' },
      { type: 'rest', option: 'heal' },
      { type: 'shopBuy', kind: 'card', index: 0 },
      { type: 'shopRemove' },
      { type: 'eventChoice', index: 0 },
      { type: 'openTreasure' },
      { type: 'pickBossRelic', id: 'x' },
      { type: 'usePotion', slot: 0 },
      { type: 'usePotion', slot: 99 },
      { type: 'discardPotion', slot: 2 },
      { type: 'choose', uids: [1] },
      { type: 'proceed' },
      { type: 'bogus' } as unknown as Action,
    ];
    const screens: RunState[] = [];
    const base = fresh();
    screens.push(base);
    screens.push(goto(base, 'fight').run);
    screens.push(goto(base, 'rest').run);
    screens.push(goto(base, 'shop').run);
    screens.push(goto(base, 'treasure').run);
    screens.push(goto(base, 'event').run);
    const dead = structuredClone(base);
    dead.screen = { kind: 'defeat', cause: 'x' };
    screens.push(dead);
    for (const run of screens) {
      for (const a of bogus) {
        const snap = JSON.stringify(run);
        const r = act(run, a);
        assert.equal(JSON.stringify(run), snap);
        if (r.error) {
          assert.equal(r.run, run, `${run.screen.kind} ${JSON.stringify(a)}`);
          assert.deepEqual(r.events, []);
        }
      }
    }
  });
  test('serialize / deserialize roundtrip, including mid-combat, and the game continues identically', () => {
    const rnd = mkRng('save');
    let run = fresh({ seed: 'SAVE' });
    run.hp = run.maxHp = 3000;
    let combatRun: RunState | null = null;
    for (let i = 0; i < 400; i++) {
      const a = randomAction(run, rnd);
      if (!a) break;
      const r = act(run, a);
      if (!r.error) run = r.run;
      const back = deserialize(serialize(run));
      assert.ok(back, 'roundtrip failed on ' + run.screen.kind);
      assert.deepEqual(back, run);
      if (run.screen.kind === 'combat' && run.screen.combat.turn > 1) combatRun = run;
    }
    assert.ok(combatRun);
    const restored = deserialize(serialize(combatRun!))!;
    const r1 = mkRng('cont');
    const r2 = mkRng('cont');
    let x = combatRun!;
    let y = restored;
    for (let i = 0; i < 40; i++) {
      const a1 = randomAction(x, r1);
      const a2 = randomAction(y, r2);
      assert.deepEqual(a1, a2);
      if (!a1) break;
      const rx = act(x, a1);
      const ry = act(y, a2!);
      assert.equal(JSON.stringify(rx.run), JSON.stringify(ry.run));
      x = rx.run;
      y = ry.run;
    }
  });
  test('deserialize rejects garbage, wrong versions and broken shapes', () => {
    const good = JSON.parse(serialize(fresh()));
    assert.ok(deserialize(JSON.stringify(good)));
    assert.equal(deserialize('not json'), null);
    assert.equal(deserialize('null'), null);
    assert.equal(deserialize('[]'), null);
    assert.equal(deserialize('{}'), null);
    for (const mut of [
      (o: any) => { o.version = 2; },
      (o: any) => { delete o.deck; },
      (o: any) => { o.hp = 'lots'; },
      (o: any) => { o.rng.map = 'x'; },
      (o: any) => { o.screen = { kind: 'weird' }; },
      (o: any) => { o.screen = { kind: 'combat', combat: {} }; },
      (o: any) => { o.map.nodes[Object.keys(o.map.nodes)[0]].next = 5; },
      (o: any) => { o.act = 7; },
      (o: any) => { o.bosses = ['a']; },
      (o: any) => { o.deck[0] = { id: 3 }; },
      (o: any) => { o.potions = [1]; },
    ]) {
      const o = structuredClone(good);
      mut(o);
      assert.equal(deserialize(JSON.stringify(o)), null, mut.toString());
    }
  });
});

describe('full runs (fixtures)', () => {
  test('random bot with lots of HP reaches victory through 3 acts and every screen kind', () => {
    const kinds = new Set<string>();
    let victories = 0;
    for (let s = 0; s < 6; s++) {
      const rnd = mkRng('full' + s);
      let run = fresh({ seed: 'FULL' + s, ascension: s * 2 });
      run.hp = run.maxHp = 4000;
      let acts = new Set<number>([1]);
      const normalIds: Record<number, string[]> = { 1: [], 2: [], 3: [] };
      let lastEnc = '';
      for (let i = 0; i < 6000; i++) {
        const a = randomAction(run, rnd);
        if (!a) break;
        const r = act(run, a);
        if (r.error) {
          // the bot may attempt things the engine rightly rejects (e.g. no free potion slot); keep going
          continue;
        }
        run = r.run;
        kinds.add(run.screen.kind);
        acts.add(run.act);
        assert.ok(run.hp <= run.maxHp && run.hp >= 0);
        assert.ok(run.gold >= 0);
        assert.equal(new Set(run.deck.map((c) => c.uid)).size, run.deck.length);
        if (run.screen.kind === 'combat') {
          const c = run.screen.combat;
          if (c.kind === 'normal' && c.encounterId !== lastEnc && c.turn === 1) normalIds[run.act].push(c.encounterId);
          lastEnc = c.encounterId;
        }
      }
      if (run.screen.kind === 'victory') victories++;
      assert.equal(run.screen.kind, 'victory', `seed ${s} ended on ${run.screen.kind} ${JSON.stringify(run.screen)} act ${run.act} floor ${run.floor} hp ${run.hp}`);
      assert.deepEqual([...acts].sort(), [1, 2, 3]);
      for (const act1 of [1, 2, 3]) {
        const ids = normalIds[act1];
        assert.equal(new Set(ids).size, ids.length, 'no repeat in act ' + act1);
        ids.forEach((id, i) => assert.ok(i < 3 ? id.includes('_e') : id.includes('_h'), `act ${act1} fight ${i} = ${id}`));
      }
      assert.ok(run.stats.floorsClimbed >= 30);
    }
    assert.equal(victories, 6);
    for (const k of ['map', 'combat', 'reward', 'rest', 'shop', 'event', 'treasure', 'bossRelic', 'cardSelect', 'victory']) assert.ok(kinds.has(k), 'never saw screen ' + k);
  });
});
