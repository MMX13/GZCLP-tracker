import { Eye, WEye, Cheek, Hl, Ln, Smile, Spark, Dot, Shadow, P, INK } from './kit';

export function Moth() {
  return (<>
    <Shadow rx={30} />
    <path d="M56 50 C40 8 96 2 96 40 C96 62 76 66 60 62Z" fill="#c9b08a" />
    <path d="M60 56 C56 74 90 84 90 66 C90 58 74 56 60 56Z" fill="#b39a74" />
    <circle cx="80" cy="34" r="9" fill={P.cream} strokeWidth={2.5} /><circle cx="80" cy="34" r="4" fill={INK} stroke="none" />
    <Hl x={72} y={20} rx={7} ry={3} r={-25} />
    <Dot x={92} y={78} r={2} c={P.gold} o={0.9} /><Spark x={94} y={52} s={5} c={P.gold} />
    <ellipse cx="46" cy="68" rx="18" ry="20" fill="#f1e2c4" />
    <Ln d="M34 62 q12 4 24 0 M32 72 q14 4 28 0" w={2} c="#c9b08a" />
    <circle cx="36" cy="44" r="14" fill="#f1e2c4" />
    <Eye x={30} y={44} r={6} /><Cheek x={30} y={53} r={3.5} />
    <Ln d="M32 32 Q26 16 12 16 M38 31 Q40 14 30 8" w={3} />
    <path d="M12 16 q-6 0 -8 6 q6 2 8 -6z M30 8 q-6 -2 -10 2 q6 4 10 -2z" fill="#f1e2c4" strokeWidth={2} />
    <Ln d="M40 86 l-2 6 M52 88 l0 5" w={3.5} />
  </>);
}

export function CaveCricket() {
  return (<>
    <Shadow rx={38} />
    <Ln d="M30 40 Q20 18 4 14 M36 38 Q34 14 20 6" w={2.5} />
    <path d="M60 56 L74 26 L92 84 L80 90 L70 62Z" fill="#7b6a2a" />
    <Ln d="M92 84 l6 8" w={4} />
    <ellipse cx="54" cy="64" rx="34" ry="18" fill="#a08a3a" />
    <Ln d="M42 50 q6 14 0 28 M58 48 q6 16 0 32 M74 52 q4 12 0 24" w={2.5} c="#6f5f22" />
    <Hl x={54} y={54} rx={12} ry={3} r={-8} />
    <path d="M36 82 l-4 10 M50 84 l-2 9" fill="none" strokeWidth={4} />
    <circle cx="26" cy="52" r="17" fill="#b9a24a" />
    <Eye x={20} y={50} r={7} /><Cheek x={18} y={60} r={3.5} /><Smile x={30} y={62} w={4} h={2} />
    <Hl x={30} y={40} rx={5} ry={2.5} r={-30} />
  </>);
}

export function SlimeMold() {
  return (<>
    <Shadow rx={38} />
    <path d="M8 90 C0 70 10 60 8 46 C8 30 26 28 32 34 C36 20 58 16 64 30 C80 22 94 38 90 54 C100 66 94 90 84 90Z" fill="#e8c93c" />
    <Ln d="M12 88 C4 70 14 60 12 48 C12 34 28 32 34 38 C38 24 56 22 62 34 C76 26 90 40 86 56 C96 68 90 88 82 88" w={0.01} />
    <Ln d="M50 30 L50 56 M50 56 L32 72 M50 56 L70 74 M50 40 L66 34 M34 72 L28 84 M70 74 L76 84" w={3} c="#d9822b" />
    <Hl x={26} y={44} rx={6} ry={3} r={-30} /><Hl x={72} y={40} rx={5} ry={2.5} r={-30} />
    <Dot x={18} y={62} r={3} c="#f3e08a" /><Dot x={82} y={72} r={4} c="#f3e08a" />
    <Eye x={34} y={54} r={6.5} /><Eye x={58} y={54} r={6.5} /><Smile x={46} y={66} w={6} h={3} /><Cheek x={26} y={64} r={4} /><Cheek x={68} y={64} r={4} />
  </>);
}

