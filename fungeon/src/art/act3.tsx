import { Eye, Cheek, Hl, Ln, Smile, Spark, Dot, Shadow, P, INK } from './kit';

export function MoldPuff() {
  return (<>
    <Shadow rx={32} />
    <path d="M12 60 C6 24 30 8 52 10 C78 10 96 30 88 62 C84 72 16 74 12 60Z" fill="#9a8fb0" />
    <circle cx="30" cy="30" r="9" fill={P.sick} strokeWidth={2.5} /><circle cx="70" cy="24" r="7" fill={P.sick} strokeWidth={2.5} /><circle cx="78" cy="52" r="8" fill="#6d8a3a" strokeWidth={2.5} /><circle cx="52" cy="20" r="4" fill="#6d8a3a" strokeWidth={2} />
    <Hl x={40} y={22} rx={8} ry={3} r={-25} />
    <path d="M28 72 Q26 92 50 92 Q74 92 72 72Z" fill="#cfc4dc" />
    <Ln d="M30 66 Q50 74 70 66" w={2.5} />
    <Eye x={40} y={66} r={5.5} /><Eye x={58} y={66} r={5.5} />
    <Ln d="M33 58 l10 4 M65 58 l-10 4" w={3} />
    <path d="M42 80 Q50 74 58 80" fill="none" strokeWidth={2.5} />
    <Dot x={14} y={28} r={4} c={P.sick} o={0.8} /><Dot x={8} y={40} r={2.5} c={P.sick} o={0.8} /><Dot x={90} y={18} r={3} c={P.sick} o={0.8} />
  </>);
}

export function RotRat() {
  return (<>
    <Shadow rx={38} />
    <Ln d="M84 82 Q104 76 98 56 Q94 48 88 54" w={4} c={INK} /><Ln d="M84 82 Q104 76 98 56 Q94 48 88 54" w={1.8} c="#c9a5a0" />
    <path d="M22 90 C12 64 32 40 56 42 C84 44 96 70 88 90Z" fill="#8a9a70" />
    <path d="M34 90 C40 76 60 74 80 90Z" fill="#c8d0a8" strokeWidth={0} />
    <Ln d="M60 50 l4 8 M74 56 l-2 8" w={2.5} c="#5f6e48" />
    <Hl x={60} y={52} rx={9} ry={3} r={-10} />
    <circle cx="44" cy="40" r="12" fill="#8a9a70" /><circle cx="60" cy="36" r="12" fill="#8a9a70" />
    <circle cx="44" cy="40" r="6" fill={P.pink} stroke="none" /><circle cx="60" cy="36" r="6" fill={P.pink} stroke="none" />
    <path d="M6 66 L26 54 L40 74 Q26 80 12 76Z" fill="#a3b088" />
    <circle cx="6" cy="66" r="4.5" fill={INK} stroke="none" />
    <Eye x={26} y={62} r={5} />
    <Ln d="M28 50 l8 3" w={3} />
    <path d="M20 76 l0 8 l7 0 l-1 -8z" fill="#fff" strokeWidth={2} />
    <Ln d="M40 20 q-4 -6 0 -10 M50 22 q-4 -6 0 -10" w={2.5} c={P.sick} />
    <Ln d="M40 92 l-4 4 M70 92 l4 4" w={3.5} />
  </>);
}

