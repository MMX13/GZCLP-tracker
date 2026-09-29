import type { ReactElement } from 'react';
import { Hl, Ln, Spark, Dot, P, INK } from './kit';
import { ILLUSTRATIONS as I } from './illustrations';

export type IconName = 'spore' | 'nutrient' | 'heart' | 'block' | 'acorn' | 'deck' | 'discard' | 'compost' | 'map' | 'settings' | 'sound-on' | 'sound-off' | 'close' | 'check' | 'arrow' | 'fight' | 'elite' | 'rest' | 'shop' | 'event' | 'treasure' | 'boss' | 'potion-slot' | 'skull' | 'star';
type F = () => ReactElement;
const W = '#fff';
const Sword = ({ r = 0, c = '#e4e8ee' }: { r?: number; c?: string }) => (
  <g transform={`rotate(${r} 50 50)`}>
    <path d="M50 4 L60 16 V60 H40 V16Z" fill={c} /><Ln d="M50 12 V56" w={2.5} c="#9aa3b0" />
    <rect x="28" y="60" width="44" height="10" rx="5" fill={P.gold} /><rect x="44" y="70" width="12" height="18" rx="4" fill="#a9744a" /><circle cx="50" cy="92" r="5" fill={P.gold} strokeWidth={3} />
  </g>
);
const Gear = () => {
  let d = '';
  for (let i = 0; i < 16; i++) { const a = (Math.PI * i) / 8, r = i % 2 ? 30 : 42, aa = a - Math.PI / 16; d += `${i ? 'L' : 'M'}${(50 + Math.cos(aa) * r).toFixed(1)} ${(50 + Math.sin(aa) * r).toFixed(1)}`; }
  return <><path d={d + 'Z'} fill="#b9b5a8" /><circle cx="50" cy="50" r="30" fill="#b9b5a8" strokeWidth={0} /><circle cx="50" cy="50" r="12" fill="#1f1a14" /><Hl x={34} y={30} rx={8} ry={3} r={-40} /></>;
};
const Speaker = () => (<><path d="M14 38 h16 l22 -18 v60 l-22 -18 h-16z" fill={P.gold} /><Hl x={26} y={42} rx={5} ry={2.5} r={0} /></>);

