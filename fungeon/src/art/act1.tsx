import { Eye, WEye, Cheek, Hl, Ln, Smile, Spark, Dot, Shadow, P, INK } from './kit';

export function Slug() {
  return (<>
    <Shadow rx={38} />
    <Ln d="M28 52 L22 28" w={4} /><Ln d="M40 46 L42 24" w={4} />
    <WEye x={21} y={26} r={7} /><WEye x={42} y={22} r={7} />
    <path d="M10 88 C6 66 20 48 36 50 C50 34 82 42 88 68 C92 82 90 88 82 88Z" fill="#8fc26a" />
    <path d="M12 88 C14 80 30 82 50 82 C70 82 84 80 88 76 C90 84 88 88 82 88Z" fill="#c9e39a" strokeWidth={0} />
    <Ln d="M10 88 C6 66 20 48 36 50 C50 34 82 42 88 68 C92 82 90 88 82 88Z" w={3.5} />
    <Hl x={54} y={50} rx={11} ry={4} r={-10} />
    <circle cx="66" cy="60" r="4" fill="#6ea24d" strokeWidth={0} /><circle cx="76" cy="70" r="3" fill="#6ea24d" strokeWidth={0} />
    <Eye x={22} y={70} r={4.5} /><Smile x={30} y={77} w={5} h={3} /><Cheek x={17} y={78} r={4} />
    <path d="M40 88 q-2 8 2 9 q4 -1 -2 -9z" fill={P.teal} strokeWidth={2.5} />
    <path d="M70 88 q-2 6 1 8 q4 -2 -1 -8z" fill={P.teal} strokeWidth={2.5} />
    <path d="M60 24 q-3 5 0 7 q3 -2 0 -7z" fill={P.blue} strokeWidth={2} />
  </>);
}

export function Gnat() {
  return (<>
    <Shadow rx={16} cy={90} />
    <ellipse cx="62" cy="34" rx="16" ry="9" fill="#dff1f7" opacity="0.85" transform="rotate(-25 62 34)" strokeWidth={2.5} />
    <ellipse cx="46" cy="32" rx="14" ry="7" fill="#dff1f7" opacity="0.85" transform="rotate(-50 46 32)" strokeWidth={2.5} />
    <Ln d="M44 68 l-6 14 M54 70 l0 15 M62 68 l8 14" w={3} />
    <ellipse cx="60" cy="56" rx="17" ry="14" fill="#7a6a5a" />
    <Ln d="M52 44 q4 12 0 24 M62 43 q4 13 0 26" w={2.5} c="#4d4034" />
    <circle cx="36" cy="54" r="15" fill="#8d7b69" />
    <Hl x={30} y={46} rx={6} ry={3} r={-20} />
    <Eye x={30} y={54} r={7} /><Ln d="M22 66 L12 76" w={3} />
    <Ln d="M36 40 q-4 -8 -10 -10 M42 42 q0 -9 -3 -12" w={2.5} />
    <Cheek x={40} y={62} r={3.5} />
  </>);
}

export function BarkBeetle() {
  return (<>
    <Shadow rx={38} />
    <Ln d="M30 80 l-4 12 M46 84 l-1 10 M64 84 l1 10 M78 80 l4 11" w={5} />
    <path d="M22 84 Q20 30 60 30 Q94 30 92 84Z" fill={P.brown} />
    <Ln d="M60 30 Q54 58 60 84" w={3} />
    <Ln d="M36 42 q-6 20 -4 40 M84 44 q4 20 2 38" w={2.5} c={P.dbrown} />
    <Ln d="M44 50 q4 4 0 8 M74 56 q-4 4 0 8 M46 72 q6 -2 8 2" w={2.5} c={P.dbrown} />
    <ellipse cx="50" cy="40" rx="10" ry="4" fill="#fff" opacity="0.3" transform="rotate(-15 50 40)" stroke="none" />
    <circle cx="20" cy="66" r="15" fill="#6d4630" />
    <Hl x={15} y={58} rx={5} ry={3} r={-20} />
    <Eye x={16} y={66} r={6} /><Cheek x={14} y={75} r={3.5} />
    <Ln d="M12 54 L4 42 M22 52 L20 40" w={3} />
    <path d="M6 72 q-5 6 0 10 q4 -3 6 -6z" fill="#e8c9a0" strokeWidth={2.5} />
  </>);
}

