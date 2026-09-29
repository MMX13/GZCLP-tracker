import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { act } from './index';
import { PLAYER } from './types';
import type { GameEvent } from './types';
import { installFixtures, setup, cbt, step, play, endTurn, enemyOf, inst } from './testutil';
import { engineLog } from './combat';

before(() => installFixtures());

const ev = <T extends GameEvent['t']>(events: GameEvent[], t: T) => events.filter((e) => e.t === t) as Extract<GameEvent, { t: T }>[];

describe('damage & block math', () => {
  test('plain attack', () => {
    let sc = setup({ hand: ['bonk'] });
    sc = play(sc, 'bonk');
    assert.equal(enemyOf(sc.run).hp, 24);
    const d = ev(sc.events, 'damage')[0];
    assert.deepEqual({ ...d }, { t: 'damage', target: 'e1', source: PLAYER, amount: 6, blocked: 0, hpAfter: 24, blockAfter: 0, kind: 'attack' });
    assert.equal(cbt(sc.run).player.energy, 2);
  });
  test('Might, Wilted, Soggy combos are floored once', () => {
    const cases: [Record<string, number>, Record<string, number>, number][] = [
      [{ might: 3 }, {}, 9],
      [{ wilted: 1 }, {}, 4],
      [{}, { soggy: 1 }, 9],
      [{ might: 2 }, { soggy: 1 }, 12],
      [{ wilted: 1 }, { soggy: 1 }, 6],
      [{ might: 1, wilted: 2 }, { soggy: 2 }, 7], // (7*.75*1.5)=7.875
    ];
    for (const [pl, en, dmg] of cases) {
      const sc = setup({ hand: ['bonk'] });
      Object.assign(cbt(sc.run).player.statuses, pl);
      Object.assign(enemyOf(sc.run).statuses, en);
      const r = play(sc, 'bonk');
      assert.equal(30 - enemyOf(r.run).hp, dmg, JSON.stringify([pl, en]));
    }
  });
  test('block absorbs attack damage, remainder hurts', () => {
    let sc = setup({ hand: ['bonk'] });
    enemyOf(sc.run).block = 4;
    sc = play(sc, 'bonk');
    const d = ev(sc.events, 'damage')[0];
    assert.equal(d.amount, 2);
    assert.equal(d.blocked, 4);
    assert.equal(d.blockAfter, 0);
    assert.equal(enemyOf(sc.run).hp, 28);
  });
  test('relic modifyAttack applies after Might, before Wilted/Soggy', () => {
    const sc = setup({ hand: ['bonk'], relics: ['t_dmg'] });
    enemyOf(sc.run).statuses.soggy = 1;
    cbt(sc.run).player.statuses.might = 2;
    const r = play(sc, 'bonk');
    assert.equal(30 - enemyOf(r.run).hp, Math.floor((6 + 2 + 2) * 1.5));
  });
  test('block: Sturdy / Brittle / modifyBlock', () => {
    const cases: [Record<string, number>, string[], number][] = [
      [{}, [], 5],
      [{ sturdy: 2 }, [], 7],
      [{ brittle: 1 }, [], 3],
      [{ sturdy: 3, brittle: 1 }, [], 6],
      [{}, ['t_blk'], 6],
    ];
    for (const [pl, relics, blk] of cases) {
      const sc = setup({ hand: ['cap_up'], relics });
      Object.assign(cbt(sc.run).player.statuses, pl);
      const r = play(sc, 'cap_up');
      assert.equal(cbt(r.run).player.block, blk, JSON.stringify([pl, relics]));
    }
  });
  test('Rot and loseHp ignore block and modifiers', () => {
    let sc = setup({ hand: ['t_loseHp'] });
    cbt(sc.run).player.block = 10;
    sc = play(sc, 't_loseHp');
    assert.equal(cbt(sc.run).player.hp, 66);
    assert.equal(cbt(sc.run).player.block, 10);
    assert.equal(ev(sc.events, 'damage')[0].kind, 'hp');
  });
  test('Prickly: enemy thorns hurt the player attacking, block absorbs thorns', () => {
    let sc = setup({ enemies: ['thorny'], hand: ['bonk', 'bonk'] });
    sc = play(sc, 'bonk');
    assert.equal(cbt(sc.run).player.hp, 67);
    const th = ev(sc.events, 'damage').find((d) => d.kind === 'thorns')!;
    assert.equal(th.target, PLAYER);
    assert.equal(th.source, 'e1');
    cbt(sc.run).player.block = 2;
    sc = play(sc, 'bonk');
    assert.equal(cbt(sc.run).player.hp, 66);
    assert.equal(cbt(sc.run).player.block, 0);
  });
  test('Prickly on the player hurts each attacker hit', () => {
    let sc = setup({ enemies: ['multi'], hand: [] });
    cbt(sc.run).player.statuses.prickly = 2;
    sc = endTurn(sc);
    assert.equal(enemyOf(sc.run).hp, 50 - 6);
    assert.equal(cbt(sc.run).player.hp, 70 - 9);
  });
  test('onAttacked fires even when fully blocked (dealt = 0)', () => {
    let sc = setup({ enemies: ['spawner_on_hit'], hand: ['bonk'] });
    enemyOf(sc.run).block = 100;
    sc = play(sc, 'bonk');
    assert.equal(enemyOf(sc.run).hp, 50);
    assert.equal(cbt(sc.run).mem.attackedDealt, 0); // enemy hook ran with dealt = 0
  });
  test('status hook onAttacked on the player gets attacker + dealt (also when blocked)', () => {
    let sc = setup({ hand: [] });
    cbt(sc.run).player.statuses.t_thorny = 1;
    cbt(sc.run).player.block = 100;
    sc = endTurn(sc);
    assert.equal(cbt(sc.run).mem.thornAtt, 0);
    assert.equal(cbt(sc.run).mem.thornWho, 2);
  });
});