export const ICONS: Record<IconName, F> = {
  spore: () => (<><circle cx="50" cy="50" r="42" fill={P.gold} /><circle cx="50" cy="50" r="27" fill="#ffe28a" strokeWidth={0} /><Hl x={35} y={32} rx={12} ry={6} r={-35} o={0.8} /><Dot x={62} y={66} r={4} c="#fff" o={0.8} /></>),
  nutrient: () => (<><path d="M50 6 L86 36 L74 88 L26 88 L14 36Z" fill="#7bc24a" strokeLinejoin="round" /><path d="M50 78 C38 56 40 36 56 26 C60 46 60 62 50 78Z" fill="#dff5b0" strokeWidth={3} /><Ln d="M50 78 L52 40" w={2.2} /><Hl x={30} y={34} rx={8} ry={3} r={-40} o={0.6} /></>),
  heart: () => (<><path d="M50 90 C8 60 4 30 26 18 C40 12 50 22 50 32 C50 22 60 12 74 18 C96 30 92 60 50 90Z" fill={P.red} /><Hl x={30} y={32} rx={9} ry={5} r={-40} o={0.7} /></>),
  block: () => (<><path d="M50 8 L86 20 C86 56 74 78 50 92 C26 78 14 56 14 20Z" fill="#6aa5d8" /><path d="M50 8 L86 20 C86 56 74 78 50 92Z" fill="#4f88c0" strokeWidth={0} /><path d="M50 8 L86 20 C86 56 74 78 50 92 C26 78 14 56 14 20Z" fill="none" /><Hl x={30} y={28} rx={8} ry={4} r={-40} o={0.6} /></>),
  acorn: () => (I.acorn as F)(),
  deck: () => (<><rect x="26" y="10" width="52" height="70" rx="8" fill={P.beige} transform="rotate(10 50 50)" /><rect x="20" y="16" width="52" height="70" rx="8" fill={P.moss} transform="rotate(-4 50 50)" /><circle cx="46" cy="52" r="14" fill={P.cream} strokeWidth={3} /><Ln d="M46 42 v20 M36 52 h20" w={0.01} /><path d="M36 52 Q46 34 56 52Z" fill={P.red} strokeWidth={3} /></>),
  discard: () => (<><rect x="18" y="10" width="54" height="60" rx="8" fill={P.beige} transform="rotate(-8 50 40)" /><path d="M14 58 h72 l-8 32 h-56z" fill="#8a5a3a" /><Ln d="M50 24 v30 M38 42 l12 12 l12 -12" w={7} c={INK} /><Ln d="M50 24 v30 M38 42 l12 12 l12 -12" w={3} c={W} /></>),
  compost: () => (<><path d="M8 90 C8 60 28 48 50 48 C72 48 92 60 92 90Z" fill="#5c3d28" /><Ln d="M50 48 V28" w={4} c={P.moss} /><path d="M50 34 C30 32 30 12 50 8 C60 22 60 28 50 34Z" fill="#7bc24a" /><Dot x={30} y={72} r={4} c="#8a5a3a" /><Dot x={66} y={68} r={5} c="#8a5a3a" /><Ln d="M74 30 q6 -6 12 0 M80 22 l6 8 l-8 2" w={4} c={P.lime} /></>),
  map: () => (I.map as F)(),
  settings: Gear,
  'sound-on': () => (<><Speaker /><Ln d="M64 36 Q74 50 64 64 M74 26 Q92 50 74 74" w={6} c={INK} /><Ln d="M64 36 Q74 50 64 64 M74 26 Q92 50 74 74" w={2.5} c={P.gold} /></>),
  'sound-off': () => (<><Speaker /><Ln d="M66 38 L90 62 M90 38 L66 62" w={9} c={INK} /><Ln d="M66 38 L90 62 M90 38 L66 62" w={4} c={P.red} /></>),
  close: () => (<><Ln d="M22 22 L78 78 M78 22 L22 78" w={20} c={INK} /><Ln d="M22 22 L78 78 M78 22 L22 78" w={11} c={W} /></>),
  check: () => (<><Ln d="M18 54 L40 76 L84 26" w={22} c={INK} /><Ln d="M18 54 L40 76 L84 26" w={12} c="#7bc24a" /></>),
  arrow: () => (<><path d="M10 38 h44 v-22 l38 34 l-38 34 v-22 h-44z" fill={P.gold} /><Hl x={30} y={42} rx={10} ry={2.5} o={0.6} /></>),
  fight: () => (<><Sword r={-45} /><Sword r={45} c="#cfd6e2" /></>),
  elite: () => (<><path d="M14 46 C14 16 86 16 86 46 V76 H14Z" fill={P.dpurple} /><path d="M18 40 C6 30 4 14 12 6 C14 20 22 26 30 28Z M82 40 C94 30 96 14 88 6 C86 20 78 26 70 28Z" fill={P.beige} /><path d="M26 46 h48 v12 h-48z" fill="#1f1a14" strokeWidth={3} /><circle cx="38" cy="52" r="4" fill="#ff7a5c" stroke="none" /><circle cx="62" cy="52" r="4" fill="#ff7a5c" stroke="none" /><Ln d="M14 76 h72" w={5} c={P.gold} /><Hl x={38} y={28} rx={9} ry={3} r={-20} o={0.4} /></>),
  rest: () => (I.campfire as F)(),
  shop: () => (<><rect x="14" y="44" width="72" height="46" rx="4" fill="#b9855a" /><path d="M8 44 L16 14 h68 l8 30Z" fill={P.red} /><path d="M8 44 Q19 58 30 44 Q41 58 50 44 Q59 58 70 44 Q81 58 92 44" fill={P.cream} strokeWidth={3.5} /><circle cx="50" cy="72" r="12" fill={P.gold} strokeWidth={3} /><Ln d="M50 66 v12" w={3} /></>),
  event: () => (<><path d="M12 20 Q12 8 24 8 h52 Q88 8 88 20 v40 Q88 72 76 72 H50 L30 92 V72 h-6 Q12 72 12 60Z" fill={P.cream} /><Ln d="M40 30 C38 16 62 16 60 30 C59 40 50 40 50 50" w={9} c={INK} /><Ln d="M40 30 C38 16 62 16 60 30 C59 40 50 40 50 50" w={4} c={P.purple} /><circle cx="50" cy="60" r="4.5" fill={P.purple} stroke="none" /></>),
  treasure: () => (I.chest as F)(),
  boss: () => (<><path d="M16 88 C6 50 22 34 50 34 C78 34 94 50 84 88Z" fill="#e8dcc8" strokeWidth={0} /><path d="M16 60 C10 30 90 30 84 60 C84 70 76 74 72 76 V90 H28 V76 C24 74 16 70 16 60Z" fill={P.cream} /><ellipse cx="37" cy="60" rx="9" ry="10" fill={INK} stroke="none" /><ellipse cx="63" cy="60" rx="9" ry="10" fill={INK} stroke="none" /><Ln d="M40 90 v-8 M50 90 v-8 M60 90 v-8" w={3} /><path d="M20 36 L18 8 L36 24 L50 4 L64 24 L82 8 L80 36Z" fill={P.gold} /><circle cx="50" cy="26" r="4" fill={P.red} strokeWidth={2.5} /></>),
  'potion-slot': () => (<><path d="M40 12 h20 M42 12 v20 L20 78 Q14 90 28 90 H72 Q86 90 80 78 L58 32 V12" fill="none" strokeWidth={5} strokeDasharray="8 8" stroke={P.beige} /><Ln d="M50 46 v28 M36 60 h28" w={6} c={P.beige} /></>),
  skull: () => (I.skull as F)(),
  star: () => (<><path d="M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36Z" fill={P.gold} /><Hl x={40} y={32} rx={6} ry={3} r={-50} o={0.8} /></>),
};