export function GlowWorm() {
  return (<>
    <Shadow rx={30} />
    <circle cx="74" cy="66" r="26" fill="#d8ff7a" opacity="0.28" stroke="none" />
    <circle cx="74" cy="66" r="19" fill="#d8ff7a" opacity="0.35" stroke="none" />
    <path d="M30 90 Q60 92 78 84 Q94 74 82 62" fill="none" stroke={INK} strokeWidth={22} strokeLinecap="round" />
    <path d="M30 90 Q60 92 78 84 Q94 74 82 62" fill="none" stroke="#e9b98f" strokeWidth={15} strokeLinecap="round" />
    <Ln d="M50 84 q2 6 0 10 M62 86 q2 5 0 9" w={2.5} />
    <circle cx="78" cy="62" r="13" fill="#eaff6a" />
    <Hl x={73} y={57} rx={4} ry={3} o={0.8} />
    <Spark x={94} y={46} s={6} c="#f6ffb0" /><Spark x={60} y={50} s={4} c="#f6ffb0" />
    <path d="M14 88 C4 60 20 30 34 44 C48 56 44 90 34 92Z" fill="#e9b98f" transform="translate(4 -4)" />
    <Ln d="M18 62 q10 2 20 0 M19 72 q10 2 20 0" w={2.2} c="#b5825a" />
    <Ln d="M24 44 Q20 30 12 28 M34 42 Q36 30 44 28" w={2.5} />
    <Eye x={22} y={56} r={6} /><Cheek x={19} y={65} r={3.5} /><Smile x={28} y={66} w={4} h={2} />
  </>);
}

export function Bat() {
  return (<>
    <Shadow rx={20} cy={92} />
    <path d="M42 44 Q24 20 2 32 Q10 36 8 46 Q14 46 16 54 Q26 52 40 62Z" fill="#6c5a8a" />
    <path d="M58 44 Q76 20 98 32 Q90 36 92 46 Q86 46 84 54 Q74 52 60 62Z" fill="#6c5a8a" />
    <Ln d="M42 46 L14 40 M42 50 L20 54" w={2} c="#4b3c66" />
    <ellipse cx="50" cy="62" rx="18" ry="20" fill="#8570a8" />
    <ellipse cx="50" cy="68" rx="10" ry="12" fill="#c6b6de" strokeWidth={0} />
    <path d="M34 40 L32 22 L44 34Z M66 40 L68 22 L56 34Z" fill="#8570a8" />
    <path d="M36 36 L35 27 L41 33Z M64 36 L65 27 L59 33Z" fill={P.pink} stroke="none" />
    <circle cx="50" cy="46" r="17" fill="#8570a8" />
    <Hl x={44} y={38} rx={6} ry={3} r={-20} />
    <Eye x={42} y={46} r={5.5} /><Eye x={58} y={46} r={5.5} />
    <path d="M44 55 Q50 62 56 55Z" fill="#fff" strokeWidth={2.5} /><Cheek x={36} y={54} r={3} /><Cheek x={64} y={54} r={3} />
    <Ln d="M42 80 l-2 6 M58 80 l2 6" w={3} />
  </>);
}

export function Centipede() {
  const segs = [[78, 74], [62, 78], [46, 78], [32, 68], [24, 52]];
  return (<>
    <Shadow rx={40} />
    {segs.map(([x, y], i) => <Ln key={i} d={`M${x - 5} ${y + 6} l-4 12 M${x + 5} ${y + 6} l4 12`} w={3.5} />)}
    {segs.map(([x, y], i) => <g key={'s' + i}><circle cx={x} cy={y} r={i === 4 ? 0 : 13} fill={i % 2 ? '#e0703f' : '#d9534f'} /></g>)}
    <path d="M52 62 l4 -10 l4 10 M67 60 l4 -10 l4 10 M84 58 l4 -8 l2 10" fill="#f5d6a8" strokeWidth={2.5} />
    <circle cx="26" cy="46" r="17" fill="#e8963f" />
    <Hl x={20} y={38} rx={6} ry={3} r={-25} />
    <Eye x={20} y={44} r={6} /><Cheek x={20} y={54} r={3.5} /><Smile x={30} y={52} w={4} h={2} />
    <Ln d="M22 30 Q16 16 6 14 M32 30 Q34 14 26 8" w={3} />
    <Hl x={68} y={68} rx={5} ry={2.5} r={-10} />
  </>);
}

