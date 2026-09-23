import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  answerPrompt,
  buildSession,
  evaluate,
  finishSession,
  newItem,
  newState,
  promptFor,
  syncItemSets,
} from './progression';
import { describeSetup, deloadWeight, floorWeight, nextWeight, plateCombos, prevWeight } from './weights';
import { buildSets, itemSchemeLabel, schemeLabel } from './schemes';
import { trackFor, variantAt } from './rotation';
import { e1rm, e5rm } from './estimates';
import type { Exercise, Session, SessionItem, Slot, WeightMode } from './types';

const BAR: WeightMode = { kind: 'fixed', increment: 2.5 };
const MACHINE: WeightMode = { kind: 'plates', plate: 4.5, addon: 2.3, maxAddons: 2 };

function ex(id: string, mode: WeightMode = BAR): Exercise {
  return { id, name: id, mode, rest: 120, lastWeights: {} };
}

function program() {
  const exercises = [ex('squat'), ex('bench'), ex('row'), ex('curl', { kind: 'fixed', increment: 1 }), ex('pull', MACHINE)];
  const slots: Slot[] = [
    { id: 'sq', day: 'A', tier: 1, exerciseId: 'squat', order: 0, variant1Track: 'heavy', states: { heavy: newState(100), volume: newState(80) } },
    { id: 'bp', day: 'A', tier: 1, exerciseId: 'bench', order: 1, variant1Track: 'volume', states: { heavy: newState(70), volume: newState(50) } },
    { id: 'rw', day: 'A', tier: 2, exerciseId: 'row', order: 0, states: { none: newState(60) } },
    { id: 'cu', day: 'A', tier: 3, exerciseId: 'curl', order: 1, states: { none: newState(12) } },
    { id: 'pd', day: 'A', tier: 3, exerciseId: 'pull', order: 0, states: { none: newState(29.5) } },
  ];
  return { exercises, slots };
}

function logAll(item: SessionItem, reps?: number[]): SessionItem {
  return { ...item, sets: item.sets.map((s, i) => ({ ...s, reps: reps ? reps[i] : s.target })) };
}

function item(s: Session, slotId: string) {
  return s.items.find((i) => i.slotId === slotId)!;
}

function withItem(s: Session, slotId: string, f: (i: SessionItem) => SessionItem): Session {
  return { ...s, items: s.items.map((i) => (i.slotId === slotId ? f(i) : i)) };
}

// Rotation and tracks

test('rotation runs A1, B1, A2, B2 and repeats', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(variantAt), ['A1', 'B1', 'A2', 'B2', 'A1', 'B1']);
});

test('main lifts swap tracks between variants', () => {
  const { slots } = program();
  assert.equal(trackFor(slots[0], 'A1'), 'heavy');
  assert.equal(trackFor(slots[0], 'A2'), 'volume');
  assert.equal(trackFor(slots[1], 'A1'), 'volume');
  assert.equal(trackFor(slots[1], 'A2'), 'heavy');
  assert.equal(trackFor(slots[2], 'A1'), 'none');
});

test('session orders T1, then T2, then T3 by saved order', () => {
  const { slots, exercises } = program();
  const s = buildSession('A1', slots, exercises, 85);
  assert.deepEqual(s.items.map((i) => i.slotId), ['sq', 'bp', 'rw', 'pd', 'cu']);
  assert.equal(item(s, 'sq').weight, 100);
  assert.equal(item(s, 'bp').weight, 50);
  assert.equal(item(s, 'sq').sets.length, 3);
  assert.equal(item(s, 'bp').sets[0].target, 10);
});

// Schemes

test('schemes by tier, track and stage', () => {
  assert.equal(schemeLabel(1, 'heavy', 0), '3×5');
  assert.equal(schemeLabel(1, 'heavy', 1), '4×4');
  assert.equal(schemeLabel(1, 'heavy', 2), '5×3');
  assert.equal(schemeLabel(1, 'volume', 2), '3×6');
  assert.equal(schemeLabel(2, 'none', 1), '3×8');
  assert.equal(schemeLabel(3, 'none', 0), '2×8–15');
  assert.equal(buildSets(1, 'heavy', 1).length, 4);
  assert.equal(buildSets(1, 'heavy', 1)[0].target, 4);
  const t3 = buildSets(3, 'none', 0);
  assert.equal(t3.length, 2);
  assert.equal(t3[1].amrap, true);
});