export function BlightedSprout() {
  return (<>
    <Shadow rx={28} />
    <Ln d="M20 92 Q8 84 12 70 M80 92 Q94 84 90 70" w={4} c={P.dpurple} />
    <ellipse cx="40" cy="90" rx="9" ry="5" fill="#c4b0d0" /><ellipse cx="62" cy="90" rx="9" ry="5" fill="#c4b0d0" />
    <path d="M28 54 Q23 91 50 91 Q77 91 72 54Z" fill="#c4b0d0" />
    <Ln d="M36 66 q-4 10 2 20 M64 70 q4 8 -2 16" w={2.2} c={P.purple} />
    <path d="M10 54 Q8 12 50 12 Q92 12 90 54 Q90 60 80 60 L20 60 Q10 60 10 54Z" fill={P.purple} />
    <Ln d="M20 60 Q50 66 80 60" w={2.5} />
    <ellipse cx="32" cy="26" rx="9" ry="4" fill="#fff" opacity="0.3" transform="rotate(-25 32 26)" stroke="none" />
    <circle cx="66" cy="28" r="6" fill={P.sick} strokeWidth={2.5} /><circle cx="76" cy="46" r="4.5" fill={P.sick} strokeWidth={2.5} /><circle cx="42" cy="44" r="5" fill={P.sick} strokeWidth={2.5} /><circle cx="22" cy="46" r="3.5" fill={P.sick} strokeWidth={2.5} />
    <path d="M56 12 q4 -12 12 -8 q-2 8 -12 8z" fill={P.deep} strokeWidth={2.5} />
    <circle cx="38" cy="72" r="7" fill="#e7ffa6" strokeWidth={2.5} /><circle cx="60" cy="72" r="7" fill="#e7ffa6" strokeWidth={2.5} />
    <circle cx="36" cy="73" r="3.4" fill={INK} stroke="none" /><circle cx="58" cy="73" r="3.4" fill={INK} stroke="none" />
    <Ln d="M30 64 l10 4 M68 64 l-10 4" w={3} />
    <Smile x={48} y={84} w={5} h={-3} />
  </>);
}

export function CarrionFly() {
  return (<>
    <Shadow rx={18} cy={92} />
    <ellipse cx="66" cy="28" rx="16" ry="9" fill="#d9f4ee" opacity="0.85" transform="rotate(-30 66 28)" strokeWidth={2.5} />
    <ellipse cx="50" cy="26" rx="15" ry="8" fill="#d9f4ee" opacity="0.85" transform="rotate(-55 50 26)" strokeWidth={2.5} />
    <Ln d="M42 74 l-6 14 M54 78 l0 12 M64 74 l8 14" w={3.5} />
    <ellipse cx="64" cy="58" rx="20" ry="16" fill="#3f8f7a" />
    <Ln d="M56 44 q5 14 0 28 M68 43 q5 15 0 30" w={2.5} c="#245a4c" />
    <Hl x={66} y={49} rx={8} ry={3} r={-10} />
    <circle cx="34" cy="56" r="17" fill="#4aa58b" />
    <circle cx="28" cy="52" r="10" fill="#d9534f" strokeWidth={2.5} /><Eye x={26} y={52} r={5} />
    <Hl x={40} y={46} rx={4} ry={2} r={-20} />
    <Ln d="M22 68 l-8 10 M22 68 l-2 8" w={3} /><Smile x={36} y={68} w={3} h={2} />
    <Ln d="M76 32 q4 -6 0 -10 M86 40 q4 -6 0 -10" w={2} c={P.sick} />
  </>);
}