export function Spider() {
  return (<>
    <Shadow rx={34} />
    <Ln d="M50 0 L50 26" w={2} c="#e8e0d0" />
    <path d="M10 4 L50 20 L92 4 M4 28 L50 40 L98 28" fill="none" stroke="#e8e0d0" strokeWidth={1.8} />
    <Ln d="M40 56 L14 44 L6 66 M40 64 L10 72 L12 90 M60 56 L86 44 L94 66 M60 64 L90 72 L88 90" w={4.5} />
    <ellipse cx="60" cy="62" rx="24" ry="22" fill="#5a4a78" />
    <path d="M52 54 l8 10 l8 -10 l-8 20z" fill={P.red} strokeWidth={2.5} />
    <Hl x={68} y={50} rx={7} ry={3} r={-25} />
    <circle cx="32" cy="58" r="17" fill="#6f5c94" />
    <Eye x={24} y={54} r={5} /><Eye x={35} y={50} r={4} /><Dot x={26} y={62} r={2.5} c={INK} />
    <Cheek x={22} y={64} r={3.5} />
    <Ln d="M24 68 l-1 6 M34 70 l1 6" w={2.5} c="#fff" />
    <path d="M22 68 l-2 8 l4 -3z M36 68 l2 8 l-4 -3z" fill="#f4f0e0" strokeWidth={2} />
  </>);
}

export function CrystalCrab() {
  return (<>
    <Shadow rx={42} />
    <Ln d="M22 78 l-8 12 M34 84 l-4 9 M66 84 l4 9 M78 78 l8 12" w={5} />
    <ellipse cx="54" cy="66" rx="34" ry="24" fill="#e9a0b6" />
    <path d="M36 50 L40 22 L48 46Z M50 44 L58 12 L66 44Z M64 48 L76 26 L80 54Z" fill="#8fe6ef" />
    <path d="M40 22 L42 40 M58 12 L60 36 M76 26 L74 44" fill="none" stroke="#fff" strokeWidth={2.2} opacity="0.8" />
    <Hl x={42} y={62} rx={8} ry={3} r={-15} />
    <Ln d="M20 58 Q20 46 26 40 M34 52 Q34 40 40 34" w={3.5} />
    <WEye x={26} y={38} r={7} /><WEye x={41} y={32} r={7} />
    <Smile x={38} y={74} w={7} h={3} /><Cheek x={26} y={72} r={4} />
    <path d="M12 60 C-2 60 -2 34 12 32 C16 38 18 44 14 50 C22 52 22 60 12 60Z" fill="#e9a0b6" />
    <path d="M94 62 C104 58 104 36 92 36 C90 42 88 46 92 50 C84 52 84 62 94 62Z" fill="#e9a0b6" />
    <Hl x={8} y={42} rx={3} ry={5} r={10} />
  </>);
}

export function EchoBat() {
  return (<>
    <Shadow rx={20} />
    <Ln d="M10 40 Q2 50 10 60 M18 36 Q8 50 18 64" w={3} c={P.teal} />
    <path d="M48 44 Q34 12 10 20 Q16 26 12 34 Q20 32 22 42 Q34 44 46 60Z" fill="#a793c9" transform="translate(10 6)" />
    <path d="M56 44 Q72 8 98 18 Q90 26 94 34 Q86 34 84 44 Q72 44 60 60Z" fill="#a793c9" />
    <ellipse cx="50" cy="68" rx="20" ry="20" fill="#b9a6d8" />
    <ellipse cx="50" cy="74" rx="11" ry="12" fill="#eee6fa" strokeWidth={0} />
    <path d="M30 44 L26 12 L46 34Z M70 44 L74 12 L54 34Z" fill="#b9a6d8" />
    <path d="M32 40 L30 20 L42 34Z M68 40 L70 20 L58 34Z" fill={P.pink} stroke="none" />
    <circle cx="50" cy="50" r="19" fill="#b9a6d8" />
    <Hl x={43} y={41} rx={6} ry={3} r={-20} />
    <Eye x={41} y={48} r={5} /><Eye x={59} y={48} r={5} />
    <path d="M42 58 Q50 76 58 58Z" fill="#8c3a4a" strokeWidth={2.5} /><path d="M45 58 l1 5 l2 -5 M52 58 l2 5 l1 -5" fill="#fff" stroke="none" />
  </>);
}