describe('rot, statuses and decay', () => {
  test('enemy Rot ticks at the start of its turn then drops by 1 (ignores block)', () => {
    let sc = setup({ hand: ['t_rot'] });
    sc = play(sc, 't_rot');
    assert.equal(enemyOf(sc.run).statuses.rot, 5);
    enemyOf(sc.run).block = 20;
    sc = endTurn(sc);
    assert.equal(enemyOf(sc.run).hp, 25);
    assert.equal(enemyOf(sc.run).statuses.rot, 4);
    const rot = ev(sc.events, 'damage').find((d) => d.kind === 'rot')!;
    assert.equal(rot.amount, 5);
    assert.equal(rot.blocked, 0);
  });
  test('player Rot ticks at player turn start', () => {
    let sc = setup({ hand: [] });
    cbt(sc.run).player.statuses.rot = 3;
    sc = endTurn(sc);
    // enemy hit 5 (no block) + rot 3
    assert.equal(cbt(sc.run).player.hp, 70 - 5 - 3);
    assert.equal(cbt(sc.run).player.statuses.rot, 2);
  });
  test('Rot kills an enemy at its turn start', () => {
    let sc = setup({ enemies: ['weak', 'dummy'], hand: [] });
    enemyOf(sc.run, 0).statuses.rot = 2;
    enemyOf(sc.run, 0).hp = 2;
    sc = endTurn(sc);
    assert.equal(enemyOf(sc.run, 0).alive, false);
    assert.equal(ev(sc.events, 'enemyDie').length, 1);
    assert.equal(cbt(sc.run).phase, 'player');
  });
  test('decay: player Wilted/Brittle tick down at end of player turn; statuses gained during the end-of-turn step do not tick', () => {
    let sc = setup({ hand: ['t_self'] });
    cbt(sc.run).player.statuses.wilted = 2;
    sc = play(sc, 't_self'); // +2 wilted (4), +2 brittle, +2 sturdy
    sc = endTurn(sc);
    const st = cbt(sc.run).player.statuses;
    assert.equal(st.wilted, 3); // 4 - 1
    assert.equal(st.brittle, 1); // applied during the turn: ticks at its end
    assert.equal(st.sturdy, 2);
  });
  test('enemy Soggy applied by the player ticks at the end of the enemy turn', () => {
    let sc = setup({ hand: ['t_apply'] });
    sc = play(sc, 't_apply');
    assert.equal(enemyOf(sc.run).statuses.soggy, 2);
    sc = endTurn(sc);
    assert.equal(enemyOf(sc.run).statuses.soggy, 1);
    assert.equal(enemyOf(sc.run).statuses.wilted, 1);
    sc = endTurn(sc);
    assert.equal(enemyOf(sc.run).statuses.soggy, undefined);
  });
  test('Armored keeps block for N enemy turns', () => {
    let sc = setup({ enemies: ['armored'], hand: [] });
    sc = endTurn(sc);
    assert.equal(enemyOf(sc.run).block, 10);
    sc = endTurn(sc);
    assert.equal(enemyOf(sc.run).block, 10);
    sc = endTurn(sc);
    assert.equal(enemyOf(sc.run).block, 0);
  });
  test('Shelled adds block at end of enemy turn; Growing adds Might', () => {
    let sc = setup({ enemies: ['shelly'], hand: [] });
    sc = endTurn(sc);
    assert.equal(enemyOf(sc.run).block, 4);
    sc = setup({ enemies: ['grower'], hand: [] });
    sc = endTurn(sc);
    assert.equal(enemyOf(sc.run).statuses.might, 2);
    sc = endTurn(sc);
    assert.equal(enemyOf(sc.run).statuses.might, 4);
  });
  test('Regrow heals at end of turn then decreases', () => {
    let sc = setup({ hand: [] });
    cbt(sc.run).player.hp = 50;
    cbt(sc.run).player.statuses.regrow = 3;
    sc = endTurn(sc);
    assert.equal(cbt(sc.run).player.statuses.regrow, 2);
    assert.equal(ev(sc.events, 'heal')[0].amount, 3);
    assert.equal(cbt(sc.run).player.hp, 50 + 3 - 5);
  });
  test('status hooks: power status onTurnStart fires (turn 1 and later) and with n stacks', () => {
    let sc = setup({ hand: ['t_power'] });
    sc = play(sc, 't_power');
    assert.equal(cbt(sc.run).player.statuses.t_power, 2);
    sc = endTurn(sc);
    assert.equal(cbt(sc.run).player.block, 2);
    // power card leaves the game without Nutrient
    assert.equal(cbt(sc.run).compost.length, 0);
    assert.equal(cbt(sc.run).player.nutrients, 0);
  });
});

