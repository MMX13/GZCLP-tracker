// Small helpers shared by the enemy definition files.
import { PLAYER } from '../engine/types';
import type { Api, EnemyAiCtx, EnemyMove, EnemyState, IntentKind } from '../engine/types';

type Extra = (api: Api, self: EnemyState) => void;

/** Attack move: `hits` attacks of `dmg` (through api.attack so modifiers apply), then an optional extra effect. */
export function atk(name: string, dmg: number, hits = 1, extra?: Extra, intents?: IntentKind[]): EnemyMove {
  return {
    name,
    intents: intents ?? (extra ? ['attack', 'debuff'] : ['attack']),
    dmg,
    hits,
    run(api, self) {
      for (let i = 0; i < hits; i++) api.attack(PLAYER, dmg);
      extra?.(api, self);
    },
  };
}

/** Block move (optionally with a side effect). */
export function blk(name: string, amount: number, extra?: Extra): EnemyMove {
  return {
    name,
    intents: extra ? ['block', 'buff'] : ['block'],
    run(api, self) {
      api.gainBlock(amount, false);
      extra?.(api, self);
    },
  };
}

/** Non-damaging move. */
export function fx(name: string, intents: IntentKind[], run: Extra): EnemyMove {
  return { name, intents, run };
}

/** Deterministic rhythm: repeats `seq` by number of moves already made. */
export function cyc(ctx: EnemyAiCtx, seq: string[]): string {
  return seq[ctx.history.length % seq.length];
}

/** Spawn up to n copies of an enemy, never exceeding 5 enemies on screen. */
export function summon(api: Api, id: string, n: number): void {
  for (let i = 0; i < n; i++) {
    if (api.enemies().length >= 5) return;
    api.spawnEnemy(id, 'right');
  }
}

/** Is `self` the first living enemy with this id (used to give twin enemies different roles)? */
export function isFirstOfKind(ctx: EnemyAiCtx): boolean {
  const first = ctx.combat.enemies.find((e) => e.alive && e.id === ctx.self.id);
  return !first || first.uid === ctx.self.uid;
}

/** True once (per enemy) when hp has dropped to `frac` of max. Sets self.mem[flag]. */
export function crossed(api: Api, flag: string, frac = 0.5): EnemyState | null {
  const s = api.enemy(api.self);
  if (!s || s.hp <= 0 || s.mem[flag]) return null;
  if (s.hp > s.maxHp * frac) return null;
  s.mem[flag] = 1;
  return s;
}