test('an in-progress item picks up a changed scheme and keeps logged reps', () => {
  const { slots, exercises } = program();
  const sq = item(buildSession('A1', slots, exercises, 85), 'sq');
  const old: SessionItem = {
    ...sq,
    stage: 1,
    sets: [5, null, null, null, null].map((reps) => ({ target: 5, reps, amrap: false })),
  };
  const synced = syncItemSets(old);
  assert.deepEqual(synced.sets.map((x) => [x.target, x.reps]), [[4, 5], [4, null], [4, null], [4, null]]);
  const current = logAll(sq);
  assert.equal(syncItemSets(current), current);
});

// Success

test('T1 success adds one increment and keeps the stage', () => {
  const { slots, exercises } = program();
  let s = buildSession('A1', slots, exercises, 85);
  s = withItem(s, 'sq', (i) => logAll(i));
  const r = finishSession(s, slots, exercises);
  const sq = r.slots.find((x) => x.id === 'sq')!;
  assert.equal(sq.states.heavy!.weight, 102.5);
  assert.equal(sq.states.heavy!.stage, 0);
  assert.equal(sq.states.heavy!.pendingPrompt, false);
  assert.equal(sq.states.volume!.weight, 80, 'other track untouched');
  assert.equal(item(r.session, 'sq').outcome, 'up');
});

test('changing weight mid-session and completing counts as success at that weight', () => {
  const { slots, exercises } = program();
  let s = buildSession('A1', slots, exercises, 85);
  s = withItem(s, 'sq', (i) => logAll({ ...i, weight: 95 }));
  const r = finishSession(s, slots, exercises);
  assert.equal(r.slots.find((x) => x.id === 'sq')!.states.heavy!.weight, 97.5);
});

// Failure and prompts

test('T1 failure keeps weight and stage and flags a prompt', () => {
  const { slots, exercises } = program();
  let s = buildSession('A1', slots, exercises, 85);
  s = withItem(s, 'sq', (i) => logAll(i, [5, 5, 4]));
  const r = finishSession(s, slots, exercises);
  const st = r.slots.find((x) => x.id === 'sq')!.states.heavy!;
  assert.equal(st.weight, 100);
  assert.equal(st.stage, 0);
  assert.equal(st.pendingPrompt, true);
  assert.equal(st.lastMissed, 1);
  assert.equal(item(r.session, 'sq').outcome, 'missed');
});

test('next session carries a drop prompt, which moves down a stage at the same weight', () => {
  const { slots, exercises } = program();
  let s = buildSession('A1', slots, exercises, 85);
  s = withItem(s, 'sq', (i) => logAll(i, [5, 5, 4]));
  const r = finishSession(s, slots, exercises);
  const s2 = buildSession('A1', r.slots, r.exercises, 85);
  const sq = item(s2, 'sq');
  assert.equal(sq.prompt?.kind, 'drop');
  assert.equal(sq.prompt?.toStage, 1);
  const dropped = answerPrompt(sq, true);
  assert.equal(dropped.stage, 1);
  assert.equal(dropped.weight, 100);
  assert.equal(dropped.sets.length, 4);
  const stayed = answerPrompt(sq, false);
  assert.equal(stayed.stage, 0);
  assert.equal(stayed.promptAnswer, 'stayed');
});

test('success after a drop resumes increments at the new stage', () => {
  const { slots, exercises } = program();
  let s = buildSession('A1', slots, exercises, 85);
  s = withItem(s, 'sq', (i) => logAll(i, [5, 5, 4]));
  let r = finishSession(s, slots, exercises);
  let s2 = buildSession('A1', r.slots, r.exercises, 85);
  s2 = withItem(s2, 'sq', (i) => logAll(answerPrompt(i, true)));
  r = finishSession(s2, r.slots, r.exercises);
  const st = r.slots.find((x) => x.id === 'sq')!.states.heavy!;
  assert.equal(st.stage, 1);
  assert.equal(st.weight, 102.5);
  assert.equal(st.pendingPrompt, false);
});

