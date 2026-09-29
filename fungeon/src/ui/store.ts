// Persistence: current run save + player profile + settings. All storage access is guarded.
import { deserialize, serialize } from '../engine';
import type { RunState } from '../engine';

const RUN_KEY = 'fungeon.run.v1';
const PROFILE_KEY = 'fungeon.profile.v1';

export interface Settings {
  sfx: boolean;
  music: boolean;
  speed: 'normal' | 'fast';
  reduceMotion: boolean;
}
export interface Profile {
  /** Highest unlocked Blight level (0..10). */
  unlocked: number;
  stats: { runs: number; wins: number; bestFloor: number; kills: number; bestStreak: number; streak: number };
  seen: { cards: string[]; relics: string[]; potions: string[] };
  settings: Settings;
}

export function defaultProfile(): Profile {
  let reduce = false;
  try {
    reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch { /* ignore */ }
  return {
    unlocked: 0,
    stats: { runs: 0, wins: 0, bestFloor: 0, kills: 0, bestStreak: 0, streak: 0 },
    seen: { cards: [], relics: [], potions: [] },
    settings: { sfx: true, music: true, speed: 'normal', reduceMotion: reduce },
  };
}

export function loadProfile(): Profile {
  const d = defaultProfile();
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return d;
    const p = JSON.parse(raw) as Partial<Profile>;
    return {
      unlocked: Math.min(10, Math.max(0, Number(p.unlocked) || 0)),
      stats: { ...d.stats, ...(p.stats ?? {}) },
      seen: {
        cards: Array.isArray(p.seen?.cards) ? p.seen!.cards : [],
        relics: Array.isArray(p.seen?.relics) ? p.seen!.relics : [],
        potions: Array.isArray(p.seen?.potions) ? p.seen!.potions : [],
      },
      settings: { ...d.settings, ...(p.settings ?? {}) },
    };
  } catch {
    return d;
  }
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch { /* ignore */ }
}

export function loadRun(): RunState | null {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    if (!raw) return null;
    return deserialize(raw);
  } catch {
    return null;
  }
}

export function saveRun(run: RunState): void {
  try {
    localStorage.setItem(RUN_KEY, serialize(run));
  } catch { /* ignore */ }
}

export function clearRun(): void {
  try {
    localStorage.removeItem(RUN_KEY);
  } catch { /* ignore */ }
}

export const ACT_NAMES = ['', 'Mossy Hollow', 'Glowcap Caverns', 'The Blight'];
export const BLIGHT_TEXT = [
  'The standard hike.',
  'Elites are more common.',
  'Normal enemies +10% HP.',
  'Elites +10% HP.',
  'Bosses +10% HP and damage.',
  'Rest heals only 25%.',
  'Start with a Mildew.',
  'Normal enemies hit 10% harder.',
  'Fewer acorns (-25%).',
  'Start at 90% HP.',
  'The final boss gets an extra buff.',
];