const Zz = ({ x, y, s, o = 1 }: { x: number; y: number; s: number; o?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}><path d="M0 0 h30 l-30 34 h32" fill="none" strokeWidth={16} stroke={INK} /><path d="M0 0 h30 l-30 34 h32" fill="none" strokeWidth={8} stroke="#bfe0ff" /></g>
);
export const INTENTS: Record<string, F> = {
  attack: () => (<><Sword r={45} c="#f2f5fa" /><Spark x={16} y={18} s={9} c={P.gold} /></>),
  block: () => (<><path d="M50 6 L88 18 C88 56 76 80 50 94 C24 80 12 56 12 18Z" fill="#6aa5d8" /><path d="M50 6 L88 18 C88 56 76 80 50 94Z" fill="#4f88c0" strokeWidth={0} /><path d="M50 6 L88 18 C88 56 76 80 50 94 C24 80 12 56 12 18Z" fill="none" /><path d="M26 44 C26 26 74 26 74 44Z" fill={P.red} strokeWidth={3} /><Hl x={30} y={30} rx={8} ry={4} r={-40} o={0.6} /></>),
  buff: () => (<><path d="M50 6 L86 46 H66 V90 H34 V46 H14Z" fill="#7bc24a" /><Hl x={38} y={40} rx={10} ry={3} r={-30} o={0.5} /><Spark x={84} y={20} s={10} c={P.gold} /><Spark x={16} y={78} s={7} c={P.gold} /></>),
  debuff: () => (<><circle cx="50" cy="46" r="38" fill={P.purple} /><path d="M50 46 m0 -4 a4 4 0 1 1 -4 4 a12 12 0 1 1 12 12 a22 22 0 1 1 -22 -22 a30 30 0 1 1 30 30" fill="none" strokeWidth={6} stroke="#d8b8f0" /><path d="M44 80 q-4 12 2 16 q6 -4 -2 -16z" fill={P.purple} strokeWidth={3} /><path d="M70 78 q-3 8 2 11 q4 -4 -2 -11z" fill={P.purple} strokeWidth={3} /></>),
  summon: () => (<><ellipse cx="50" cy="78" rx="38" ry="14" fill="#b48ad0" /><ellipse cx="50" cy="78" rx="24" ry="7" fill="#4b2c66" strokeWidth={0} /><path d="M32 74 C32 40 68 40 68 74Z" fill={P.red} /><circle cx="46" cy="56" r="4.5" fill={P.cream} strokeWidth={2.5} /><circle cx="60" cy="64" r="3.5" fill={P.cream} strokeWidth={2.5} /><Spark x={14} y={30} s={9} c={P.lpurple} /><Spark x={86} y={22} s={9} c={P.lpurple} /><Spark x={50} y={16} s={7} c={P.gold} /></>),
  sleep: () => (<><Zz x={12} y={40} s={1.3} /><Zz x={54} y={8} s={0.85} /></>),
  unknown: () => (<><path d="M28 34 C26 2 78 2 74 34 C72 52 50 52 50 68" fill="none" strokeWidth={22} stroke={INK} /><path d="M28 34 C26 2 78 2 74 34 C72 52 50 52 50 68" fill="none" strokeWidth={12} stroke="#e8c9a0" /><circle cx="50" cy="86" r="10" fill="#e8c9a0" strokeWidth={4} /></>),
  escape: () => (<><circle cx="72" cy="70" r="16" fill="#e8dcc8" /><circle cx="50" cy="78" r="14" fill="#f2e8d4" /><circle cx="90" cy="84" r="9" fill="#e8dcc8" /><Ln d="M10 30 h44 M2 48 h36 M18 64 h24" w={9} c={INK} /><Ln d="M10 30 h44 M2 48 h36 M18 64 h24" w={4.5} c={W} /><path d="M56 14 L94 40 L56 56Z" fill={P.gold} /></>),
};