export function CultistCap() {
  return (<>
    <Shadow rx={30} />
    {/* robe */}
    <path d="M22 92 L28 50 L72 50 L80 92Z" fill="#4b2c66" />
    <Ln d="M50 52 L50 92" w={2.5} c="#2b1840" /><Ln d="M22 92 L80 92" w={4} c={P.gold} />
    <Dot x={38} y={76} r={3} c={P.lpurple} /><Dot x={62} y={70} r={3} c={P.lpurple} />
    <Hl x={34} y={66} rx={3} ry={9} r={8} o={0.2} />
    {/* stem face */}
    <ellipse cx="50" cy="56" rx="17" ry="12" fill="#e9e6cc" />
    <path d="M12 46 Q10 6 50 6 Q90 6 88 46 Q88 52 78 52 L22 52 Q12 52 12 46Z" fill="#8fa05a" />
    <Ln d="M22 52 Q50 60 78 52" w={2.5} />
    <path d="M24 34 q6 -8 14 -4 q0 8 -8 8z M62 20 q8 -4 12 4 q-4 6 -12 2z" fill="#dfe6b4" strokeWidth={2.5} />
    <Hl x={34} y={16} rx={8} ry={3} r={-20} />
    <Ln d="M38 62 q4 -4 8 0 M56 62 q4 -4 8 0" w={2.5} />
    <ellipse cx="52" cy="68" rx="4" ry="3.5" fill="#6d3f55" strokeWidth={2.2} />
    {/* candle */}
    <rect x="84" y="56" width="8" height="24" rx="2" fill={P.cream} strokeWidth={3} />
    <path d="M88 54 q-6 -8 0 -16 q6 8 0 16z" fill={P.gold} strokeWidth={2.5} /><Ln d="M78 84 q10 6 20 0" w={3} />
    <circle cx="88" cy="46" r="10" fill={P.gold} opacity="0.25" stroke="none" />
  </>);
}

export function CordycepsKnight() {
  return (<>
    <Shadow rx={36} />
    {/* fungus stalks */}
    <Ln d="M26 34 Q18 20 22 6 M40 30 Q40 14 34 2 M52 30 Q58 16 60 6" w={4} c={INK} />
    <Ln d="M26 34 Q18 20 22 6 M40 30 Q40 14 34 2 M52 30 Q58 16 60 6" w={1.8} c="#f0a04a" />
    <ellipse cx="22" cy="6" rx="4.5" ry="6" fill="#f0a04a" strokeWidth={2.5} /><ellipse cx="34" cy="2" rx="4" ry="5.5" fill="#f0a04a" strokeWidth={2.5} /><ellipse cx="60" cy="6" rx="4.5" ry="6" fill="#f0a04a" strokeWidth={2.5} />
    <Ln d="M34 82 l-8 12 M50 84 l-2 10 M66 82 l4 12" w={5} />
    <path d="M78 46 C102 50 102 82 84 88 L58 86Z" fill="#4a4258" />
    <ellipse cx="54" cy="66" rx="24" ry="22" fill="#6a6480" />
    <path d="M36 56 L72 56 M34 68 L74 68" fill="none" stroke="#3a3448" strokeWidth={3} />
    <circle cx="54" cy="64" r="6" fill="#f0a04a" strokeWidth={2.5} /><Spark x={54} y={64} s={4} c="#fff2c8" />
    <Hl x={64} y={54} rx={7} ry={3} r={-20} />
    <circle cx="32" cy="46" r="17" fill="#7c7692" />
    <path d="M16 48 Q18 30 34 30 Q46 32 48 46 L40 50 Q30 46 16 52Z" fill="#a9a5bd" />
    <Ln d="M16 50 L40 52" w={3} />
    <circle cx="26" cy="60" r="1" fill="none" />
    <Eye x={26} y={58} r={4.5} /><circle cx="26" cy="58" r="8" fill="#f0a04a" opacity="0.35" stroke="none" />
    <Ln d="M12 62 Q4 62 2 72 M20 66 Q14 76 6 78" w={3.5} />
    <Ln d="M90 40 L94 6" w={4} c={INK} /><Ln d="M90 40 L94 6" w={1.6} c="#dcdcdc" />
  </>);
}