export function Mothmother() {
  return (<>
    <Shadow rx={30} />
    <path d="M50 52 C6 -4 -6 44 6 62 C14 76 34 68 50 62Z" fill="#a591d6" />
    <path d="M50 52 C94 -4 106 44 94 62 C86 76 66 68 50 62Z" fill="#a591d6" />
    <path d="M50 62 C24 68 14 90 34 92 C44 92 48 76 50 68 M50 62 C76 68 86 90 66 92 C56 92 52 76 50 68" fill="#8c78c2" />
    <circle cx="24" cy="38" r="12" fill="#f4e6ff" strokeWidth={2.5} /><circle cx="24" cy="38" r="6" fill={P.purple} stroke="none" /><Dot x={22} y={35} r={2.5} />
    <circle cx="76" cy="38" r="12" fill="#f4e6ff" strokeWidth={2.5} /><circle cx="76" cy="38" r="6" fill={P.purple} stroke="none" /><Dot x={74} y={35} r={2.5} />
    <Hl x={18} y={20} rx={9} ry={3.5} r={-30} o={0.5} /><Hl x={72} y={22} rx={9} ry={3.5} r={30} o={0.5} />
    <Spark x={8} y={78} s={6} c={P.gold} /><Spark x={92} y={78} s={6} c={P.gold} /><Spark x={40} y={14} s={4} c="#fff" /><Spark x={62} y={10} s={4} c="#fff" />
    <ellipse cx="50" cy="66" rx="14" ry="22" fill="#f6ead0" />
    <Ln d="M40 62 q10 4 20 0 M40 72 q10 4 20 0" w={2} c="#c9b08a" />
    <circle cx="50" cy="40" r="15" fill="#f6ead0" />
    <Eye x={43} y={40} r={5.5} /><Eye x={57} y={40} r={5.5} /><Cheek x={38} y={47} r={3.5} /><Cheek x={62} y={47} r={3.5} /><Smile x={50} y={47} w={3} h={2} />
    <Ln d="M44 27 Q36 12 24 10 M56 27 Q64 12 76 10" w={3} />
    <path d="M40 24 L44 14 L50 22 L56 14 L60 24Z" fill={P.gold} strokeWidth={3} />
  </>);
}

export function SlimeColossus() {
  return (<>
    <Shadow rx={48} />
    <path d="M2 92 C-2 56 14 22 50 20 C86 22 102 56 98 92Z" fill="#b6d95a" />
    <path d="M4 92 C8 80 30 82 50 82 C70 82 92 80 96 88 L98 92Z" fill="#dcef98" strokeWidth={0} />
    <Ln d="M2 92 C-2 56 14 22 50 20 C86 22 102 56 98 92" w={3.5} />
    <Hl x={30} y={38} rx={12} ry={5} r={-40} o={0.5} /><Hl x={76} y={52} rx={3} ry={8} r={-10} />
    {/* absorbed things */}
    <circle cx="72" cy="66" r="8" fill="#8fc26a" strokeWidth={2.5} opacity="0.85" /><Dot x={70} y={65} r={1.8} c={INK} /><Dot x={76} y={65} r={1.8} c={INK} />
    <circle cx="22" cy="70" r="6" fill="#8fc26a" strokeWidth={2.5} opacity="0.85" />
    <path d="M60 78 l12 0 M66 74 l0 8" stroke={P.cream} strokeWidth={4} opacity="0.8" />
    <circle cx="86" cy="42" r="3" fill="#eaf7b8" strokeWidth={2} /><circle cx="14" cy="50" r="4" fill="#eaf7b8" strokeWidth={2} />
    <Eye x={34} y={52} r={9} /><Eye x={58} y={52} r={9} />
    <path d="M36 68 Q47 78 58 68 Q47 84 36 68Z" fill="#6a8a2c" strokeWidth={3} />
    <Cheek x={24} y={64} r={5} /><Cheek x={68} y={64} r={5} />
    <path d="M18 92 q-3 9 2 11 q5 -3 -2 -11z" fill="#b6d95a" strokeWidth={2.5} />
  </>);
}
