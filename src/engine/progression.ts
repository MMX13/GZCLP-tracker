import { bodyweightSets, buildSets, stageCount, T3_AMRAP, T3_FIRST, totalReps } from './schemes';
import { slotsForDay, trackFor, variantDay } from './rotation';
import { deloadWeight, nextWeight } from './weights';
import type {
  Exercise,
  Outcome,
  ProgState,
  Prompt,
  Session,
  SessionItem,
  Slot,
  Tier,
  Track,
  Variant,
  WeightMode,
} from './types';

export function newState(weight = 0): ProgState {
  return { weight, stage: 0, lastResult: null, pendingPrompt: false, lastMissed: 0 };
}

export function lastWeightKey(tier: Tier, track: Track): string {
  return `${tier}:${track}`;
}

export type Result = 'success' | 'fail' | 'none';

/** Missed reps across all sets. Unlogged sets count as fully missed. */
export function missedReps(item: Pick<SessionItem, 'sets' | 'tier'>): number {
  let missed = 0;
  for (const s of item.sets) {
    if (item.tier === 3 && s.amrap) {
      missed += Math.max(0, T3_AMRAP - (s.reps ?? 0));
    } else {
      missed += Math.max(0, s.target - (s.reps ?? 0));
    }
  }
  return missed;
}

/** Whether a finished item counts as a success. `none` means no sets were logged at all. */
export function evaluate(item: Pick<SessionItem, 'sets' | 'tier'>): Result {
  const logged = item.sets.filter((s) => s.reps != null);
  if (logged.length === 0) return 'none';
  if (item.tier === 3) {
    const first = item.sets[0]?.reps ?? 0;
    const amrap = item.sets[item.sets.length - 1]?.reps ?? 0;
    return first >= T3_FIRST && amrap >= T3_AMRAP ? 'success' : 'fail';
  }
  return item.sets.every((s) => s.reps != null && s.reps >= s.target) ? 'success' : 'fail';
}

/** The prompt to show for a slot that failed last time, if any. T3 never prompts. */
export function promptFor(
  state: ProgState,
  tier: Tier,
  track: Track,
  mode: WeightMode,
  deloadPct: number,
): Prompt | undefined {
  if (tier === 3 || !state.pendingPrompt || state.lastResult !== 'fail') return undefined;
  const last = stageCount(tier, track) - 1;
  if (state.stage < last) {
    return {
      kind: 'drop',
      missed: state.lastMissed,
      fromStage: state.stage,
      toStage: state.stage + 1,
      toWeight: state.weight,
    };
  }
  return {
    kind: 'deload',
    missed: state.lastMissed,
    fromStage: state.stage,
    toStage: 0,
    toWeight: deloadWeight(mode, state.weight, deloadPct),
  };
}

