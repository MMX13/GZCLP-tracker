// Deterministic seeded RNG (mulberry32) with independent streams stored as uint32 state inside RunState.
import type { RunState } from './types';

export type StreamName = keyof RunState['rng'];
export const STREAM_NAMES: StreamName[] = ['map', 'combat', 'rewards', 'shop', 'events', 'misc'];

/** Hash a string to a uint32 (FNV-1a + avalanche). */
export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function initStreams(seed: string): RunState['rng'] {
  const out = {} as RunState['rng'];
  for (const n of STREAM_NAMES) out[n] = hashString(`${seed}|${n}`);
  return out;
}

/** A function that returns floats in [0,1) and advances run.rng[name] in place. */
export function stream(run: RunState, name: StreamName): () => number {
  const st = run.rng;
  return () => {
    const a = (st[name] + 0x6d2b79f5) >>> 0;
    st[name] = a;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random integer in [lo, hi] inclusive. */
export function randInt(rng: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** In-place Fisher-Yates. Returns the same array. */
export function shuffle<T>(rng: () => number, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

/** Weighted pick; items with weight <= 0 are never chosen. Returns undefined for an empty / zero-weight list. */
export function weightedPick<T>(rng: () => number, items: readonly T[], weight: (t: T) => number): T | undefined {
  let total = 0;
  for (const it of items) total += Math.max(0, weight(it));
  if (total <= 0) return undefined;
  let r = rng() * total;
  for (const it of items) {
    const w = Math.max(0, weight(it));
    if (w <= 0) continue;
    r -= w;
    if (r < 0) return it;
  }
  for (let i = items.length - 1; i >= 0; i--) if (weight(items[i]) > 0) return items[i];
  return undefined;
}

/** Random uppercase seed string (only used when the caller does not supply one). */
export function randomSeed(len = 6): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let s = '';
  for (let i = 0; i < len; i++) s += letters[Math.floor(Math.random() * letters.length)];
  return s;
}