export function Morel() {
  const pits: [number, number][] = [[36, 20], [50, 16], [64, 22], [30, 34], [44, 32], [58, 34], [72, 36], [38, 46], [52, 46], [66, 48], [28, 50], [78, 50]];
  return (<>
    <Shadow rx={28} />
    <ellipse cx="38" cy="90" rx="9" ry="5" fill="#f0dcb8" /><ellipse cx="62" cy="90" rx="9" ry="5" fill="#f0dcb8" />
    <path d="M30 52 Q26 91 50 91 Q74 91 70 52Z" fill="#f0dcb8" />
    <Ln d="M28 62 Q50 72 72 62" w={5} c={INK} /><Ln d="M28 62 Q50 72 72 62" w={2.5} c={P.red} />
    <path d="M60 68 l12 22 l-10 -2z" fill={P.red} strokeWidth={2.5} />
    <path d="M22 54 C14 30 30 6 50 6 C72 6 86 30 78 54 Q50 62 22 54Z" fill="#a0713f" />
    {pits.map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx={5} ry={5.5} fill="#5c3d28" strokeWidth={0} />)}
    <Hl x={36} y={12} rx={7} ry={2.5} r={-30} />
    <path d="M6 76 q4 -8 14 -6 q2 10 -8 14 q-8 0 -6 -8z" fill={P.moss} />
    <Eye x={42} y={72} r={5.5} /><Eye x={58} y={72} r={5.5} />
    <Ln d="M35 63 l12 3 M65 63 l-12 3" w={3} /><path d="M46 80 Q54 84 60 78" fill="none" strokeWidth={2.5} />
    <Ln d="M84 40 L86 92" w={5} c={INK} /><Ln d="M84 40 L86 92" w={2.2} c="#a9744a" /><Ln d="M85 60 l8 -6" w={3} />
  </>);
}

function HydraHead({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M-14 26 C-20 6 -14 -16 0 -16 C16 -16 22 6 16 26Z" fill="#7d9e7a" />
      <Hl x={-4} y={-9} rx={6} ry={2.5} r={-20} />
      <circle cx="-6" cy="-2" r="5" fill="#fff" strokeWidth={2} /><circle cx="-7" cy="-1" r="2.6" fill={INK} stroke="none" />
      <circle cx="8" cy="-4" r="5" fill="#fff" strokeWidth={2} /><circle cx="7" cy="-3" r="2.6" fill={INK} stroke="none" />
      <path d="M-8 10 Q0 18 10 10" fill="#7a3a4a" strokeWidth={2.5} /><path d="M-6 10 l1 4 l2 -4 M4 10 l1 4 l2 -4" fill="#fff" stroke="none" />
      <circle cx="10" cy="-12" r="3" fill={P.purple} strokeWidth={2} />
    </g>
  );
}
export function MoldHydra() {
  return (<>
    <Shadow rx={42} />
    <Ln d="M28 84 Q10 62 22 44 M50 80 Q50 56 50 36 M72 84 Q92 62 78 44" w={16} c={INK} />
    <Ln d="M28 84 Q10 62 22 44 M50 80 Q50 56 50 36 M72 84 Q92 62 78 44" w={9.5} c="#7d9e7a" />
    <path d="M6 92 C6 72 26 68 50 68 C74 68 94 72 94 92Z" fill="#6a8a68" />
    <circle cx="20" cy="82" r="5" fill={P.sick} strokeWidth={2.5} /><circle cx="76" cy="80" r="6" fill={P.lpurple} strokeWidth={2.5} /><circle cx="48" cy="86" r="4" fill={P.sick} strokeWidth={2.5} />
    <HydraHead x={20} y={38} s={0.85} /><HydraHead x={80} y={38} s={0.85} flip /><HydraHead x={50} y={22} s={1.1} />
  </>);
}
export function HydraHeadArt() {
  return (<>
    <Shadow rx={22} />
    <path d="M22 92 Q22 70 34 56 L66 56 Q78 70 78 92Z" fill="#6a8a68" />
    <circle cx="30" cy="84" r="4" fill={P.sick} strokeWidth={2.5} />
    <Ln d="M50 70 Q50 60 50 52" w={16} c={INK} /><Ln d="M50 70 Q50 60 50 52" w={9.5} c="#7d9e7a" />
    <HydraHead x={50} y={36} s={1.35} />
  </>);
}