describe('garden', () => {
  test('plant flow: plot limit, grow, bloom, perennial', () => {
    let sc = setup({ hand: ['seedling', 't_sprout', 't_fern', 't_sprout'], energy: 10 });
    sc = play(sc, 'seedling');
    sc = play(sc, 't_sprout');
    sc = play(sc, 't_fern');
    assert.equal(ev(sc.events, 'plant')[0].slot, 2);
    assert.equal(cbt(sc.run).garden.filter(Boolean).length, 3);
    const r = act(sc.run, { type: 'playCard', uid: cbt(sc.run).hand[0].uid });
    assert.match(r.error ?? '', /plot/i);
    assert.equal(r.run, sc.run);
    sc = endTurn(sc);
    // turn 2 start: everyone grew once: 3 + 1 + 1 block
    assert.equal(cbt(sc.run).player.block, 5);
    assert.deepEqual(cbt(sc.run).garden.map((p) => p!.growth), [1, 1, 1]);
    sc = endTurn(sc);
    // turn 3: sprout blooms (4 damage to all), its slot is free, it went to discard
    assert.equal(cbt(sc.run).garden[1], null);
    assert.equal(cbt(sc.run).counters.bloomsCombat, 1);
    assert.ok(cbt(sc.run).discard.some((c) => c.id === 't_sprout'));
    assert.equal(enemyOf(sc.run).block, 2); // dummy guarded for 6, bloom hit for 4
    assert.equal(ev(sc.events, 'bloom')[0].id, 't_sprout');
    sc = endTurn(sc);
    assert.equal(cbt(sc.run).garden[0], null); // seedling bloomed on turn 4
    assert.equal(cbt(sc.run).counters.bloomsCombat, 2);
    assert.equal(cbt(sc.run).garden[2]!.growth, 3); // perennial keeps growing and never blooms
    assert.equal(cbt(sc.run).mem.fern, 3);
    assert.equal(cbt(sc.run).mem.grows, 2);
  });
  test('relic passive adds plots', () => {
    const sc = setup({ hand: [], relics: ['t_plots'] });
    assert.equal(cbt(sc.run).garden.length, 4);
  });
  test('growPlants(99) blooms plants and ticks perennials once, counting blooms synchronously', () => {
    let sc = setup({ hand: ['t_sprout', 't_fern', 'seedling'], energy: 5 });
    sc = play(sc, 't_sprout');
    sc = play(sc, 't_fern');
    sc = play(sc, 'seedling');
    // emulate a Fertilize-like effect via the public Api by playing a fixture created on the fly
    const { registerCard } = require_registry();
    registerCard({ id: 't_harvest', name: 'h', type: 'skill', rarity: 'common', cost: 0, target: 'none', vals: {}, text: '', art: 'bonk', play: (a) => { a.growPlants(99); a.mem.bloomsAfter = a.combat.counters.bloomsCombat; } });
    cbt(sc.run).hand.push(inst('t_harvest'));
    sc = play(sc, 't_harvest');
    assert.equal(cbt(sc.run).garden.filter(Boolean).length, 1); // only the fern remains
    assert.equal(cbt(sc.run).mem.fern, 1);
    assert.equal(cbt(sc.run).mem.bloomsAfter, 2);
  });
});

