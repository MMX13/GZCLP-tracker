export type Tier = 1 | 2 | 3;
export type Track = 'heavy' | 'volume' | 'none';
export type Day = 'A' | 'B';
export type Variant = 'A1' | 'B1' | 'A2' | 'B2';

export type WeightMode =
  | { kind: 'fixed'; increment: number }
  | { kind: 'plates'; plate: number; addon: number; maxAddons: number };

export interface Exercise {
  id: string;
  name: string;
  mode: WeightMode;
  /** Rest time in seconds. */
  rest: number;
  /** Last completed weight keyed by `${tier}:${track}`. */
  lastWeights: Record<string, number>;
}

export interface ProgState {
  weight: number;
  stage: number;
  lastResult: 'success' | 'fail' | null;
  /** Set after a failure. Cleared once the lifter has answered the prompt or trained the slot again. */
  pendingPrompt: boolean;
  lastMissed: number;
}

export interface Slot {
  id: string;
  day: Day;
  tier: Tier;
  exerciseId: string;
  order: number;
  /** T1 only - the track this slot runs in variant 1 of its day. Variant 2 uses the other track. */
  variant1Track?: 'heavy' | 'volume';
  states: Partial<Record<Track, ProgState>>;
}

export interface SetLog {
  target: number;
  reps: number | null;
  amrap: boolean;
  weight?: number;
  at?: number;
}

export type Outcome = 'up' | 'missed' | 'same' | 'skipped';

export interface Prompt {
  kind: 'drop' | 'deload';
  missed: number;
  fromStage: number;
  toStage: number;
  /** Weight after accepting - unchanged for a drop, reduced for a deload. */
  toWeight: number;
}

export interface SessionItem {
  id: string;
  /** The slot this item progresses, or null for an exercise swapped in for today. */
  slotId: string | null;
  /** For a swap, the slot it replaced. */
  replacedSlotId?: string;
  exerciseId: string;
  exerciseName: string;
  tier: Tier;
  track: Track;
  stage: number;
  weight: number;
  plannedWeight: number;
  sets: SetLog[];
  skipped: boolean;
  swapped: boolean;
  prompt?: Prompt;
  promptAnswer?: 'accepted' | 'stayed';
  /** Filled in when the session finishes. */
  outcome?: Outcome;
  nextWeight?: number;
  nextStage?: number;
}

export interface Session {
  id: string;
  variant: Variant;
  start: number;
  end?: number;
  status: 'active' | 'done';
  items: SessionItem[];
}
