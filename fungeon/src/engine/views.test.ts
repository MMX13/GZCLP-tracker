import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { cardView, upgradedView, intentView, statusViews, glossary } from './index';
import { installFixtures, setup, cbt, inst, enemyOf } from './testutil';

before(() => installFixtures());

describe('cardView', () => {
  test('plain rendering without a run', () => {
    const v = cardView(inst('bonk'));
    assert.equal(v.text, 'Deal 6 damage.');
    assert.deepEqual(v.segments, [{ text: 'Deal 6 damage.' }]); // unchanged numbers are merged into plain text
    assert.equal(v.name, 'bonk');
    assert.equal(v.cost, 1);
    assert.equal(v.costChanged, false);
    assert.equal(v.targeted, true);
    assert.equal(v.playable, false);
    assert.equal(v.grow, undefined);
    assert.equal(v.type, 'attack');
  });
  test('upgraded: name+, up vals, upCost, upText', () => {
    const v = cardView(inst('bonk', true));
    assert.equal(v.name, 'bonk+');
    assert.equal(v.text, 'Deal 9 damage.');
    const u = cardView(inst('t_upcost', true));
    assert.equal(u.cost, 1);
    assert.equal(u.costChanged, false);
    assert.match(u.text, /\(up\)/);
    assert.equal(cardView(inst('t_upcost')).cost, 2);
    assert.equal(upgradedView(inst('bonk')).text, 'Deal 9 damage.');
    assert.equal(upgradedView(inst('bonk')).upgraded, true);
  });
  test('dmg / blk numbers are modified by statuses and toned', () => {
    const sc = setup({ hand: ['bonk', 'cap_up'] });
    const [bonk, cap] = cbt(sc.run).hand;
    cbt(sc.run).player.statuses.might = 3;
    let v = cardView(bonk, sc.run);
    assert.equal(v.text, 'Deal 9 damage.');
    assert.deepEqual(v.segments.find((s) => s.text === '9'), { text: '9', tone: 'up' });
    cbt(sc.run).player.statuses.wilted = 1;
    v = cardView(bonk, sc.run);
    assert.equal(v.text, 'Deal 6 damage.'); // (6+3)*.75 = 6.75 -> 6 : same as base, no tone
    assert.ok(v.segments.every((s) => !s.tone));
    delete cbt(sc.run).player.statuses.might;
    v = cardView(bonk, sc.run);
    assert.deepEqual(v.segments.find((s) => s.tone), { text: '4', tone: 'down' });
    // target Soggy
    enemyOf(sc.run).statuses.soggy = 1;
    v = cardView(bonk, sc.run, 'e1');
    assert.equal(v.text, 'Deal 6 damage.'); // 6*.75*1.5 = 6.75
    v = cardView(bonk, sc.run);
    assert.equal(v.text, 'Deal 4 damage.'); // no target -> soggy ignored
    delete cbt(sc.run).player.statuses.wilted;
    v = cardView(bonk, sc.run, 'e1');
    assert.equal(v.text, 'Deal 9 damage.');
    // block
    cbt(sc.run).player.statuses.sturdy = 2;
    assert.equal(cardView(cap, sc.run).text, 'Gain 7 Block.');
    cbt(sc.run).player.statuses.brittle = 1;
    assert.equal(cardView(cap, sc.run).text, 'Gain 5 Block.');
  });
  test('keyword lines are appended, plant / perennial lines too, status names highlighted', () => {
    const spore = cardView(inst('spore'));
    assert.equal(spore.text, 'Deal 3 damage. Apply 1 Rot.\nCompost.');
    assert.ok(spore.segments.some((s) => s.text === 'Rot' && s.tone === 'keyword'));
    assert.ok(spore.segments.some((s) => s.text === 'Compost' && s.tone === 'keyword'));
    assert.equal(spore.segments.map((s) => s.text).join(''), spore.text);
    assert.deepEqual(spore.keywords, ['compost']);
    assert.equal(cardView(inst('seedling')).text, 'Each turn: gain 3 Block. Bloom: draw 2.\nPlant (3).');
    assert.equal(cardView(inst('seedling')).grow, 3);
    assert.equal(cardView(inst('t_fern')).text, 'Each turn: block.\nPerennial.');
    assert.equal(cardView(inst('t_fern')).grow, null);
    assert.equal(cardView(inst('burr')).text, 'Sticky.\nUnplayable. Fleeting.');
    assert.equal(cardView(inst('burr')).cost, null);
    // "Compost a card" in prose does not suppress the keyword line
    assert.equal(cardView(inst('t_compostme')).text, 'Nothing.\nCompost.');
    // but an explicit sentence does
    const sc = setup({ hand: [] });
    void sc;
  });
  test('X cost, bloom cost, cost override', () => {
    assert.equal(cardView(inst('t_x')).cost, 'X');
    assert.equal(cardView(inst('t_x')).text, 'Gain X x2 Block.');
    assert.equal(cardView(inst('t_bloomcost')).nutrients, 2);
    const c = inst('bonk');
    c.costOverride = 0;
    const v = cardView(c);
    assert.equal(v.cost, 0);
    assert.equal(v.costChanged, true);
  });
  test('playable + reason inside combat', () => {
    const sc = setup({ hand: ['bonk', 't_bloomcost', 'mildew', 't_canplay', 'seedling'], energy: 1 });
    const [bonk, bloom, mildew, canplay] = cbt(sc.run).hand;
    assert.equal(cardView(bonk, sc.run).playable, true);
    assert.equal(cardView(bloom, sc.run).playable, false);
    assert.equal(cardView(bloom, sc.run).reason, 'Not enough Nutrients.');
    assert.equal(cardView(mildew, sc.run).reason, 'Unplayable.');
    assert.equal(cardView(canplay, sc.run).reason, 'Need 2 plants.');
    cbt(sc.run).player.energy = 0;
    assert.equal(cardView(bonk, sc.run).reason, 'Not enough Spores.');
    cbt(sc.run).garden = [{ card: inst('seedling'), growth: 0 }, { card: inst('seedling'), growth: 0 }, { card: inst('seedling'), growth: 0 }];
    cbt(sc.run).player.energy = 3;
    assert.equal(cardView(cbt(sc.run).hand[4], sc.run).reason, 'No free plot in your Garden.');
  });
  test('unknown card ids do not crash', () => {
    const v = cardView(inst('does_not_exist'));
    assert.equal(v.cost, null);
  });
  test('relic modifyAttack shows in the card text', () => {
    const sc = setup({ hand: ['bonk'], relics: ['t_dmg'] });
    assert.equal(cardView(cbt(sc.run).hand[0], sc.run).text, 'Deal 8 damage.');
  });
});