import * as reg from './registry';
function require_registry() {
  return reg;
}

describe('compost & nutrients', () => {
  test('Compost keyword card gives +1 nutrient and moves to the compost pile', () => {
    let sc = setup({ hand: ['t_compostme'] });
    sc = play(sc, 't_compostme');
    assert.equal(cbt(sc.run).player.nutrients, 1);
    assert.equal(cbt(sc.run).compost.length, 1);
    const order = sc.events.map((e) => e.t);
    assert.ok(order.indexOf('compost') < order.indexOf('nutrients'));
    assert.equal(cbt(sc.run).counters.compostedCombat, 1);
  });
  test('Fleeting cards are composted at end of turn, others discarded, Keep stays', () => {
    let sc = setup({ hand: ['t_fleeting', 'bonk', 't_keep'] });
    sc = endTurn(sc);
    const c = cbt(sc.run);
    assert.deepEqual(c.compost.map((x) => x.id), ['t_fleeting']);
    assert.equal(c.player.nutrients, 1);
    assert.ok(c.hand.some((x) => x.id === 't_keep'));
    assert.ok(c.discard.some((x) => x.id === 'bonk'));
  });
  test('Bloom (nutrient) cost is required and spent', () => {
    let sc = setup({ hand: ['t_bloomcost'] });
    const uid = cbt(sc.run).hand[0].uid;
    const r = act(sc.run, { type: 'playCard', uid, target: 'e1' });
    assert.match(r.error ?? '', /Nutrient/);
    cbt(sc.run).player.nutrients = 3;
    sc = play(sc, 't_bloomcost');
    assert.equal(cbt(sc.run).player.nutrients, 1);
    assert.equal(enemyOf(sc.run).hp, 10);
  });
  test('X cost spends all Spores and sets v.x', () => {
    let sc = setup({ hand: ['t_x'] });
    sc = play(sc, 't_x');
    assert.equal(cbt(sc.run).player.energy, 0);
    assert.equal(cbt(sc.run).player.block, 6);
  });
  test('Mold / Doubt end-of-turn hooks; Innate cards start in hand', () => {
    let sc = setup({ hand: ['mold', 'doubt'] });
    sc = endTurn(sc);
    assert.equal(cbt(sc.run).player.statuses.wilted, 1);
    assert.equal(cbt(sc.run).player.hp, 70 - 2 - 5);
    const deck = ['t_innate', 't_innate', 'bonk', 'bonk', 'bonk', 'bonk', 'bonk', 'bonk', 'bonk', 'bonk', 'bonk', 'bonk'];
    let ok = 0;
    for (const seed of ['A', 'B', 'C', 'D']) {
      const s2 = setup({ deck, seed, natural: true });
      const hand = cbt(s2.run).hand;
      assert.equal(hand.length, 5);
      if (hand.filter((c) => c.id === 't_innate').length === 2) ok++;
    }
    assert.equal(ok, 4);
  });
  test('Unplayable cards are rejected; canPlay reasons surface', () => {
    const sc = setup({ hand: ['mildew', 't_canplay'] });
    let r = act(sc.run, { type: 'playCard', uid: cbt(sc.run).hand[0].uid });
    assert.match(r.error ?? '', /Unplayable/i);
    r = act(sc.run, { type: 'playCard', uid: cbt(sc.run).hand[1].uid });
    assert.equal(r.error, 'Need 2 plants.');
  });
  test('cost is checked', () => {
    const sc = setup({ hand: ['bonk'], energy: 0 });
    const r = act(sc.run, { type: 'playCard', uid: cbt(sc.run).hand[0].uid, target: 'e1' });
    assert.match(r.error ?? '', /Spores/);
  });
});

