// Art & audio contract (STUB - the art agent replaces this with real components).
import type { ArtKey, IntentKind } from '../engine/types';

export interface ArtProps { k: ArtKey; size?: number; className?: string }
/** Illustration for cards, keepsakes, brews, statuses, events. Square viewBox. */
export function Art({ k, size = 64, className }: ArtProps) {
  return <svg className={className} width={size} height={size} viewBox="0 0 100 100" aria-label={k}><circle cx="50" cy="50" r="40" fill="#e8c9a0" /></svg>;
}

export type CreatureState = 'idle' | 'hit' | 'attack' | 'dead';
/** Enemy illustration by enemy id. `size` is the height in px. */
export function EnemyArt({ id, size = 120 }: { id: string; size?: number; state?: CreatureState }) {
  return <svg width={size} height={size} viewBox="0 0 100 100" aria-label={id}><circle cx="50" cy="60" r="35" fill="#7b4a9e" /></svg>;
}
/** Pip, the player character. */
export function PlayerArt({ size = 120 }: { size?: number; state?: CreatureState }) {
  return <svg width={size} height={size} viewBox="0 0 100 100" aria-label="Pip"><circle cx="50" cy="45" r="35" fill="#fff4e0" /></svg>;
}
export function IntentIcon({ kind, size = 28 }: { kind: IntentKind; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 100 100" aria-label={kind}><rect width="100" height="100" fill="#d9534f" /></svg>;
}
/** Small UI glyphs. */
export type IconName = 'spore' | 'nutrient' | 'heart' | 'block' | 'acorn' | 'deck' | 'discard' | 'compost' | 'map' | 'settings' | 'sound-on' | 'sound-off' | 'close' | 'check' | 'arrow' | 'fight' | 'elite' | 'rest' | 'shop' | 'event' | 'treasure' | 'boss' | 'potion-slot' | 'skull' | 'star';
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 100 100" aria-label={name}><circle cx="50" cy="50" r="45" fill="#f2c14e" /></svg>;
}

export type SfxName = 'click' | 'card' | 'draw' | 'shuffle' | 'hit' | 'bigHit' | 'block' | 'blockBreak' | 'buff' | 'debuff' | 'rot' | 'heal' | 'coin' | 'plant' | 'grow' | 'bloom' | 'compost' | 'victory' | 'defeat' | 'enemyDie' | 'turn' | 'error' | 'potion' | 'relic' | 'upgrade' | 'select' | 'nodeSelect';
export const audio = {
  play(_name: SfxName) {},
  setSfx(_on: boolean) {},
  setMusic(_on: boolean) {},
  /** Must be called from a user gesture once to unlock audio on iOS. */
  unlock() {},
  /** Background music mood. */
  music(_mood: 'menu' | 'map' | 'combat' | 'boss' | 'none') {},
};
