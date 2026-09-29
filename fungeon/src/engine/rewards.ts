// Rewards, random picks (cards / relics / potions) and the end-of-combat transition.
import type { CardInstance, GameEvent, PotionDef, Rarity, RelicDef, RelicRarity, Reward, RunState } from './types';
import { allPotions, allRelics, pipCards } from './registry';
import { findRelic } from './registry';
import { randInt, stream, weightedPick } from './rng';
import { Battle, passiveSum, safe } from './combat';

export const BASE_POTION_SLOTS = 3;

// ---------------------------------------------------------------------------------------------------------------
// Relics

export function relicRarityRoll(rng: () => number): 'common' | 'uncommon' | 'rare' {
  const r = rng() * 100;
  return r < 50 ? 'common' : r < 85 ? 'uncommon' : 'rare';
}

/** Random relic not yet owned. Falls back to other rarities when a pool is empty. Returns '' if nothing is left. */
export function randomRelicId(run: RunState, rng: () => number, rarity?: RelicRarity, exclude: string[] = []): string {
  const owned = new Set([...run.relics.map((r) => r.id), ...exclude]);
  const want: RelicRarity = rarity ?? relicRarityRoll(rng);
  const pool = (r: RelicRarity) => allRelics().filter((d) => d.rarity === r && !owned.has(d.id));
  const ladder: RelicRarity[] =
    want === 'boss' ? ['boss'] : [want, ...(['common', 'uncommon', 'rare'] as RelicRarity[]).filter((r) => r !== want)];
  for (const r of ladder) {
    const p = pool(r);
    if (p.length) return p[Math.floor(rng() * p.length)].id;
  }
  return '';
}

/** Adds a relic to the run: onPickup, potion slots, event. */
export function grantRelic(run: RunState, id: string, ev?: GameEvent[]): void {
  const d: RelicDef | undefined = findRelic(id);
  if (!d) return;
  run.relics.push({ id, counter: 0 });
  if (d.onPickup) safe(`relic ${id}.onPickup`, () => d.onPickup!(run));
  run.maxHp = Math.max(1, run.maxHp);
  run.hp = Math.min(run.hp, run.maxHp);
  const slots = BASE_POTION_SLOTS + passiveSum(run, 'potionSlots');
  while (run.potions.length < slots) run.potions.push(null);
  ev?.push({ t: 'relic', id });
}

// ---------------------------------------------------------------------------------------------------------------
// Potions

export function randomPotionId(rng: () => number): string {
  const ps = allPotions();
  const p: PotionDef | undefined = weightedPick(rng, ps, (d) => (d.rarity === 'common' ? 65 : d.rarity === 'uncommon' ? 25 : 10));
  return p?.id ?? '';
}

/** Put a potion into the first free slot. */
export function grantPotion(run: RunState, id: string, ev?: GameEvent[]): boolean {
  const i = run.potions.indexOf(null);
  if (i < 0 || !id) return false;
  run.potions[i] = id;
  ev?.push({ t: 'potion', id });
  return true;
}

// ---------------------------------------------------------------------------------------------------------------
// Cards

const RATES = {
  normal: { common: 60, uncommon: 34, rare: 6 },
  elite: { common: 45, uncommon: 42, rare: 13 },
  boss: { common: 0, uncommon: 0, rare: 100 },
} as const;
const UPGRADE_CHANCE = [0, 0, 0.15, 0.3];

/** Random Pip card id, rarity given or rolled 60/34/6. */
export function randomCardId(rng: () => number, rarity?: Rarity, exclude: string[] = []): string {
  let want: 'common' | 'uncommon' | 'rare';
  if (rarity === 'common' || rarity === 'uncommon' || rarity === 'rare') want = rarity;
  else {
    const r = rng() * 100;
    want = r < 60 ? 'common' : r < 94 ? 'uncommon' : 'rare';
  }
  const order = [want, ...(['common', 'uncommon', 'rare'] as const).filter((x) => x !== want)];
  for (const r of order) {
    const pool = pipCards(r).filter((d) => !exclude.includes(d.id));
    if (pool.length) return pool[Math.floor(rng() * pool.length)].id;
  }
  return '';
}

/** Card reward options (with rarity odds, rare pity and upgrade chance). */
export function rollCardReward(run: RunState, kind: 'normal' | 'elite' | 'boss', rng: () => number): CardInstance[] {
  const rates = RATES[kind];
  const choices = 3 + passiveSum(run, 'cardRewardChoices');
  const out: CardInstance[] = [];
  const upg = UPGRADE_CHANCE[run.act] ?? 0;
  for (let i = 0; i < choices; i++) {
    let rarity: 'common' | 'uncommon' | 'rare';
    if (kind === 'boss') rarity = 'rare';
    else {
      const rareP = Math.min(100, rates.rare + run.rareOffset);
      const rest = 100 - rareP;
      const uncP = (rates.uncommon / (rates.common + rates.uncommon)) * rest;
      const r = rng() * 100;
      rarity = r < rareP ? 'rare' : r < rareP + uncP ? 'uncommon' : 'common';
      if (rarity === 'rare') run.rareOffset = 0;
      else run.rareOffset += 1;
    }
    const id = randomCardId(rng, rarity, out.map((c) => c.id));
    if (!id) break;
    out.push({ uid: run.nextUid++, id, upgraded: rng() < upg });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Combat rewards

export function goldFor(run: RunState, kind: 'normal' | 'elite' | 'boss', rng: () => number): number {
  let g = kind === 'normal' ? randInt(rng, 12, 20) : kind === 'elite' ? randInt(rng, 28, 38) : 90;
  if (run.ascension >= 8) g = Math.floor(g * 0.75);
  return g;
}

export function makeCombatRewards(run: RunState, kind: 'normal' | 'elite' | 'boss'): Reward[] {
  const rng = stream(run, 'rewards');
  const rewards: Reward[] = [{ kind: 'gold', amount: goldFor(run, kind, rng) }];
  const options = rollCardReward(run, kind, rng);
  if (options.length) rewards.push({ kind: 'card', options });
  if (kind === 'elite') {
    const id = randomRelicId(run, rng);
    if (id) rewards.push({ kind: 'relic', id });
  }
  if (kind !== 'boss') {
    // potion drop: 40% base, -10% on drop, +10% on no drop
    if (rng() * 100 < run.potionChance) {
      const id = randomPotionId(rng);
      if (id) rewards.push({ kind: 'potion', id });
      run.potionChance = Math.max(0, run.potionChance - 10);
    } else {
      run.potionChance = Math.min(100, run.potionChance + 10);
    }
  }
  return rewards;
}

/** Called whenever a combat left phase 'player': moves the run to defeat / victory / reward screens. */
export function finishCombat(run: RunState, b: Battle, ev: GameEvent[]): void {
  const c = b.c;
  if (c.phase === 'lost') {
    run.hp = 0;
    run.screen = { kind: 'defeat', cause: b.cause || 'Unknown' };
    ev.push({ t: 'defeat' });
    return;
  }
  if (c.phase !== 'won') return;
  run.hp = Math.max(1, Math.min(c.player.hp, c.player.maxHp));
  run.maxHp = c.player.maxHp;
  if (c.kind === 'boss' && run.act === 3) {
    run.screen = { kind: 'victory' };
    ev.push({ t: 'victory' });
    return;
  }
  const title = c.kind === 'boss' ? 'Boss defeated!' : c.kind === 'elite' ? 'Elite defeated!' : 'Victory!';
  run.screen = { kind: 'reward', rewards: makeCombatRewards(run, c.kind), title };
}