describe('pending choices', () => {
  test('compost choice flow', () => {
    let sc = setup({ hand: ['t_mulch', 'bonk', 'cap_up'] });
    sc = play(sc, 't_mulch');
    const p = cbt(sc.run).pending!;
    assert.equal(p.sourceCardId, 't_mulch');
    assert.equal(p.candidates.length, 2);
    assert.equal(p.min, 1);
    assert.equal(cbt(sc.run).player.block, 6);
    // blocked actions
    assert.ok(act(sc.run, { type: 'endTurn' }).error);
    assert.ok(act(sc.run, { type: 'playCard', uid: cbt(sc.run).hand[0].uid, target: 'e1' }).error);
    assert.ok(act(sc.run, { type: 'choose', uids: [] }).error);
    assert.ok(act(sc.run, { type: 'choose', uids: [999999] }).error);
    assert.ok(act(sc.run, { type: 'choose', uids: [p.candidates[0], p.candidates[1]] }).error);
    const pick = p.candidates[0];
    sc = step(sc, { type: 'choose', uids: [pick] });
    assert.equal(cbt(sc.run).pending, null);
    assert.equal(cbt(sc.run).compost.length, 1);
    assert.equal(cbt(sc.run).compost[0].uid, pick);
    assert.equal(cbt(sc.run).player.nutrients, 1);
    assert.equal(cbt(sc.run).mem.afterChoice, 1);
    sc = endTurn(sc);
  });
  test('no candidates: choice is skipped silently (even with min 1), afterChoice not called', () => {
    let sc = setup({ hand: ['t_mulch'] });
    sc = play(sc, 't_mulch');
    assert.equal(cbt(sc.run).pending, null);
    assert.equal(cbt(sc.run).player.block, 6);
    assert.equal(cbt(sc.run).mem.afterChoice, undefined);
  });
  test('one candidate and min 1: still asks the player to confirm', () => {
    let sc = setup({ hand: ['t_mulch', 'bonk'] });
    sc = play(sc, 't_mulch');
    assert.equal(cbt(sc.run).pending!.candidates.length, 1);
    sc = step(sc, { type: 'choose', uids: cbt(sc.run).pending!.candidates });
    assert.equal(cbt(sc.run).compost.length, 1);
  });
  test('options + toHand, then afterChoice can setCost on the chosen card', () => {
    let sc = setup({ hand: ['t_options'] });
    sc = play(sc, 't_options');
    const p = cbt(sc.run).pending!;
    assert.equal(p.from, 'options');
    assert.equal(p.options!.length, 2);
    const chosen = p.options![1];
    sc = step(sc, { type: 'choose', uids: [chosen.uid] });
    const inHand = cbt(sc.run).hand.find((c) => c.uid === chosen.uid)!;
    assert.equal(inHand.id, 'cap_up');
    assert.equal(inHand.costOverride, 0);
    assert.equal(cbt(sc.run).mem.picked, chosen.uid);
    sc = endTurn(sc);
    const back = cbt(sc.run).discard.find((c) => c.uid === chosen.uid)!;
    assert.equal(back.costOverride, undefined);
  });
  test('topdeck from discard with min 0 may be skipped or used', () => {
    let sc = setup({ hand: ['t_topdeck'], discard: ['bonk', 'cap_up'], draw: ['bonk'] });
    sc = play(sc, 't_topdeck');
    const p = cbt(sc.run).pending!;
    assert.equal(p.min, 0);
    const target = cbt(sc.run).discard.find((c) => c.id === 'cap_up')!;
    sc = step(sc, { type: 'choose', uids: [target.uid] });
    assert.equal(cbt(sc.run).draw[0].uid, target.uid);
    assert.ok(!cbt(sc.run).discard.some((c) => c.uid === target.uid));
    let sc2 = setup({ hand: ['t_topdeck'], discard: ['bonk'] });
    sc2 = play(sc2, 't_topdeck');
    sc2 = step(sc2, { type: 'choose', uids: [] });
    assert.equal(cbt(sc2.run).pending, null);
  });
});

