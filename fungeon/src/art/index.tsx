// Fungeon art & audio. All art is inline SVG; all sound is synthesized.
import type { ArtKey, IntentKind } from '../engine/types';
import { ART_CSS } from './css';
import { CREATURES, Fallback } from './creatures';
import { Wrap } from './kit';
import { ILLUSTRATIONS } from './illustrations';
import { ICONS, INTENTS } from './icons';
import type { IconName } from './icons';
export { audio } from './audio';
export type { SfxName } from './audio';
export type { IconName } from './icons';

if (typeof document !== 'undefined' && !document.getElementById('fg-art-style')) {
  const el = document.createElement('style');
  el.id = 'fg-art-style';
  el.textContent = ART_CSS;
  document.head.appendChild(el);
}

export interface ArtProps { k: ArtKey; size?: number; className?: string }
/** Illustration for cards, keepsakes, brews, statuses, events. Square viewBox. */
export function Art({ k, size = 64, className }: ArtProps) {
  const Draw = ILLUSTRATIONS[k];
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={k} style={{ display: 'block', flex: 'none' }}>
      <Wrap>{Draw ? <Draw /> : <circle cx="50" cy="50" r="38" fill="#e8c9a0" />}</Wrap>
    </svg>
  );
}

export type CreatureState = 'idle' | 'hit' | 'attack' | 'dead';
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

function Creature({ id, size, state = 'idle', dir, label, className }: { id: string; size: number; state?: CreatureState; dir: 'l' | 'r'; label: string; className?: string }) {
  const Draw = CREATURES[id] ?? Fallback;
  const cls = `fg-art${state === 'hit' ? ' fg-art-hit' : state === 'attack' ? ` fg-art-attack-${dir}` : state === 'dead' ? ' fg-art-dead' : ''}${className ? ' ' + className : ''}`;
  const delay = `${-((Math.abs(hash(id)) % 30) / 10)}s`;
  const style = { ['--fg-d' as string]: delay, ['--fg-kb' as string]: dir === 'l' ? '8px' : '-8px' };
  return (
    <svg className={cls} width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label} style={style}>
      <Wrap><Draw /></Wrap>
    </svg>
  );
}
/** Enemy illustration by enemy id. `size` is the height in px. Faces left. */
export function EnemyArt({ id, size = 120, state = 'idle', className }: { id: string; size?: number; state?: CreatureState; className?: string }) {
  return <Creature id={id} size={size} state={state} dir="l" label={id} className={className} />;
}
/** Pip, the player character. Faces right. */
export function PlayerArt({ size = 120, state = 'idle', className }: { size?: number; state?: CreatureState; className?: string }) {
  return <Creature id="pip" size={size} state={state} dir="r" label="Pip" className={className} />;
}
export function IntentIcon({ kind, size = 28 }: { kind: IntentKind; size?: number }) {
  const Draw = INTENTS[kind];
  return <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={kind} style={{ display: 'block', flex: 'none' }}><Wrap>{Draw ? <Draw /> : null}</Wrap></svg>;
}
/** Small UI glyphs. */
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const Draw = ICONS[name];
  return <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={name} style={{ display: 'block', flex: 'none' }}><Wrap>{Draw ? <Draw /> : null}</Wrap></svg>;
}
