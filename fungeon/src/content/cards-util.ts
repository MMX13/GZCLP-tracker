import type { Api } from '../engine/types';

/** Hit a random living enemy `times` times (re-rolls the target each hit). */
export function hitRandom(api: Api, dmg: number, times = 1): void {
  for (let i = 0; i < times; i++) {
    const e = api.randomEnemy();
    if (!e) return;
    api.attack(e.uid, dmg);
  }
}

/** Pick n distinct items using the combat rng. */
export function pickN<T>(arr: T[], n: number, rng: () => number): T[] {
  const pool = arr.slice();
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}