export function AmanitaQueen() {
  const spots: [number, number, number][] = [[28, 26, 8], [52, 14, 7], [72, 26, 9], [40, 40, 6], [62, 44, 6], [86, 42, 5], [14, 46, 5]];
  return (<>
    <Shadow rx={42} />
    <path d="M28 54 L72 54 L94 92 L6 92Z" fill="#5c2f6e" />
    <Ln d="M6 92 L94 92" w={4} c={P.gold} />
    <Ln d="M36 62 L26 92 M50 62 L50 92 M64 62 L74 92" w={2.2} c="#3a1c4a" />
    <Dot x={22} y={80} r={2.5} c={P.lpurple} /><Dot x={78} y={82} r={2.5} c={P.lpurple} /><Dot x={50} y={76} r={2.5} c={P.lpurple} />
    <ellipse cx="50" cy="60" rx="20" ry="13" fill="#f6e8d6" />
    <Ln d="M28 60 Q50 76 72 60" w={3} c={INK} />
    <path d="M26 56 Q50 70 74 56 L70 64 Q50 78 30 64Z" fill="#fff4e0" strokeWidth={3} />
    <path d="M6 50 C0 10 26 -2 50 -2 C76 -2 100 10 94 50 Q94 60 84 60 L16 60 Q6 60 6 50Z" fill="#b8324a" transform="translate(0 4)" />
    {spots.map(([x, y, r], i) => <circle key={i} cx={x} cy={y + 4} r={r} fill={P.cream} strokeWidth={2.5} />)}
    <Hl x={26} y={16} rx={11} ry={3.5} r={-30} o={0.5} />
    <Eye x={42} y={70} r={5} /><Eye x={58} y={70} r={5} />
    <Ln d="M35 63 q5 -3 11 0 M65 63 q-5 -3 -11 0" w={2.5} /><Cheek x={35} y={76} r={3.5} /><Cheek x={65} y={76} r={3.5} />
    <path d="M45 78 Q50 81 55 78" fill="none" strokeWidth={2.5} stroke={P.red} />
    <path d="M28 8 L26 -2 L38 4 L50 -8 L62 4 L74 -2 L72 8Z" fill={P.gold} transform="translate(0 6)" />
    <Dot x={50} y={0} r={3} c={P.teal} /><Spark x={92} y={20} s={6} c="#fff" /><Spark x={6} y={30} s={5} c={P.gold} />
  </>);
}

export function BlightHeart() {
  return (<>
    <Shadow rx={44} />
    <circle cx="50" cy="52" r="46" fill="#a0d84a" opacity="0.18" stroke="none" />
    <Ln d="M22 88 Q4 84 6 66 M78 88 Q96 84 94 66 M50 92 Q50 98 40 98" w={6} c={INK} />
    <Ln d="M22 88 Q4 84 6 66 M78 88 Q96 84 94 66" w={2.6} c={P.dpurple} />
    <path d="M50 90 C10 66 0 44 8 28 C18 8 42 12 50 30 C58 12 82 8 92 28 C100 44 90 66 50 90Z" fill={P.purple} />
    <path d="M50 30 Q44 50 50 90 M20 24 Q30 46 26 62 M80 24 Q70 46 74 62" fill="none" stroke={P.dpurple} strokeWidth={3} />
    <Hl x={26} y={26} rx={9} ry={4} r={-40} o={0.5} />
    <path d="M60 40 l6 8 l-4 8 l8 8" fill="none" stroke="#c4f24a" strokeWidth={3.5} />
    <path d="M12 22 l-6 -10 l12 4z M88 22 l6 -10 l-12 4z M50 6 l-4 -8 l8 0z" fill={P.dpurple} strokeWidth={2.5} />
    <ellipse cx="36" cy="54" rx="9" ry="10" fill="#e7ffa6" strokeWidth={2.5} /><ellipse cx="60" cy="52" rx="9" ry="10" fill="#e7ffa6" strokeWidth={2.5} />
    <circle cx="34" cy="55" r="5" fill={INK} stroke="none" /><circle cx="58" cy="53" r="5" fill={INK} stroke="none" /><Dot x={32} y={52} r={1.8} /><Dot x={56} y={50} r={1.8} />
    <Ln d="M26 42 l16 6 M70 40 l-16 8" w={3.5} />
    <path d="M38 72 Q48 66 60 72" fill="none" strokeWidth={3} />
    <Dot x={92} y={54} r={3} c="#c4f24a" o={0.9} /><Dot x={6} y={50} r={2.5} c="#c4f24a" o={0.9} />
  </>);
}