describe('piles', () => {
  test('reshuffle: empty draw pile pulls in the discard pile and emits shuffle', () => {
    let sc = setup({ hand: ['t_draw3'], draw: ['bonk'], discard: ['cap_up', 'cap_up', 'cap_up'] });
    sc = play(sc, 't_draw3');
    const c = cbt(sc.run);
    assert.equal(c.hand.length, 3);
    assert.equal(c.draw.length, 1);
    assert.deepEqual(c.discard.map((x) => x.id), ['t_draw3']);
    const kinds = sc.events.map((e) => e.t).filter((t) => t === 'draw' || t === 'shuffle');
    assert.deepEqual(kinds, ['draw', 'shuffle', 'draw']);
  });
  test('hand limit: overdraw is discarded', () => {
    const hand = ['t_draw3', ...Array(9).fill('bonk')];
    let sc = setup({ hand, draw: Array(5).fill('cap_up') });
    sc = play(sc, 't_draw3');
    const c = cbt(sc.run);
    assert.equal(c.hand.length, 10);
    assert.equal(c.discard.filter((x) => x.id === 'cap_up').length, 2);
    assert.equal(c.draw.length, 2);
    const d = ev(sc.events, 'discard');
    assert.equal(d[0].uids.length, 2);
  });
  test('turn draws 5 (+relic handSize) and refills energy (+relic maxEnergy); unspent energy is lost', () => {
    let sc = setup({ natural: true, relics: ['t_energy'] });
    // relic was added after run creation, combat computed passives at start
    assert.equal(cbt(sc.run).player.maxEnergy, 4);
    assert.equal(cbt(sc.run).hand.length, 6);
    sc = endTurn(sc);
    assert.equal(cbt(sc.run).hand.length, 6);
    assert.equal(cbt(sc.run).player.energy, 4);
    assert.equal(cbt(sc.run).turn, 2);
  });
  test('addCard: hand full sends the new card to discard', () => {
    let sc = setup({ hand: ['t_shiver', ...Array(9).fill('bonk')] });
    sc = play(sc, 't_shiver');
    const c = cbt(sc.run);
    assert.equal(c.hand.length, 10);
    assert.equal(c.discard.filter((x) => x.id === 'spore').length, 1);
    assert.equal(ev(sc.events, 'newCard').length, 2);
  });
});

