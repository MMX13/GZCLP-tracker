import type { SetLog, Tier, Track } from './types';

export interface Scheme {
  sets: number;
  reps: number;
  label: string;
}

export const HEAVY: Scheme[] = [
  { sets: 3, reps: 5, label: '3×5' },
  { sets: 4, reps: 5, label: '4×5' },
  { sets: 5, reps: 3, label: '5×3' },
];

export const VOLUME: Scheme[] = [
  { sets: 3, reps: 10, label: '3×10' },
  { sets: 3, reps: 8, label: '3×8' },
  { sets: 3, reps: 6, label: '3×6' },
];

/** T3 success thresholds: 15 on the first set, at least 12 on the AMRAP set. */
export const T3_FIRST = 15;
export const T3_AMRAP = 12;
export const T3_LABEL = '2×8–15';

export function stagesFor(tier: Tier, track: Track): Scheme[] | null {
  if (tier === 3) return null;
  if (tier === 1 && track === 'heavy') return HEAVY;
  return VOLUME;
}

export function stageCount(tier: Tier, track: Track): number {
  return stagesFor(tier, track)?.length ?? 1;
}

export function schemeLabel(tier: Tier, track: Track, stage: number): string {
  const stages = stagesFor(tier, track);
  if (!stages) return T3_LABEL;
  return stages[Math.min(stage, stages.length - 1)].label;
}

/** The empty set list a session starts with. */
export function buildSets(tier: Tier, track: Track, stage: number): SetLog[] {
  const stages = stagesFor(tier, track);
  if (!stages) {
    return [
      { target: T3_FIRST, reps: null, amrap: false },
      { target: T3_AMRAP, reps: null, amrap: true },
    ];
  }
  const s = stages[Math.min(stage, stages.length - 1)];
  return Array.from({ length: s.sets }, () => ({ target: s.reps, reps: null, amrap: false }));
}

export function trackLabel(track: Track): string {
  return track === 'heavy' ? 'Heavy' : track === 'volume' ? 'Volume' : '';
}
