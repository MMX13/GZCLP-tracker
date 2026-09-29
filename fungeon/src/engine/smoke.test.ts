// Smoke tests against the REAL content: random-action runs must never throw, never wedge and never log hook errors.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, newRun, engineLog, cardView, statusViews, intentView, eventView, glossary, allCards, allEnemies, allEncounters, allEvents } from './index';
import { randomAction } from './autoplay';
import { hashString } from './rng';
import type { RunState } from './types';

const mkRng = (seed: string) => {
  let s = hashString(seed);
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

test('real content: every card renders, every encounter/event references known ids', () => {
  const cards = allCards();
  assert.ok(cards.length > 20);
  for (const c of cards) {
    const v = cardView({ uid: 1, id: c.id, upgraded: false });
    const u = cardView({ uid: 1, id: c.id, upgraded: true });
    assert.ok(!v.text.includes('?') || c.text.includes('?'), `${c.id}: unresolved placeholder in "${v.text}"`);
    assert.ok(!u.text.includes('?') || c.text.includes('?'), `${c.id}+: unresolved placeholder in "${u.text}"`);
    assert.equal(v.segments.map((s) => s.text).join(''), v.text);
  }
  const enemies = new Set(allEnemies().map((e) => e.id));
  for (const e of allEncounters()) for (const id of e.enemies) assert.ok(enemies.has(id), `${e.id} -> ${id}`);
  assert.ok(Object.keys(glossary()).length > 15);
  assert.ok(allEvents().length > 5);
});

function runBot(seed: string, ascension: number, god: boolean, maxSteps = 15000): RunState {
  const rnd = mkRng(seed);
  let run = newRun({ seed, ascension, now: 0 });
  if (god) run.hp = run.maxHp = 4000;
  for (let i = 0; i < maxSteps; i++) {
    const a = randomAction(run, rnd);
    if (!a) break;
    const r = act(run, a);
    if (r.error) {
      // the bot is dumb: allow rejections, but never internal errors
      assert.ok(!r.error.startsWith('Internal'), r.error);
      continue;
    }
    run = r.run;
    if (i % 25 === 0) {
      // views must always work on whatever screen we are on
      if (run.screen.kind === 'combat') {
        for (const c of run.screen.combat.hand) cardView(c, run);
        for (const e of run.screen.combat.enemies) {
          intentView(run, e.uid);
          statusViews(run, e.uid);
        }
        statusViews(run, 'player');
      }
      if (run.screen.kind === 'event') assert.ok(eventView(run));
    }
  }
  return run;
}

test('real content: 20 random-action runs (mixed blight levels) finish without exceptions or hook errors', () => {
  engineLog.errors.length = 0;
  engineLog.quiet = true;
  const ends: Record<string, number> = {};
  for (let i = 0; i < 20; i++) {
    const run = runBot('SMOKE' + i, i % 11, i % 2 === 0);
    ends[run.screen.kind] = (ends[run.screen.kind] ?? 0) + 1;
    assert.ok(['victory', 'defeat'].includes(run.screen.kind), `run ${i} did not finish: ${run.screen.kind} act ${run.act} floor ${run.floor}`);
  }
  assert.deepEqual(engineLog.errors, []);
  assert.ok(ends.victory > 0, JSON.stringify(ends));
});