function SnailBody({ body, shell, ring, z }: { body: string; shell: string; ring: string; z?: boolean }) {
  return (<>
    <Ln d="M22 56 L14 34" w={4} /><Ln d="M34 54 L34 30" w={4} />
    {z ? <><WEye x={13} y={32} r={7} c="#e9f0c8" /><Ln d="M28 24 l10 10 M38 24 l-10 10" w={3} /></> : <><WEye x={13} y={32} r={7} /><WEye x={34} y={26} r={7} /></>}
    <path d="M8 90 C4 72 16 58 32 60 L64 66 L94 88 Q96 92 90 92 L12 92 Q8 92 8 90Z" fill={body} />
    <circle cx="66" cy="50" r="30" fill={shell} />
    <path d="M66 50 m0 -3 a3 3 0 1 1 -3 3 a8 8 0 1 1 8 8 a14 14 0 1 1 -14 -14 a20 20 0 1 1 20 20" fill="none" stroke={ring} strokeWidth={3.5} />
    <Hl x={52} y={34} rx={8} ry={3.5} r={-40} />
    <Eye x={18} y={74} r={4.5} /><Smile x={24} y={82} w={4} h={3} /><Cheek x={12} y={82} r={3.5} />
  </>);
}
export function Snail() {
  return (<><Shadow rx={40} /><SnailBody body="#e6cf9c" shell="#e58a3c" ring="#a85a22" /></>);
}
export function ZombieSnail() {
  return (<><Shadow rx={40} /><SnailBody body="#9bb06f" shell="#8a7aa0" ring="#4b3a66" z />
    <Ln d="M62 22 l6 12 l-6 6 l6 10" w={2.5} />
    <path d="M40 76 l8 0 M44 72 l0 8" stroke={INK} strokeWidth={2.5} />
    <path d="M78 90 q0 6 3 6 q3 0 -3 -6z" fill={P.lpurple} strokeWidth={2} />
    <Dot x={60} y={30} r={2} c={P.sick} /></>);
}

export function WorkerAnt() {
  return (<>
    <Shadow rx={36} />
    <Ln d="M36 72 l-6 20 M50 74 l-2 18 M62 72 l6 20" w={4} />
    <ellipse cx="76" cy="62" rx="16" ry="14" fill="#c2603f" />
    <ellipse cx="50" cy="66" rx="12" ry="10" fill="#c2603f" />
    <circle cx="28" cy="56" r="17" fill="#c2603f" />
    <Hl x={22} y={47} rx={7} ry={3.5} r={-25} /><Hl x={78} y={54} rx={7} ry={3} r={-15} />
    <path d="M40 54 q10 -18 24 -8 q-4 12 -14 12z" fill={P.lime} />
    <Eye x={22} y={56} r={6.5} /><Cheek x={20} y={66} r={3.5} />
    <Ln d="M18 42 Q12 30 4 30 M28 40 Q28 26 20 20" w={3} />
    <Ln d="M14 68 q-4 4 0 8" w={3} />
  </>);
}

export function Toadlet() {
  return (<>
    <Shadow rx={36} />
    <path d="M56 48 C90 44 96 84 82 90 L22 90 C6 84 12 50 40 46Z" fill="#7fb35a" />
    <path d="M24 90 C22 78 40 72 56 72 C74 72 82 80 80 90Z" fill="#d6e6a0" strokeWidth={0} />
    <circle cx="34" cy="40" r="11" fill="#7fb35a" /><circle cx="58" cy="38" r="11" fill="#7fb35a" />
    <Eye x={31} y={39} r={6} /><Eye x={55} y={37} r={6} />
    <Hl x={28} y={33} rx={4} ry={2} r={-20} />
    <Ln d="M12 68 Q28 78 44 66" w={3} /><Cheek x={16} y={62} r={4} />
    <path d="M14 70 Q2 76 6 84 Q14 80 16 74" fill={P.pink} strokeWidth={3} />
    <circle cx="64" cy="58" r="3" fill="#5f9440" strokeWidth={0} /><circle cx="76" cy="70" r="3.5" fill="#5f9440" strokeWidth={0} /><circle cx="54" cy="50" r="2.5" fill="#5f9440" strokeWidth={0} />
    <ellipse cx="34" cy="90" rx="9" ry="4.5" fill="#7fb35a" /><ellipse cx="70" cy="90" rx="10" ry="4.5" fill="#7fb35a" />
  </>);
}