describe('enemies', () => {
  test('scripted combat vs dummy', () => {
    let sc = setup({ hand: ['bonk', 'bonk', 'cap_up'], draw: Array(10).fill('bonk') });
    sc = play(sc, 'bonk');
    sc = play(sc, 'bonk');
    sc = play(sc, 'cap_up');
    assert.equal(enemyOf(sc.run).hp, 18);
    assert.equal(cbt(sc.run).player.energy, 0);
    assert.ok(act(sc.run, { type: 'playCard', uid: cbt(sc.run).hand[0]?.uid ?? 0 }).error);
    sc = endTurn(sc);
    // enemy hit 5 into 5 block
    const dmg = ev(sc.events, 'damage')[0];
    assert.equal(dmg.amount, 0);
    assert.equal(dmg.blocked, 5);
    assert.equal(cbt(sc.run).player.hp, 70);
    assert.equal(enemyOf(sc.run).intent, 'guard');
    assert.equal(cbt(sc.run).turn, 2);
    assert.equal(cbt(sc.run).hand.length, 5);
    assert.equal(cbt(sc.run).player.block, 0);
    const types = sc.events.map((e) => e.t);
    assert.deepEqual(types.filter((t) => ['turn', 'enemyMove', 'intent', 'energy'].includes(t)), ['discard'].filter(() => false).concat(['turn', 'enemyMove', 'intent', 'turn', 'energy']));
    // kill it: 3 bonks = 18
    sc = play(sc, 'bonk');
    sc = play(sc, 'bonk');
    sc = play(sc, 'bonk');
    assert.equal(sc.run.screen.kind, 'reward');
    assert.equal(sc.run.hp, 70); // acorn healed 5 but capped
    assert.equal(sc.run.stats.enemiesKilled, 1);
    assert.equal(sc.run.stats.cardsPlayed, 6);
    assert.equal(sc.run.stats.damageDealt, 36 - 6);
  });
  test('enemy guard block then attack on later turn', () => {
    let sc = setup({ hand: [] });
    sc = endTurn(sc); // dummy hits
    assert.equal(cbt(sc.run).player.hp, 65);
    sc = endTurn(sc); // dummy guards
    assert.equal(enemyOf(sc.run).block, 6);
    assert.equal(cbt(sc.run).player.hp, 65);
    assert.equal(enemyOf(sc.run).intent, 'hit');
  });
  test('player death -> defeat screen with the killer named', () => {
    let sc = setup({ enemies: ['biter'], hand: [] });
    cbt(sc.run).player.hp = 5;
    sc = endTurn(sc);
    assert.equal(sc.run.screen.kind, 'defeat');
    assert.equal((sc.run.screen as { cause: string }).cause, 'biter');
    assert.equal(sc.run.hp, 0);
    assert.equal(sc.events[sc.events.length - 1].t, 'defeat');
    assert.ok(act(sc.run, { type: 'endTurn' }).error);
  });
  test('enemy rolls: multi-hit intent view and hits', () => {
    const sc = setup({ enemies: ['multi'], hand: [] });
    assert.equal(enemyOf(sc.run).intent, 'flurry');
  });
  test('splitting on death: hooks run for the dying enemy, dead enemy stays readable, victory waits', () => {
    let sc = setup({ enemies: ['splitter'], hand: ['bonk', 'bonk'] });
    enemyOf(sc.run).statuses.rot = 2;
    sc = play(sc, 'bonk');
    sc = play(sc, 'bonk');
    const c = cbt(sc.run);
    assert.equal(c.phase, 'player');
    assert.equal(c.enemies.length, 3);
    assert.equal(c.enemies[0].alive, false);
    assert.equal(c.enemies.filter((e) => e.alive).length, 2);
    assert.equal(c.mem.splitSawRot, 2);
    assert.equal(ev(sc.events, 'spawn').length, 2);
    assert.equal(c.enemies[1].intent, 'hit');
  });
  test('revive: victory check happens after death hooks', () => {
    let sc = setup({ enemies: ['zombie'], hand: ['bonk', 'bonk', 'bonk'] });
    sc = play(sc, 'bonk');
    sc = play(sc, 'bonk');
    assert.equal(cbt(sc.run).phase, 'player');
    assert.equal(cbt(sc.run).enemies.filter((e) => e.alive).length, 1);
    assert.equal(cbt(sc.run).enemies[1].hp, 5);
    sc = play(sc, 'bonk');
    assert.equal(sc.run.screen.kind, 'reward');
  });
  test('loseHp(uid, 999) triggers the normal death flow', () => {
    let sc = setup({ enemies: ['splitter'], hand: ['t_kill'] });
    sc = play(sc, 't_kill');
    assert.equal(ev(sc.events, 'enemyDie').length, 1);
    assert.equal(cbt(sc.run).enemies.filter((e) => e.alive).length, 2);
  });
  test('onHpLoss hook fires after HP drops (phase change)', () => {
    let sc = setup({ enemies: ['boss_half'], hand: ['bonk'], kind: 'boss' });
    enemyOf(sc.run).hp = 55;
    sc = play(sc, 'bonk');
    assert.equal(enemyOf(sc.run).mem.phase2, 1);
    assert.ok(ev(sc.events, 'say').some((e) => e.text === 'Phase 2'));
  });
  test('escape removes the enemy without rewards credit', () => {
    let sc = setup({ enemies: ['escaper'], hand: [] });
    sc = endTurn(sc);
    assert.equal(sc.run.screen.kind, 'reward');
    assert.equal(sc.run.stats.enemiesKilled, 0);
    assert.ok(ev(sc.events, 'escape').length === 1);
  });
  test('spawn from a card puts the enemy on the left and rolls its intent', () => {
    let sc = setup({ hand: ['t_spawn'] });
    sc = play(sc, 't_spawn');
    const c = cbt(sc.run);
    assert.equal(c.enemies[0].id, 'weak');
    assert.equal(c.enemies[0].intent, 'hit');
    assert.equal(ev(sc.events, 'intent').length, 1);
  });
  test('enemy AI weighted() never repeats a move more than maxRepeat times in a row', () => {
    let sc = setup({ enemies: ['wgt'], hand: [] });
    cbt(sc.run).player.hp = cbt(sc.run).player.maxHp = 9999;
    for (let i = 0; i < 60; i++) sc = endTurn(sc);
    const h = enemyOf(sc.run).history;
    for (let i = 2; i < h.length; i++) assert.ok(!(h[i] === h[i - 1] && h[i] === h[i - 2]), 'three in a row at ' + i);
    assert.ok(h.filter((x) => x === 'a').length > 10);
  });
  test('broken AI falls back to the first move; broken card does not crash the game', () => {
    engineLog.errors.length = 0;
    let sc = setup({ enemies: ['brokenai'], hand: ['t_broken', 'bonk'] });
    assert.equal(enemyOf(sc.run).intent, 'hit');
    sc = play(sc, 't_broken');
    sc = play(sc, 'bonk');
    assert.ok(engineLog.errors.some((e) => e.includes('boom')));
    assert.ok(engineLog.errors.some((e) => e.includes('ai broke')));
    assert.equal(cbt(sc.run).discard.filter((c) => c.id === 't_broken').length, 1);
    assert.equal(enemyOf(sc.run).hp, 4);
  });
});