test('failing the final stage offers a deload to 85% at the first stage', () => {
  const state = { weight: 120, stage: 2, lastResult: 'fail' as const, pendingPrompt: true, lastMissed: 2 };
  const p = promptFor(state, 1, 'heavy', BAR, 85)!;
  assert.equal(p.kind, 'deload');
  assert.equal(p.toStage, 0);
  assert.equal(p.toWeight, 100); // 102 rounded down to 2.5
});

test('deload percentage is configurable', () => {
  assert.equal(deloadWeight(BAR, 100, 90), 90);
  assert.equal(deloadWeight(BAR, 101, 85), 85);
});

test('T2 uses 3x10, 3x8, 3x6 then deload', () => {
  const st = { weight: 60, stage: 2, lastResult: 'fail' as const, pendingPrompt: true, lastMissed: 1 };
  assert.equal(promptFor(st, 2, 'none', BAR, 85)!.kind, 'deload');
  assert.equal(promptFor({ ...st, stage: 1 }, 2, 'none', BAR, 85)!.kind, 'drop');
});

test('no prompt after a success', () => {
  assert.equal(promptFor(newState(100), 1, 'heavy', BAR, 85), undefined);
});

// T3

test('T3 success needs 15 on the first set and 12 on the AMRAP', () => {
  assert.equal(evaluate({ tier: 3, sets: [{ target: 15, reps: 15, amrap: false }, { target: 12, reps: 12, amrap: true }] }), 'success');
  assert.equal(evaluate({ tier: 3, sets: [{ target: 15, reps: 14, amrap: false }, { target: 12, reps: 20, amrap: true }] }), 'fail');
  assert.equal(evaluate({ tier: 3, sets: [{ target: 15, reps: 15, amrap: false }, { target: 12, reps: 11, amrap: true }] }), 'fail');
});

test('T3 moves up on success, holds otherwise, and never prompts', () => {
  const { slots, exercises } = program();
  let s = buildSession('A1', slots, exercises, 85);
  s = withItem(s, 'cu', (i) => logAll(i, [15, 13]));
  s = withItem(s, 'pd', (i) => logAll(i, [14, 12]));
  const r = finishSession(s, slots, exercises);
  assert.equal(r.slots.find((x) => x.id === 'cu')!.states.none!.weight, 13);
  const pd = r.slots.find((x) => x.id === 'pd')!.states.none!;
  assert.equal(pd.weight, 29.5);
  assert.equal(pd.pendingPrompt, false);
  assert.equal(item(r.session, 'pd').outcome, 'same');
});

// Skips and swaps

test('skipped and unlogged items leave progression untouched', () => {
  const { slots, exercises } = program();
  let s = buildSession('A1', slots, exercises, 85);
  s = withItem(s, 'rw', (i) => ({ ...i, skipped: true }));
  const r = finishSession(s, slots, exercises);
  assert.deepEqual(r.slots.find((x) => x.id === 'rw')!.states, slots.find((x) => x.id === 'rw')!.states);
  assert.deepEqual(r.slots.find((x) => x.id === 'sq')!.states, slots.find((x) => x.id === 'sq')!.states);
  assert.equal(item(r.session, 'rw').outcome, 'skipped');
});

test('a swapped-in exercise updates its remembered weight, not the replaced slot', () => {
  const { slots, exercises } = program();
  const s = buildSession('A1', slots, exercises, 85);
  const swap: SessionItem = {
    ...item(s, 'rw'),
    id: 'swap',
    slotId: null,
    replacedSlotId: 'rw',
    exerciseId: 'curl',
    exerciseName: 'curl',
    swapped: true,
    weight: 20,
    plannedWeight: 20,
  };
  const s2 = { ...s, items: s.items.map((i) => (i.slotId === 'rw' ? logAll(swap) : i)) };
  const r = finishSession(s2, slots, exercises);
  assert.equal(r.exercises.find((e) => e.id === 'curl')!.lastWeights['2:none'], 20);
  assert.deepEqual(r.slots.find((x) => x.id === 'rw')!.states, slots.find((x) => x.id === 'rw')!.states);
});