describe('intent / status views', () => {
  test('intent damage includes enemy Might/Wilted and player Soggy', () => {
    const sc = setup({ hand: [] });
    let iv = intentView(sc.run, 'e1')!;
    assert.deepEqual({ ...iv }, { name: 'Hit', intents: ['attack'], dmg: 5, hits: 1 });
    enemyOf(sc.run).statuses.might = 2;
    cbt(sc.run).player.statuses.soggy = 1;
    iv = intentView(sc.run, 'e1')!;
    assert.equal(iv.dmg, 10);
    enemyOf(sc.run).statuses.wilted = 1;
    assert.equal(intentView(sc.run, 'e1')!.dmg, 7); // 7*.75*1.5 = 7.875
    assert.equal(intentView(sc.run, 'nope'), null);
    enemyOf(sc.run).alive = false;
    assert.equal(intentView(sc.run, 'e1'), null);
  });
  test('multi-hit and block intents', () => {
    const sc = setup({ enemies: ['multi', 'idle'], hand: [] });
    const m = intentView(sc.run, 'e1')!;
    assert.equal(m.dmg, 3);
    assert.equal(m.hits, 3);
    const n = intentView(sc.run, 'e2')!;
    assert.equal(n.dmg, undefined);
  });
  test('status views', () => {
    const sc = setup({ hand: [] });
    cbt(sc.run).player.statuses.might = 2;
    cbt(sc.run).player.statuses.soggy = 1;
    cbt(sc.run).player.statuses.t_power = 3;
    const v = statusViews(sc.run, 'player');
    assert.deepEqual(v.map((s) => s.id), ['might', 'soggy', 't_power']);
    assert.equal(v[0].kind, 'buff');
    assert.equal(v[1].kind, 'debuff');
    assert.equal(v[0].icon, 'st-might');
    assert.match(v[0].desc, /\+2/);
    assert.equal(v[2].name, 'Test Power');
    assert.deepEqual(statusViews(sc.run, 'e1'), []);
    assert.deepEqual(statusViews(sc.run, 'zzz'), []);
  });
  test('glossary has keywords and statuses', () => {
    const g = glossary();
    for (const k of ['Compost', 'Fleeting', 'Keep', 'Innate', 'Unplayable', 'Plant', 'Perennial', 'Bloom', 'Might', 'Rot', 'Soggy', 'Armored', 'Test Power']) assert.ok(g[k], k);
  });
});