/* minions */
export function Slimelet() {
  return (<>
    <Shadow rx={20} />
    <path d="M22 90 C14 62 30 46 50 46 C72 46 86 64 78 90Z" fill="#a8d86a" />
    <path d="M24 90 C30 82 66 82 76 90Z" fill="#d6f0a0" strokeWidth={0} />
    <Hl x={38} y={56} rx={7} ry={3} r={-25} />
    <Eye x={40} y={70} r={5} /><Eye x={58} y={70} r={5} /><Smile x={49} y={78} w={4} h={2} /><Cheek x={33} y={78} r={3} /><Cheek x={65} y={78} r={3} />
  </>);
}
export function Mothling() {
  return (<>
    <Shadow rx={18} cy={90} />
    <path d="M46 56 C28 30 50 18 64 30 C72 38 62 52 52 58Z" fill="#c9b8ec" />
    <path d="M52 58 C64 44 84 40 84 54 C84 66 64 66 52 62Z" fill="#b6a2de" />
    <Dot x={74} y={52} r={3.5} c={P.cream} />
    <ellipse cx="42" cy="66" rx="12" ry="14" fill="#f1e2c4" />
    <circle cx="34" cy="50" r="11" fill="#f1e2c4" />
    <Eye x={29} y={50} r={5} /><Cheek x={29} y={58} r={3} />
    <Ln d="M30 40 Q26 28 16 26 M36 40 Q40 28 34 22" w={2.5} />
  </>);
}
export function Sporeling() {
  return (<>
    <Shadow rx={20} />
    <ellipse cx="50" cy="82" rx="16" ry="12" fill="#c4b0d0" />
    <path d="M20 66 Q18 30 50 30 Q82 30 80 66 Q80 72 72 72 L28 72 Q20 72 20 66Z" fill="#8f5fb5" />
    <circle cx="40" cy="44" r="5" fill={P.sick} strokeWidth={2.2} /><circle cx="64" cy="50" r="4" fill={P.sick} strokeWidth={2.2} />
    <Hl x={38} y={38} rx={6} ry={2.5} r={-25} />
    <Eye x={42} y={80} r={4.5} /><Eye x={58} y={80} r={4.5} /><Smile x={50} y={87} w={3} h={2} />
    <Dot x={86} y={26} r={3} c="#c4f24a" o={0.9} /><Dot x={12} y={38} r={2.5} c="#c4f24a" o={0.9} /><Dot x={90} y={44} r={2} c="#c4f24a" o={0.9} />
  </>);
}
export function MoldBud() {
  return (<>
    <Shadow rx={18} />
    <path d="M24 90 C16 66 30 54 50 54 C70 54 84 66 76 90Z" fill="#8f9a78" />
    <circle cx="36" cy="66" r="5" fill={P.sick} strokeWidth={2.2} /><circle cx="68" cy="74" r="4" fill={P.lpurple} strokeWidth={2.2} />
    <Ln d="M50 54 Q50 40 58 32" w={3.5} />
    <path d="M58 32 q-14 -8 -8 -20 q16 2 8 20z" fill={P.purple} strokeWidth={3} />
    <Hl x={44} y={64} rx={6} ry={2.5} r={-25} />
    <Eye x={42} y={78} r={4.5} /><Eye x={58} y={78} r={4.5} />
    <Ln d="M36 70 l8 3 M64 70 l-8 3" w={2.5} />
  </>);
}