test('the same exercise in two slots progresses independently', () => {
  const { slots, exercises } = program();
  const extra: Slot = { id: 'sq2', day: 'A', tier: 2, exerciseId: 'squat', order: 5, states: { none: newState(70) } };
  const all = [...slots, extra];
  let s = buildSession('A1', all, exercises, 85);
  s = withItem(s, 'sq', (i) => logAll(i));
  s = withItem(s, 'sq2', (i) => logAll(i, [10, 10, 9]));
  const r = finishSession(s, all, exercises);
  assert.equal(r.slots.find((x) => x.id === 'sq')!.states.heavy!.weight, 102.5);
  assert.equal(r.slots.find((x) => x.id === 'sq2')!.states.none!.weight, 70);
});

// Bodyweight

const BW: WeightMode = { kind: 'bodyweight', sets: 3 };

function bwProgram(reps?: number[]) {
  const { exercises, slots } = program();
  const pullups = ex('pullups', BW);
  const slot: Slot = { id: 'pu', day: 'A', tier: 3, exerciseId: 'pullups', order: 2, states: { none: { ...newState(), ...(reps && { reps }) } } };
  return { exercises: [...exercises, pullups], slots: [...slots, slot] };
}

test('bodyweight sets are all AMRAP, targeting last time per set', () => {
  const { slots, exercises } = bwProgram([8, 7, 6]);
  const it = item(buildSession('A1', slots, exercises, 85), 'pu');
  assert.equal(it.bodyweight, true);
  assert.equal(it.weight, 0);
  assert.deepEqual(it.sets.map((x) => [x.target, x.amrap]), [[8, true], [7, true], [6, true]]);
  assert.equal(itemSchemeLabel(it), '3×AMRAP');
});

test('bodyweight with no history starts with open targets', () => {
  const { slots, exercises } = bwProgram();
  const it = item(buildSession('A1', slots, exercises, 85), 'pu');
  assert.deepEqual(it.sets.map((x) => x.target), [0, 0, 0]);
});

test('beating last total moves bodyweight up and the reps become next targets', () => {
  const { slots, exercises } = bwProgram([8, 7, 6]);
  let s = buildSession('A1', slots, exercises, 85);
  s = withItem(s, 'pu', (i) => logAll(i, [9, 7, 6]));
  const r = finishSession(s, slots, exercises);
  assert.equal(item(r.session, 'pu').outcome, 'up');
  const st = r.slots.find((x) => x.id === 'pu')!.states.none!;
  assert.deepEqual(st.reps, [9, 7, 6]);
  assert.equal(st.pendingPrompt, false);
  assert.deepEqual(r.exercises.find((e) => e.id === 'pullups')!.lastReps!['3:none'], [9, 7, 6]);
  assert.equal(r.exercises.find((e) => e.id === 'pullups')!.lastWeights['3:none'], undefined);
  const next = item(buildSession('A1', r.slots, r.exercises, 85), 'pu');
  assert.deepEqual(next.sets.map((x) => x.target), [9, 7, 6]);
});

test('bodyweight never prompts or deloads when reps drop', () => {
  const { slots, exercises } = bwProgram([8, 7, 6]);
  let s = buildSession('A1', slots, exercises, 85);
  s = withItem(s, 'pu', (i) => logAll(i, [6, 5, 4]));
  const r = finishSession(s, slots, exercises);
  assert.equal(item(r.session, 'pu').outcome, 'same');
  const st = r.slots.find((x) => x.id === 'pu')!.states.none!;
  assert.equal(st.pendingPrompt, false);
  assert.deepEqual(st.reps, [6, 5, 4]);
  assert.equal(item(buildSession('A1', r.slots, r.exercises, 85), 'pu').prompt, undefined);
});