export function StagBeetle() {
  return (<>
    <Shadow rx={42} />
    <Ln d="M34 80 l-6 12 M52 84 l-2 10 M70 84 l2 10 M84 78 l8 12" w={5} />
    {/* cape */}
    <path d="M62 34 Q98 40 96 88 L70 84Z" fill={P.red} />
    <path d="M22 84 Q20 30 58 28 Q92 30 90 84Z" fill="#3f3a5e" />
    <path d="M50 30 Q46 56 50 84 M70 30 Q66 56 70 84" fill="none" stroke={P.gold} strokeWidth={3} />
    <Ln d="M22 84 L90 84" w={4} c={P.gold} />
    <ellipse cx="42" cy="40" rx="9" ry="4" fill="#fff" opacity="0.3" transform="rotate(-20 42 40)" stroke="none" />
    {/* head/helmet */}
    <circle cx="25" cy="62" r="21" fill="#5a5480" />
    <path d="M6 56 Q8 36 26 36 Q44 38 46 56 Q36 50 26 52 Q14 50 6 56Z" fill="#a8a2c8" />
    <Ln d="M22 38 Q28 22 42 28" w={4} c={P.red} />
    <WEye x={15} y={66} r={8} /><WEye x={34} y={64} r={6.5} />
    <Cheek x={12} y={77} r={4} /><Smile x={26} y={77} w={4} h={2} />
    {/* mandible horns */}
    <path d="M12 72 Q-2 70 2 50 Q4 44 10 48 Q8 58 16 64" fill={P.brown} />
    <path d="M18 76 Q4 88 0 70" fill="none" strokeWidth={4} />
    <Spark x={84} y={26} s={7} c={P.gold} />
  </>);
}

export function Mole() {
  return (<>
    <Shadow rx={38} />
    <path d="M6 90 Q10 74 30 80 L70 78 Q92 78 94 90Z" fill="#9c7a57" />
    <Dot x={22} y={85} r={2.5} c={P.dbrown} /><Dot x={80} y={86} r={2.5} c={P.dbrown} />
    <path d="M22 84 C10 50 30 34 54 34 C82 34 92 56 84 84Z" fill="#6f5f78" />
    <ellipse cx="34" cy="76" rx="14" ry="9" fill="#a595b0" strokeWidth={0} />
    <Hl x={64} y={46} rx={8} ry={3.5} r={-25} />
    <ellipse cx="22" cy="60" rx="12" ry="9" fill={P.pink} />
    <Hl x={19} y={56} rx={4} ry={2} />
    <Eye x={38} y={50} r={4.5} /><Eye x={52} y={50} r={4.5} />
    {/* helmet */}
    <path d="M30 42 Q34 20 54 20 Q72 22 74 42Z" fill={P.gold} />
    <Ln d="M28 42 L76 42" w={4} />
    <circle cx="32" cy="34" r="6" fill="#fff8c8" /><path d="M26 32 l-8 -4 M26 36 l-9 3" stroke={P.gold} strokeWidth={2.5} />
    <Hl x={54} y={28} rx={7} ry={2.5} r={-15} />
    {/* claws */}
    <ellipse cx="34" cy="84" rx="14" ry="7" fill="#a595b0" />
    <Ln d="M22 86 l-3 5 M30 88 l-2 5 M38 88 l0 5" w={3} c="#f4e3c1" />
    <Ln d="M86 60 L96 40" w={5} /><path d="M92 36 L100 38 L98 46Z" fill="#b6b6b6" />
  </>);
}

export function SoldierAnt() {
  return (<>
    <Shadow rx={40} />
    <Ln d="M34 76 l-8 16 M48 78 l-2 15 M62 76 l6 16 M74 72 l12 18" w={4.5} />
    <ellipse cx="78" cy="62" rx="17" ry="15" fill="#8e2f2f" />
    <ellipse cx="52" cy="66" rx="13" ry="12" fill="#8e2f2f" />
    <path d="M22 44 C8 44 8 74 26 76 C42 76 44 46 30 42Z" fill="#8e2f2f" />
    <Hl x={76} y={54} rx={8} ry={3} r={-15} />
    <Ln d="M60 60 q4 -6 10 0 M70 68 q4 -6 10 0" w={2.5} c="#5c1d1d" />
    {/* helmet */}
    <path d="M10 48 Q14 22 30 24 Q42 26 44 48Z" fill="#a9a9b5" />
    <Ln d="M28 24 L28 10" w={4} /><path d="M28 6 l8 6 l-8 3z" fill={P.red} strokeWidth={2.5} />
    <Hl x={22} y={32} rx={5} ry={2.5} r={-30} />
    <Eye x={18} y={58} r={6} /><Cheek x={16} y={68} r={3.5} />
    <Ln d="M10 70 Q0 74 4 84 M20 76 Q16 88 8 88" w={3.5} />
    {/* spear */}
    <Ln d="M92 90 L92 30" w={4} c={INK} /><Ln d="M92 90 L92 30" w={1.8} c="#b9855a" /><path d="M92 18 l6 14 h-12z" fill="#dcdcdc" strokeWidth={3} />
  </>);
}