describe('relic hooks', () => {
  test('onCombatStart after the opening draw; onTurnStart fires on turn 1 and later; Lucky Acorn heals on win', () => {
    let sc = setup({ enemies: ['weak'], relics: ['t_start'], hand: ['bonk', 'bonk'] });
    assert.equal(cbt(sc.run).player.block, 4);
    assert.equal(cbt(sc.run).mem.turnStarts, 1);
    sc = endTurn(sc);
    assert.equal(cbt(sc.run).mem.turnStarts, 2);
    assert.equal(cbt(sc.run).player.block, 0);
  });
  test('Lucky Acorn heals 5 at the end of a won combat', () => {
    let sc = setup({ enemies: ['weak'], hand: ['bonk'] });
    sc.run.hp = 50;
    cbt(sc.run).player.hp = 50;
    sc = play(sc, 'bonk');
    assert.equal(sc.run.screen.kind, 'reward');
    assert.equal(sc.run.hp, 55);
  });
  test('onApplyRot from the player, recursion is bounded', () => {
    let sc = setup({ hand: ['t_rot'], relics: ['t_rot'] });
    sc = play(sc, 't_rot');
    assert.equal(enemyOf(sc.run).statuses.rot, 6);
    assert.equal(cbt(sc.run).mem.rotSeen, 6);
    let sc2 = setup({ hand: ['t_rot'], relics: ['t_loop'] });
    sc2 = play(sc2, 't_rot');
    const rot = enemyOf(sc2.run).statuses.rot;
    assert.ok(rot > 5 && rot <= 30, 'rot=' + rot);
  });
});

describe('potions', () => {
  test('use a targeted potion in combat', () => {
    let sc = setup({ hand: [] });
    sc.run.potions[0] = 't_poison';
    sc = step(sc, { type: 'usePotion', slot: 0, target: 'e1' });
    assert.equal(enemyOf(sc.run).statuses.rot, 6);
    assert.equal(sc.run.potions[0], null);
    assert.ok(ev(sc.events, 'potion').length === 1);
    assert.ok(act(sc.run, { type: 'usePotion', slot: 0 }).error);
  });
});

describe('blight levels', () => {
  test('enemy HP scaling by kind', () => {
    assert.equal(enemyOf(setup({ ascension: 0 }).run).maxHp, 30);
    assert.equal(enemyOf(setup({ ascension: 2 }).run).maxHp, 33);
    assert.equal(enemyOf(setup({ ascension: 2, kind: 'elite' }).run).maxHp, 30);
    assert.equal(enemyOf(setup({ ascension: 3, kind: 'elite' }).run).maxHp, 33);
    assert.equal(enemyOf(setup({ ascension: 3, kind: 'boss' }).run).maxHp, 30);
    assert.equal(enemyOf(setup({ ascension: 4, kind: 'boss' }).run).maxHp, 33);
  });
  test('enemy damage scaling', () => {
    const hit = (o: Parameters<typeof setup>[0]) => {
      let sc = setup({ enemies: ['biter'], hand: [], ...o });
      sc = endTurn(sc);
      return 70 - cbt(sc.run).player.hp - 0;
    };
    const base = hit({});
    assert.equal(base, 10);
    assert.equal(hit({ ascension: 6 }), 10);
    assert.equal(hit({ ascension: 7 }), 11);
    assert.equal(hit({ ascension: 7, kind: 'elite' }), 10);
    assert.equal(hit({ ascension: 4, kind: 'boss' }), 11);
  });
  test('level 10: act 3 boss gains Growing 2 at half HP', () => {
    const sc0 = setup({ enemies: ['boss_half'], hand: ['bonk'], kind: 'boss', ascension: 10 });
    sc0.run.act = 3;
    enemyOf(sc0.run).hp = 60;
    const sc = play(sc0, 'bonk');
    assert.equal(enemyOf(sc.run).statuses.growing, 2);
  });
});
