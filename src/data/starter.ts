import { newState, uid } from '../engine/progression';
import type { Exercise, Slot, Tier, WeightMode } from '../engine/types';

const BAR: WeightMode = { kind: 'fixed', increment: 2.5 };
const DB: WeightMode = { kind: 'fixed', increment: 2.5 };
const MACHINE: WeightMode = { kind: 'plates', plate: 4.5, addon: 2.3, maxAddons: 2 };

interface Row {
  name: string;
  mode: WeightMode;
  rest: number;
  day: 'A' | 'B';
  tier: Tier;
  heavy?: number;
  volume?: number;
  weight?: number;
}

const ROWS: Row[] = [
  { name: 'Squat', mode: BAR, rest: 180, day: 'A', tier: 1, heavy: 60, volume: 45 },
  { name: 'Overhead press', mode: BAR, rest: 180, day: 'A', tier: 1, heavy: 30, volume: 22.5 },
  { name: 'Barbell row', mode: BAR, rest: 120, day: 'A', tier: 2, weight: 40 },
  { name: 'Leg extension', mode: MACHINE, rest: 90, day: 'A', tier: 3, weight: 22.5 },
  { name: 'Tricep pushdown', mode: MACHINE, rest: 90, day: 'A', tier: 3, weight: 18 },
  { name: 'Deadlift', mode: BAR, rest: 180, day: 'B', tier: 1, heavy: 80, volume: 60 },
  { name: 'Bench press', mode: BAR, rest: 180, day: 'B', tier: 1, heavy: 50, volume: 40 },
  { name: 'Machine row', mode: MACHINE, rest: 120, day: 'B', tier: 2, weight: 36 },
  { name: 'Lat pulldown', mode: MACHINE, rest: 90, day: 'B', tier: 3, weight: 29.3 },
  { name: 'Incline curl', mode: DB, rest: 90, day: 'B', tier: 3, weight: 10 },
];

/** A sample program to try the app with. Every weight can be edited afterwards. */
export function starterProgram(): { exercises: Exercise[]; slots: Slot[] } {
  const exercises: Exercise[] = [];
  const slots: Slot[] = [];
  const t1Count: Record<string, number> = { A: 0, B: 0 };
  const orders: Record<string, number> = {};
  for (const r of ROWS) {
    const ex: Exercise = { id: uid('e'), name: r.name, mode: r.mode, rest: r.rest, lastWeights: {} };
    exercises.push(ex);
    const key = `${r.day}${r.tier}`;
    const order = orders[key] ?? 0;
    orders[key] = order + 1;
    const slot: Slot = { id: uid('slot'), day: r.day, tier: r.tier, exerciseId: ex.id, order, states: {} };
    if (r.tier === 1) {
      slot.variant1Track = t1Count[r.day]++ === 0 ? 'heavy' : 'volume';
      slot.states = { heavy: newState(r.heavy ?? 0), volume: newState(r.volume ?? 0) };
    } else {
      slot.states = { none: newState(r.weight ?? 0) };
    }
    slots.push(slot);
  }
  return { exercises, slots };
}
