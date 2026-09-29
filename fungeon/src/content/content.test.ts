// Content-integrity tests over the REAL registry + engine (never installs the fixture content).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  act, newRun, engineLog, cardView, eventView,
  allCards, allRelics, allPotions, allStatuses, allEnemies, allEncounters, allEvents,
  ART_KEYS, PLAYER,
} from '../engine';
import type { RunState, Action, CardInstance, EventPage } from '../engine';
import { findEnemy, findEvent } from '../engine/registry';
import { randomAction } from '../engine/autoplay';
import { hashString } from '../engine/rng';
import { setup, cbt } from '../engine/testutil';
import { resolvePage, startPageId } from '../engine/events';
import { CREATURES } from '../art/creatures';

engineLog.quiet = true;
const artSet = new Set<string>(ART_KEYS);
const BAD = /\{|\}|undefined|NaN|\[object/;

const mkRng = (seed: string) => {
  let s = hashString(seed);
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
function noLogErrors(what: string) {
  const errs = engineLog.errors.splice(0);
  assert.deepEqual(errs, [], `${what}: engineLog errors`);
}
const step = (run: RunState, a: Action) => {
  const r = act(run, a);
  return { run: r.run, error: r.error, events: r.events };
};

// ---------------------------------------------------------------------------------------------------------------
test('art keys: cards, relics, potions, statuses, events are valid ART_KEYS', () => {
  for (const c of allCards()) assert.ok(artSet.has(c.art), `card ${c.id} art "${c.art}"`);
  for (const r of allRelics()) assert.ok(artSet.has(r.icon), `relic ${r.id} icon "${r.icon}"`);
  for (const p of allPotions()) assert.ok(artSet.has(p.icon), `potion ${p.id} icon "${p.icon}"`);
  for (const s of allStatuses()) assert.ok(artSet.has(s.icon), `status ${s.id} icon "${s.icon}"`);
  for (const e of allEvents()) assert.ok(artSet.has(e.art), `event ${e.id} art "${e.art}"`);
});

test('every enemy has dedicated creature art (no generic fallback)', () => {
  for (const e of allEnemies()) {
    assert.ok(CREATURES[e.art], `enemy ${e.id}: no creature art for key "${e.art}"`);
  }
});

test('DESIGN roster ids all exist', () => {
  const ids = ['slug', 'gnat', 'bark_beetle', 'snail', 'worker_ant', 'toadlet', 'stag_beetle', 'mole', 'soldier_ant', 'gloopius', 'toad_king',
    'moth', 'cave_cricket', 'slime_mold', 'glow_worm', 'bat', 'centipede', 'spider', 'crystal_crab', 'echo_bat', 'mothmother', 'slime_colossus',
    'mold_puff', 'rot_rat', 'blighted_sprout', 'carrion_fly', 'zombie_snail', 'cultist_cap', 'cordyceps_knight', 'morel', 'mold_hydra',
    'amanita_queen', 'blight_heart', 'slimelet', 'mothling', 'sporeling', 'hydra_head', 'mold_bud'];
  for (const id of ids) assert.ok(findEnemy(id), `missing enemy ${id}`);
});

test('enemy definitions are well-formed', () => {
  for (const e of allEnemies()) {
    assert.ok(e.hp[0] > 0 && e.hp[1] >= e.hp[0], `${e.id} hp`);
    assert.ok(Object.keys(e.moves).length > 0, `${e.id} has moves`);
    for (const [mid, m] of Object.entries(e.moves)) {
      assert.ok(m.name && m.intents.length > 0, `${e.id}.${mid} name/intents`);
      if (m.intents.includes('attack')) assert.ok((m.dmg ?? 0) > 0, `${e.id}.${mid} attack intent needs dmg`);
    }
  }
});

test('encounters reference real enemies; each act has easy/hard/elite/boss pools', () => {
  const byActPool: Record<string, number> = {};
  for (const enc of allEncounters()) {
    assert.ok(enc.enemies.length >= 1 && enc.enemies.length <= 5, `${enc.id} size`);
    for (const id of enc.enemies) {
      const d = findEnemy(id);
      assert.ok(d, `${enc.id} -> unknown enemy ${id}`);
      assert.equal(d!.act, enc.act, `${enc.id}: enemy ${id} is from another act`);
    }
    const k = `${enc.act}/${enc.pool}`;
    byActPool[k] = (byActPool[k] ?? 0) + 1;
  }
  for (const a of [1, 2, 3]) {
    assert.ok((byActPool[`${a}/easy`] ?? 0) >= 3, `act ${a} easy pool`);
    assert.ok((byActPool[`${a}/hard`] ?? 0) >= 5, `act ${a} hard pool`);
    assert.ok((byActPool[`${a}/elite`] ?? 0) >= 3, `act ${a} elite pool`);
    assert.ok((byActPool[`${a}/boss`] ?? 0) >= 2, `act ${a} boss pool`);
  }
});

// ---------------------------------------------------------------------------------------------------------------
test('card text placeholders all resolve to vals', () => {
  for (const c of allCards()) {
    const check = (text: string, vals: Record<string, number>, label: string) => {
      for (const m of text.matchAll(/\{(\w+)\}/g)) {
        const key = m[1];
        assert.ok(key in vals || (key === 'x' && c.cost === 'X'), `${c.id} ${label}: {${key}} has no value`);
      }
    };
    const up = { ...c.vals, ...(c.up ?? {}) };
    check(c.text, c.vals, 'text');
    check(c.text, up, 'text(up)');
    if (c.upText) check(c.upText, up, 'upText');
  }
});

test('cardView / upgradedView render cleanly', () => {
  for (const c of allCards()) {
    for (const upgraded of [false, true]) {
      const inst: CardInstance = { uid: 1, id: c.id, upgraded };
      const v = cardView(inst);
      assert.ok(!BAD.test(v.text), `${c.id}${upgraded ? '+' : ''}: bad text "${v.text}"`);
      assert.ok(v.name && !BAD.test(v.name), `${c.id} name`);
    }
  }
});

test('status descriptions render', () => {
  for (const s of allStatuses()) for (const n of [1, 3, 10]) assert.ok(!BAD.test(s.desc(n)), `${s.id} desc(${n}): ${s.desc(n)}`);
});

// ---------------------------------------------------------------------------------------------------------------
/** A fight with one real enemy vs an unkillable player. */
function fight(enemies: string[], kind: 'normal' | 'elite' | 'boss' = 'normal') {
  const sc = setup({ enemies, kind, hand: [], draw: Array(30).fill('cap_up'), discard: [] });
  const c = cbt(sc.run);
  c.player.hp = c.player.maxHp = 1_000_000;
  sc.run.hp = sc.run.maxHp = 1_000_000;
  return sc.run;
}

test('enemy moves deal exactly dmg*hits attack damage (and non-attack moves deal none)', () => {
  for (const def of allEnemies()) {
    for (const [mid, m] of Object.entries(def.moves)) {
      engineLog.errors.length = 0;
      let run = fight([def.id]);
      const c = cbt(run);
      const e = c.enemies[0];
      e.intent = mid;
      const r = step(run, { type: 'endTurn' });
      assert.equal(r.error, undefined, `${def.id}.${mid}: ${r.error}`);
      run = r.run;
      const hits = r.events.filter((ev) => ev.t === 'damage' && ev.target === PLAYER && ev.kind === 'attack' && ev.source === e.uid);
      const total = hits.reduce((s, ev) => s + (ev.t === 'damage' ? ev.amount + ev.blocked : 0), 0);
      const expected = (m.dmg ?? 0) * (m.hits ?? (m.dmg ? 1 : 0));
      // Might on the enemy at spawn is 0, so damage is exact. (Enemy-side Might gains happen after the attack.)
      assert.equal(total, expected, `${def.id}.${mid}: dealt ${total}, declared ${expected}`);
      if (m.dmg) assert.equal(hits.length, m.hits ?? 1, `${def.id}.${mid}: hit count`);
      noLogErrors(`${def.id}.${mid}`);
    }
  }
});

test('enemy AI always returns a valid move for 30 turns (alone and in encounters)', () => {
  const runScenario = (ids: string[], label: string, prep?: (run: RunState) => void) => {
    engineLog.errors.length = 0;
    let run = fight(ids);
    prep?.(run);
    for (let t = 0; t < 30; t++) {
      const c = cbt(run);
      for (const e of c.enemies.filter((x) => x.alive)) {
        const def = findEnemy(e.id)!;
        assert.ok(e.intent && def.moves[e.intent], `${label} turn ${t}: ${e.id} has invalid intent "${e.intent}"`);
      }
      const r = step(run, { type: 'endTurn' });
      assert.equal(r.error, undefined, `${label}: ${r.error}`);
      run = r.run;
      if (run.screen.kind !== 'combat') break;
    }
    noLogErrors(label);
  };
  for (const def of allEnemies()) runScenario([def.id], def.id);
  for (const enc of allEncounters()) runScenario(enc.enemies, enc.id);
});

test('boss / elite phase triggers do not error (drop each enemy to <50% HP then run 15 turns)', () => {
  for (const def of allEnemies()) {
    if (!def.hooks?.onHpLoss) continue;
    engineLog.errors.length = 0;
    let sc = setup({ enemies: [def.id], hand: Array(10).fill('bonk'), draw: Array(30).fill('bonk'), discard: [], energy: 99 });
    let run = sc.run;
    cbt(run).player.hp = cbt(run).player.maxHp = 1_000_000;
    run.hp = run.maxHp = 1_000_000;
    const e0 = cbt(run).enemies[0];
    e0.hp = Math.floor(e0.maxHp * 0.55);
    let guard = 0;
    while (run.screen.kind === 'combat' && cbt(run).enemies[0].alive && cbt(run).enemies[0].hp > cbt(run).enemies[0].maxHp * 0.4 && guard++ < 40) {
      const c = cbt(run);
      const card = c.hand[0];
      if (!card) { run = step(run, { type: 'endTurn' }).run; continue; }
      const r = step(run, { type: 'playCard', uid: card.uid, target: c.enemies[0].uid });
      if (r.error) { run = step(run, { type: 'endTurn' }).run; continue; }
      run = r.run;
    }
    for (let t = 0; t < 15 && run.screen.kind === 'combat'; t++) {
      const c = cbt(run);
      for (const e of c.enemies.filter((x) => x.alive)) assert.ok(e.intent && findEnemy(e.id)!.moves[e.intent], `${def.id} p2: bad intent ${e.id}:${e.intent}`);
      run = step(run, { type: 'endTurn' }).run;
    }
    noLogErrors(`phase ${def.id}`);
  }
});

test('splitters / revivers spawn what they promise', () => {
  // slime_mold -> 2 slimelets on death
  let run = fight(['slime_mold']);
  cbt(run).enemies[0].hp = 1;
  cbt(run).hand = [{ uid: 900001, id: 'bonk', upgraded: false }];
  cbt(run).player.energy = 3;
  let r = step(run, { type: 'playCard', uid: 900001, target: cbt(run).enemies[0].uid });
  assert.equal(cbt(r.run).enemies.filter((e) => e.alive && e.id === 'slimelet').length, 2, 'slime_mold split');
  // zombie_snail revives once
  run = fight(['zombie_snail']);
  cbt(run).enemies[0].hp = 1;
  cbt(run).enemies[0].block = 0;
  cbt(run).hand = [{ uid: 900002, id: 'bonk', upgraded: false }];
  r = step(run, { type: 'playCard', uid: 900002, target: cbt(run).enemies[0].uid });
  assert.equal(r.run.screen.kind, 'combat', 'fight must continue after the revive');
  assert.equal(cbt(r.run).enemies.filter((e) => e.alive && e.id === 'zombie_snail').length, 1, 'zombie revived');
  noLogErrors('split/revive');
});

// ---------------------------------------------------------------------------------------------------------------
function playOneCard(id: string, upgraded: boolean) {
  const sc = setup({ enemies: ['bark_beetle', 'bark_beetle'], hand: [id, 'bonk', 'cap_up', 'bonk'], draw: Array(20).fill('bonk'), discard: ['cap_up', 'bonk', 'cap_up'], energy: 10 });
  let run = sc.run;
  const c = cbt(run);
  c.player.nutrients = 10;
  c.player.hp = c.player.maxHp = 500;
  run.hp = run.maxHp = 500;
  const inst = c.hand[0];
  inst.upgraded = upgraded;
  const def = allCards().find((d) => d.id === id)!;
  const targetUid = c.enemies[0].uid;
  const r = step(run, { type: 'playCard', uid: inst.uid, target: def.target === 'enemy' ? targetUid : undefined });
  run = r.run;
  // resolve pending choices greedily
  for (let i = 0; i < 5 && run.screen.kind === 'combat' && cbt(run).pending; i++) {
    const p = cbt(run).pending!;
    run = step(run, { type: 'choose', uids: p.candidates.slice(0, p.max) }).run;
  }
  return { run, error: r.error, def };
}

test('every card can be played (base and upgraded) without engine errors', () => {
  for (const def of allCards()) {
    const unplayable = def.cost === -1 || def.keywords?.includes('unplayable');
    for (const upgraded of [false, true]) {
      engineLog.errors.length = 0;
      const { run, error } = playOneCard(def.id, upgraded);
      const label = `${def.id}${upgraded ? '+' : ''}`;
      if (unplayable) { assert.ok(error, `${label} should be rejected as unplayable`); }
      else if (error) assert.ok(def.canPlay, `${label}: play rejected: ${error}`);
      if (run.screen.kind === 'combat' && !error) {
        // end the turn to run end-of-turn hooks, then next turn start
        const r = step(run, { type: 'endTurn' });
        assert.equal(r.error, undefined, `${label} endTurn: ${r.error}`);
      }
      noLogErrors(label);
    }
  }
});

test('unplayable status cards run their end-of-turn hooks cleanly', () => {
  for (const id of ['mold', 'burr', 'mildew', 'doubt', 'slime']) {
    engineLog.errors.length = 0;
    const sc = setup({ enemies: ['slug'], hand: [id], draw: Array(20).fill('bonk') });
    const r = step(sc.run, { type: 'endTurn' });
    assert.equal(r.error, undefined, id);
    noLogErrors(id);
  }
});

test('every relic can be acquired and triggers in combat without errors', () => {
  for (const def of allRelics()) {
    engineLog.errors.length = 0;
    const run0 = newRun({ seed: 'relic-' + def.id, now: 0 });
    run0.relics.push({ id: def.id, counter: 0 });
    if (def.onPickup) def.onPickup(run0);
    // play with the real starter deck and this relic for a few turns, with a couple of brews on hand
    const sc = setup({ seed: 'relic-' + def.id, enemies: ['bark_beetle', 'gnat'], relics: [def.id], natural: true });
    let run = sc.run;
    const rnd = mkRng('r' + def.id);
    for (let i = 0; i < 120 && run.screen.kind === 'combat'; i++) {
      const a = randomAction(run, rnd);
      if (!a) break;
      const r = step(run, a);
      if (!r.error) run = r.run;
    }
    noLogErrors(`relic ${def.id}`);
  }
});

test('every potion can be used in combat without errors', () => {
  for (const def of allPotions()) {
    engineLog.errors.length = 0;
    const sc = setup({ enemies: ['bark_beetle', 'gnat'], hand: ['bonk', 'cap_up', 'spore_puff', 'seedling'], draw: Array(20).fill('bonk'), discard: ['cap_up', 'bonk'] });
    const run = sc.run;
    run.potions[0] = def.id;
    cbt(run).player.hp = 30;
    run.hp = 30;
    const tgt = cbt(run).enemies[0].uid;
    let r = step(run, { type: 'usePotion', slot: 0, target: def.target === 'enemy' ? tgt : undefined });
    assert.equal(r.error, undefined, `potion ${def.id}: ${r.error}`);
    let cur = r.run;
    for (let i = 0; i < 3 && cur.screen.kind === 'combat' && cbt(cur).pending; i++) {
      const p = cbt(cur).pending!;
      cur = step(cur, { type: 'choose', uids: p.candidates.slice(0, p.max) }).run;
    }
    if (cur.screen.kind === 'combat') cur = step(cur, { type: 'endTurn' }).run;
    noLogErrors(`potion ${def.id}`);
  }
});

// ---------------------------------------------------------------------------------------------------------------
function eventRun(id: string, actNo: 1 | 2 | 3, rich: boolean, variant = 0): RunState {
  const run = newRun({ seed: `ev-${id}-${actNo}-${rich}-${variant}`, now: 0 });
  run.act = actNo;
  run.floor = 3;
  run.gold = rich ? 500 : 0;
  run.hp = rich ? run.maxHp : 3;
  if (rich) run.potions[0] = allPotions()[0]?.id ?? null;
  const def = findEvent(id)!;
  run.screen = { kind: 'event', event: { id, page: startPageId(def), mem: {} } };
  return run;
}

/** After a choice, settle any transient screen the event opened so we can continue / finish. */
function settle(run: RunState): RunState {
  for (let i = 0; i < 6; i++) {
    const s = run.screen;
    if (s.kind === 'cardSelect') {
      const uids = s.candidates.slice(0, s.count);
      const r = step(run, { type: 'choose', uids });
      assert.equal(r.error, undefined, `cardSelect(${s.purpose}) resolve: ${r.error}`);
      run = r.run;
    } else if (s.kind === 'reward') {
      const idx = s.rewards.findIndex((x) => !x.taken);
      if (idx >= 0) {
        const rw = s.rewards[idx];
        const r = step(run, rw.kind === 'card' ? { type: 'takeReward', index: idx, cardIndex: 0 } : { type: 'takeReward', index: idx });
        run = r.run;
      }
      run = step(run, { type: 'leaveRewards' }).run;
    } else break;
  }
  return run;
}

test('every event page is reachable and every choice can be picked (rich and poor runs, acts 1-3)', () => {
  for (const def of allEvents()) {
    for (const actNo of def.acts) {
      for (const rich of [true, false]) {
        const seenPages = new Set<string>();
        const label = `${def.id} act${actNo} ${rich ? 'rich' : 'poor'}`;
        // DFS over (page path)
        let variant = 0;
        const explore = (path: number[]) => {
          let run = eventRun(def.id, actNo, rich, variant);
          for (const idx of path) {
            const r = step(run, { type: 'eventChoice', index: idx });
            assert.equal(r.error, undefined, `${label} path ${path}: ${r.error}`);
            run = settle(r.run);
          }
          if (run.screen.kind !== 'event') return;
          const ev = run.screen.event;
          seenPages.add(ev.page);
          const pg = resolvePage(def, run, ev) as EventPage | undefined;
          assert.ok(pg, `${label}: page ${ev.page} missing`);
          assert.ok(pg!.text.length > 10 && !BAD.test(pg!.text), `${label}: page ${ev.page} text`);
          const view = eventView(run)!;
          assert.equal(view.choices.length, pg!.choices.length);
          assert.ok(pg!.choices.length >= 1, `${label}: page ${ev.page} has no choices`);
          pg!.choices.forEach((ch, i) => {
            assert.ok(ch.label.length <= 60, `${label}: label too long (${ch.label.length}): ${ch.label}`);
            assert.ok(!BAD.test(ch.label), `${label}: label "${ch.label}"`);
            engineLog.errors.length = 0;
            const r = step(run, { type: 'eventChoice', index: i });
            if (view.choices[i].disabled) {
              assert.ok(r.error, `${label}: disabled choice "${ch.label}" was accepted`);
              return;
            }
            assert.equal(r.error, undefined, `${label}: choice "${ch.label}" rejected: ${r.error}`);
            noLogErrors(`${label} "${ch.label}"`);
            const after = settle(r.run);
            noLogErrors(`${label} "${ch.label}" settle`);
            if (after.screen.kind === 'event' && !seenPages.has(after.screen.event.page) && path.length < 5) explore([...path, i]);
            else if (after.screen.kind === 'event') seenPages.add(after.screen.event.page);
          });
        };
        // random branches: explore under several seeds and union the reached pages
        for (variant = 0; variant < (rich ? 12 : 2); variant++) explore([]);
        if (rich) {
          for (const pid of Object.keys(def.pages)) assert.ok(seenPages.has(pid), `${label}: page "${pid}" unreachable`);
        }
      }
    }
  }
});

test('events referencing relics / cards use real ids', () => {
  const run = newRun({ seed: 'ids', now: 0 });
  void run;
  const relicIds = new Set(allRelics().map((r) => r.id));
  for (const id of ['old_map', 'golden_spore', 'lucky_acorn']) assert.ok(relicIds.has(id), `relic ${id} missing`);
  const cardIds = new Set(allCards().map((c) => c.id));
  for (const id of ['mildew', 'doubt', 'mold', 'slime', 'burr', 'spore', 'bonk', 'cap_up', 'spore_puff', 'seedling']) assert.ok(cardIds.has(id), `card ${id} missing`);
});