export function Gloopius() {
  return (<>
    <Shadow rx={46} />
    <Ln d="M30 44 L20 14" w={5} /><Ln d="M46 40 L48 10" w={5} />
    <WEye x={19} y={13} r={9} /><WEye x={48} y={9} r={9} />
    <path d="M4 92 C-2 60 14 40 34 42 C50 26 90 32 96 68 C100 86 98 92 90 92Z" fill="#6fc4a0" />
    <path d="M6 92 C8 82 30 86 50 86 C72 86 90 84 96 78 C98 86 96 92 90 92Z" fill="#b9ebd0" strokeWidth={0} />
    <Ln d="M4 92 C-2 60 14 40 34 42 C50 26 90 32 96 68 C100 86 98 92 90 92Z" w={3.5} />
    <Hl x={62} y={46} rx={14} ry={4.5} r={-12} /><Hl x={80} y={58} rx={3} ry={5} r={-10} />
    <circle cx="64" cy="66" r="6" fill="#4ea988" strokeWidth={0} /><circle cx="80" cy="76" r="4" fill="#4ea988" strokeWidth={0} /><circle cx="50" cy="60" r="3" fill="#4ea988" strokeWidth={0} />
    <Eye x={22} y={70} r={6} /><Smile x={32} y={80} w={7} h={4} /><Cheek x={14} y={80} r={4.5} />
    {/* crown */}
    <path d="M28 40 L28 26 L36 34 L44 22 L52 34 L60 26 L60 40Z" fill={P.gold} transform="translate(8 0) rotate(8 44 40)" />
    <path d="M30 88 q-3 8 1 10 q4 -2 -1 -10z M62 88 q-3 7 1 9 q4 -2 -1 -9z M84 86 q-3 7 1 9 q4 -3 -1 -9z" fill="#6fc4a0" strokeWidth={2.5} />
    <Dot x={94} y={30} r={4} c="#e6fff4" o={0.9} /><Dot x={86} y={20} r={2.5} c="#e6fff4" o={0.9} />
  </>);
}

export function ToadKing() {
  return (<>
    <Shadow rx={46} />
    {/* lily pad */}
    <path d="M4 86 Q50 74 96 86 Q96 98 50 98 Q4 98 4 86Z" fill="#4c8a48" />
    <Ln d="M50 92 L50 80" w={2.5} c="#2d5d2a" />
    <ellipse cx="78" cy="90" rx="8" ry="3" fill="#f7a8c0" strokeWidth={2.5} />
    <path d="M64 46 C100 44 100 88 84 90 L20 90 C4 88 8 48 40 44Z" fill="#6fa64f" />
    <path d="M22 90 C22 74 42 68 56 68 C74 68 84 76 82 90Z" fill="#d6e6a0" strokeWidth={0} />
    <circle cx="30" cy="36" r="13" fill="#6fa64f" /><circle cx="60" cy="34" r="13" fill="#6fa64f" />
    <Eye x={26} y={36} r={7} /><Eye x={57} y={34} r={7} />
    <Ln d="M8 62 Q28 76 48 62" w={3.5} /><Cheek x={12} y={58} r={4.5} />
    <path d="M12 66 Q-2 74 4 84 Q14 78 16 70" fill={P.pink} strokeWidth={3} />
    <circle cx="70" cy="58" r="4" fill="#4f8038" strokeWidth={0} /><circle cx="82" cy="72" r="4.5" fill="#4f8038" strokeWidth={0} /><circle cx="52" cy="48" r="3" fill="#4f8038" strokeWidth={0} /><circle cx="42" cy="82" r="3" fill="#4f8038" strokeWidth={0} />
    <Hl x={70} y={52} rx={8} ry={3} r={-20} />
    {/* crown */}
    <path d="M32 26 L30 8 L40 16 L46 4 L52 16 L62 8 L60 26Z" fill={P.gold} />
    <Ln d="M32 22 L60 22" w={2.5} /><Dot x={46} y={14} r={3} c={P.red} />
    <ellipse cx="34" cy="90" rx="10" ry="5" fill="#6fa64f" /><ellipse cx="72" cy="90" rx="11" ry="5" fill="#6fa64f" />
  </>);
}
