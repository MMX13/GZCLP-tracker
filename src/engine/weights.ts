import type { PlateUnit, WeightMode } from './types';

export interface Combo {
  weight: number;
  plates: number;
  addons: number;
}

const EPS = 0.05;
const MAX_KG = 500;

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Format a weight for display - no trailing zeros, at most two decimals. */
export function fmt(n: number): string {
  return String(round2(n));
}

export const KG_PER_LB = 0.45359237;

/** Convert a plate size to kg. */
export function toKg(n: number, unit: PlateUnit = 'kg'): number {
  return unit === 'lb' ? n * KG_PER_LB : n;
}

const comboCache = new Map<string, Combo[]>();

/**
 * Every weight a plate machine can make from zero, as plates plus up to `maxAddons` add-ons.
 * Near-duplicates (within a third of an add-on, capped at 0.3 kg) are merged, keeping the
 * lighter value, which is usually the simpler setup.
 */
export function plateCombos(plate: number, addon: number, maxAddons: number, unit: PlateUnit = 'kg'): Combo[] {
  const key = `${plate}|${addon}|${maxAddons}|${unit}`;
  const cached = comboCache.get(key);
  if (cached) return cached;

  const raw: Combo[] = [];
  const p = plate > 0 ? toKg(plate, unit) : 0;
  const a = addon > 0 ? toKg(addon, unit) : 0;
  // Pound plates convert to awkward kg values, so round those to 0.1 kg for display.
  const round = unit === 'lb' ? (n: number) => Math.round(n * 10) / 10 : round2;
  const maxA = a > 0 ? Math.max(0, Math.floor(maxAddons)) : 0;
  const maxPlates = p > 0 ? Math.floor(MAX_KG / p) : 0;
  for (let n = 0; n <= maxPlates; n++) {
    for (let k = 0; k <= maxA; k++) {
      raw.push({ weight: round(n * p + k * a), plates: n, addons: k });
    }
  }
  raw.sort((x, y) => x.weight - y.weight || x.addons - y.addons);

  const tol = Math.min(0.3, a > 0 ? a / 3 : 0.3);
  const out: Combo[] = [];
  for (const c of raw) {
    const last = out[out.length - 1];
    if (last && c.weight - last.weight <= tol + 1e-9) continue;
    out.push(c);
  }
  comboCache.set(key, out);
  return out;
}

export function weightList(mode: WeightMode): number[] | null {
  if (mode.kind !== 'plates') return null;
  return plateCombos(mode.plate, mode.addon, mode.maxAddons, mode.unit).map((c) => c.weight);
}

/** The next weight up from `w`. */
export function nextWeight(mode: WeightMode, w: number): number {
  if (mode.kind === 'bodyweight') return 0;
  if (mode.kind === 'fixed') {
    return round2(w + (mode.increment > 0 ? mode.increment : 0));
  }
  const list = weightList(mode)!;
  const next = list.find((v) => v > w + EPS);
  return next ?? w;
}

/** The next weight down from `w`, never below zero. */
export function prevWeight(mode: WeightMode, w: number): number {
  if (mode.kind === 'bodyweight') return 0;
  if (mode.kind === 'fixed') {
    return Math.max(0, round2(w - (mode.increment > 0 ? mode.increment : 0)));
  }
  const list = weightList(mode)!;
  let prev = 0;
  for (const v of list) {
    if (v < w - EPS) prev = v;
    else break;
  }
  return prev;
}

/** The heaviest achievable weight at or below `target`. */
export function floorWeight(mode: WeightMode, target: number): number {
  if (target <= 0 || mode.kind === 'bodyweight') return 0;
  if (mode.kind === 'fixed') {
    const inc = mode.increment;
    if (!(inc > 0)) return round2(target);
    return round2(Math.floor(target / inc + 1e-9) * inc);
  }
  const list = weightList(mode)!;
  let best = 0;
  for (const v of list) {
    if (v <= target + 1e-9) best = v;
    else break;
  }
  return best;
}

/** The achievable weight closest to `w`. Used when a typed weight needs to snap to a machine. */
export function snapWeight(mode: WeightMode, w: number): number {
  if (mode.kind === 'bodyweight') return 0;
  if (mode.kind === 'fixed') return round2(Math.max(0, w));
  const list = weightList(mode)!;
  let best = list[0] ?? 0;
  for (const v of list) if (Math.abs(v - w) < Math.abs(best - w)) best = v;
  return best;
}

/** How to load a plate machine for `w`, e.g. "6 plates + 1 add-on". Null for fixed-increment exercises. */
export function describeSetup(mode: WeightMode, w: number): string | null {
  if (mode.kind !== 'plates') return null;
  const combos = plateCombos(mode.plate, mode.addon, mode.maxAddons, mode.unit);
  let best: Combo | undefined;
  for (const c of combos) if (!best || Math.abs(c.weight - w) < Math.abs(best.weight - w)) best = c;
  if (!best) return null;
  const plates = `${best.plates} plate${best.plates === 1 ? '' : 's'}`;
  if (best.addons === 0) return plates;
  return `${plates} + ${best.addons} add-on${best.addons === 1 ? '' : 's'}`;
}

export function deloadWeight(mode: WeightMode, failed: number, pct: number): number {
  return floorWeight(mode, (failed * pct) / 100);
}