let idCounter = 0;
export function uid(prefix = ''): string {
  idCounter = (idCounter + 1) % 1e6;
  return `${prefix}${Date.now().toString(36)}${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** A fresh session item for an exercise at the given tier, track and progression state. */
export function newItem(
  exercise: Exercise,
  tier: Tier,
  track: Track,
  state: Pick<ProgState, 'weight' | 'stage' | 'reps'>,
  slotId: string | null,
): SessionItem {
  const bw = exercise.mode.kind === 'bodyweight';
  const item: SessionItem = {
    id: uid('i'),
    slotId,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    tier,
    track,
    stage: bw ? 0 : state.stage,
    weight: bw ? 0 : state.weight,
    plannedWeight: bw ? 0 : state.weight,
    sets:
      exercise.mode.kind === 'bodyweight'
        ? bodyweightSets(exercise.mode.sets, state.reps)
        : buildSets(tier, track, state.stage),
    skipped: false,
    swapped: false,
  };
  if (bw) item.bodyweight = true;
  return item;
}

/** Build a session item from a program slot. */
export function itemFromSlot(
  slot: Slot,
  exercise: Exercise,
  variant: Variant,
  deloadPct: number,
): SessionItem {
  const track = trackFor(slot, variant);
  const key = lastWeightKey(slot.tier, track);
  const state = slot.states[track] ?? { ...newState(exercise.lastWeights[key] ?? 0), reps: exercise.lastReps?.[key] };
  const item = newItem(exercise, slot.tier, track, state, slot.id);
  if (item.bodyweight) return item;
  const prompt = promptFor(state, slot.tier, track, exercise.mode, deloadPct);
  if (prompt) item.prompt = prompt;
  return item;
}

/** Build a new session for the given variant from the program. */
export function buildSession(
  variant: Variant,
  slots: Slot[],
  exercises: Exercise[],
  deloadPct: number,
  now = Date.now(),
): Session {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const items: SessionItem[] = [];
  for (const slot of slotsForDay(slots, variantDay(variant))) {
    const ex = byId.get(slot.exerciseId);
    if (ex) items.push(itemFromSlot(slot, ex, variant, deloadPct));
  }
  return { id: uid('s'), variant, start: now, status: 'active', items };
}

/** Rebuild the set list for a new stage, keeping any reps already logged. */
function rebuildSets(item: SessionItem, stage: number) {
  const fresh = buildSets(item.tier, item.track, stage);
  return fresh.map((s, i) => {
    const old = item.sets[i];
    return old && old.reps != null ? { ...s, reps: old.reps, weight: old.weight, at: old.at } : s;
  });
}

/** Answer the failure prompt on an item - accept the drop or deload, or stay. */
export function answerPrompt(item: SessionItem, accept: boolean): SessionItem {
  if (!item.prompt || item.promptAnswer) return item;
  if (!accept) return { ...item, promptAnswer: 'stayed' };
  const { toStage, toWeight } = item.prompt;
  return {
    ...item,
    promptAnswer: 'accepted',
    stage: toStage,
    weight: toWeight,
    sets: rebuildSets(item, toStage),
  };
}

/** Change the stage of an item mid-session. */
export function setItemStage(item: SessionItem, stage: number): SessionItem {
  return { ...item, stage, sets: rebuildSets(item, stage) };
}

export interface ItemResult {
  outcome: Outcome;
  nextWeight: number;
  nextStage: number;
  state: ProgState | null;
}

/**
 * Bodyweight progress is measured in reps. Beating last time's total is an improvement, and
 * there are no stages, failure prompts or deloads. Each set's reps become next time's targets.
 */
function bodyweightResult(item: SessionItem): ItemResult {
  const reps = item.sets.map((s) => s.reps ?? 0);
  const total = totalReps(item.sets);
  const before = item.sets.reduce((n, s) => n + s.target, 0);
  return {
    outcome: before > 0 && total > before ? 'up' : 'same',
    nextWeight: 0,
    nextStage: 0,
    state: { weight: 0, stage: 0, lastResult: total >= before ? 'success' : 'fail', pendingPrompt: false, lastMissed: 0, reps },
  };
}

/**
 * Work out what happens to a slot after a session.
 * Success moves the weight up. Failure keeps weight and stage and flags a prompt for next time.
 * A skipped or unlogged item leaves the slot untouched.
 */
export function resultFor(item: SessionItem, prev: ProgState | undefined, mode: WeightMode): ItemResult {
  const result = evaluate(item);
  if (item.skipped || result === 'none') {
    return {
      outcome: 'skipped',
      nextWeight: prev?.weight ?? item.plannedWeight,
      nextStage: prev?.stage ?? item.stage,
      state: null,
    };
  }
  if (item.bodyweight) return bodyweightResult(item);
  if (result === 'success') {
    const w = nextWeight(mode, item.weight);
    return {
      outcome: w > item.weight ? 'up' : 'same',
      nextWeight: w,
      nextStage: item.stage,
      state: { weight: w, stage: item.stage, lastResult: 'success', pendingPrompt: false, lastMissed: 0 },
    };
  }
  if (item.tier === 3) {
    return {
      outcome: 'same',
      nextWeight: item.weight,
      nextStage: 0,
      state: { weight: item.weight, stage: 0, lastResult: 'fail', pendingPrompt: false, lastMissed: missedReps(item) },
    };
  }
  return {
    outcome: 'missed',
    nextWeight: item.weight,
    nextStage: item.stage,
    state: {
      weight: item.weight,
      stage: item.stage,
      lastResult: 'fail',
      pendingPrompt: true,
      lastMissed: missedReps(item),
    },
  };
}

export interface FinishResult {
  session: Session;
  slots: Slot[];
  exercises: Exercise[];
}

/** Close a session and apply progression to the program. Pure - returns new copies. */
export function finishSession(
  session: Session,
  slots: Slot[],
  exercises: Exercise[],
  now = Date.now(),
): FinishResult {
  const slotMap = new Map(slots.map((s) => [s.id, { ...s, states: { ...s.states } }]));
  const exMap = new Map(
    exercises.map((e) => [e.id, { ...e, lastWeights: { ...e.lastWeights }, ...(e.lastReps && { lastReps: { ...e.lastReps } }) }]),
  );

  const items = session.items.map((item) => {
    const ex = exMap.get(item.exerciseId);
    const mode: WeightMode = ex?.mode ?? { kind: 'fixed', increment: 0 };
    const slot = item.slotId ? slotMap.get(item.slotId) : undefined;
    const prev = slot?.states[item.track];
    const r = resultFor(item, item.swapped ? undefined : prev, mode);

    const key = lastWeightKey(item.tier, item.track);
    if (r.state && ex && item.bodyweight) ex.lastReps = { ...ex.lastReps, [key]: r.state.reps ?? [] };
    else if (r.state && ex) ex.lastWeights[key] = item.weight;
    if (r.state && slot && !item.swapped) slot.states[item.track] = r.state;

    return { ...item, outcome: r.outcome, nextWeight: r.nextWeight, nextStage: r.nextStage };
  });

  return {
    session: { ...session, items, status: 'done', end: now },
    slots: slots.map((s) => slotMap.get(s.id)!),
    exercises: exercises.map((e) => exMap.get(e.id)!),
  };
}
