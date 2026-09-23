import type { SetLog } from './types';

/** Epley estimate of a one-rep max. A single is taken at face value. */
export function e1rm(weight: number, reps: number): number {
  if (!(reps > 0) || !(weight > 0)) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Five-rep max worked back from a one-rep max with the same formula. */
export function e5rm(oneRm: number): number {
  return oneRm / (1 + 5 / 30);
}

export interface BestSet {
  weight: number;
  reps: number;
  e1: number;
}

/** The logged set with the highest estimated 1RM. */
export function bestSet(sets: SetLog[], fallbackWeight: number): BestSet | null {
  let best: BestSet | null = null;
  for (const s of sets) {
    if (s.reps == null || s.reps <= 0) continue;
    const w = s.weight ?? fallbackWeight;
    const e = e1rm(w, s.reps);
    if (!best || e > best.e1) best = { weight: w, reps: s.reps, e1: e };
  }
  return best;
}