test('bodyweight unlogged sets count as zero, fully unlogged is skipped', () => {
  const { slots, exercises } = bwProgram([8, 7, 6]);
  let s = buildSession('A1', slots, exercises, 85);
  s = withItem(s, 'pu', (i) => ({ ...i, sets: i.sets.map((x, n) => (n === 0 ? { ...x, reps: 10 } : x)) }));
  let r = finishSession(s, slots, exercises);
  assert.deepEqual(r.slots.find((x) => x.id === 'pu')!.states.none!.reps, [10, 0, 0]);
  r = finishSession(buildSession('A1', slots, exercises, 85), slots, exercises);
  assert.equal(item(r.session, 'pu').outcome, 'skipped');
  assert.deepEqual(r.slots.find((x) => x.id === 'pu')!.states.none!.reps, [8, 7, 6]);
});

test('a swapped-in bodyweight exercise uses its remembered reps', () => {
  const pullups: Exercise = { ...ex('pullups', { kind: 'bodyweight', sets: 2 }), lastReps: { '2:none': [12, 10] } };
  const it = newItem(pullups, 2, 'none', { weight: 50, stage: 1, reps: pullups.lastReps!['2:none'] }, null);
  assert.equal(it.weight, 0);
  assert.equal(it.stage, 0);
  assert.deepEqual(it.sets.map((x) => x.target), [12, 10]);
});

test('bodyweight has no weight to step', () => {
  assert.equal(nextWeight(BW, 0), 0);
  assert.equal(prevWeight(BW, 0), 0);
  assert.equal(deloadWeight(BW, 50, 85), 0);
  assert.equal(describeSetup(BW, 0), null);
});

// Weights

test('fixed increments step up and down', () => {
  assert.equal(nextWeight(BAR, 60), 62.5);
  assert.equal(prevWeight(BAR, 2), 0);
  assert.equal(nextWeight({ kind: 'fixed', increment: 1.25 }, 20), 21.25);
  assert.equal(floorWeight({ kind: 'fixed', increment: 2 }, 31), 30);
});

test('plate machines list every combination from zero and merge near-duplicates', () => {
  const list = plateCombos(4.5, 2.3, 2).map((c) => c.weight);
  assert.deepEqual(list.slice(0, 7), [0, 2.3, 4.5, 6.8, 9, 11.3, 13.5]);
  assert.ok(!list.includes(4.6), '2 add-ons merged into one plate');
  assert.equal(nextWeight(MACHINE, 27), 29.3);
  assert.equal(nextWeight(MACHINE, 29.3), 31.5);
  assert.equal(prevWeight(MACHINE, 4.5), 2.3);
  assert.equal(floorWeight(MACHINE, 25.2), 24.8);
});

test('plate setup is described for the workout screen', () => {
  assert.equal(describeSetup(MACHINE, 29.3), '6 plates + 1 add-on');
  assert.equal(describeSetup(MACHINE, 27), '6 plates');
  assert.equal(describeSetup(MACHINE, 4.5), '1 plate');
  assert.equal(describeSetup(BAR, 60), null);
});

test('uneven machines with a big add-on still step correctly', () => {
  const m: WeightMode = { kind: 'plates', plate: 10, addon: 5, maxAddons: 1 };
  const list = plateCombos(10, 5, 1).map((c) => c.weight);
  assert.deepEqual(list.slice(0, 5), [0, 5, 10, 15, 20]);
  assert.equal(nextWeight(m, 15), 20);
});

test('pound plate machines work in kg, rounded to 0.1', () => {
  const LB: WeightMode = { kind: 'plates', plate: 10, addon: 5, maxAddons: 1, unit: 'lb' };
  assert.deepEqual(plateCombos(10, 5, 1, 'lb').slice(0, 5).map((c) => c.weight), [0, 2.3, 4.5, 6.8, 9.1]);
  assert.equal(nextWeight(LB, 45.4), 47.6);
  assert.equal(describeSetup(LB, 47.6), '10 plates + 1 add-on');
  assert.equal(floorWeight(LB, 50), 49.9);
});

// Estimates

test('Epley estimates', () => {
  assert.equal(Math.round(e1rm(100, 5)), 117);
  assert.equal(e1rm(100, 1), 100);
  assert.equal(e1rm(100, 0), 0);
  assert.equal(Math.round(e5rm(e1rm(100, 5))), 100);
});
