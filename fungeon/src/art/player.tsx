import { Eye, Cheek, Hl, Ln, Smile, Shadow, P, INK, Dot } from './kit';

/** Pip, the round button mushroom. Faces right. Face sits right under the cap. */
export function Pip() {
  return (
    <>
      <Shadow rx={28} />
      <ellipse cx="36" cy="91" rx="10" ry="5" fill="#f3dcb4" />
      <ellipse cx="64" cy="91" rx="10" ry="5" fill="#f3dcb4" />
      {/* twig sword, held out to the right */}
      <Ln d="M89 80 L94 34" w={6} c={INK} />
      <Ln d="M89 80 L94 34" w={2.6} c="#b9855a" />
      <path d="M94 34 q7 -7 3 -15 q-9 5 -3 15z" fill={P.lime} strokeWidth={3} />
      <Ln d="M86 62 l8 -2" w={3} />
      {/* leaf satchel on the left hip */}
      <path d="M3 68 q2 -10 15 -8 q3 13 -8 20 q-9 -2 -7 -12z" fill={P.moss} />
      <Ln d="M6 76 q6 -6 10 -12" w={2} />
      {/* body */}
      <path d="M22 48 Q15 92 50 92 Q85 92 78 48Z" fill="#f3dcb4" />
      <Hl x={27} y={72} rx={2.6} ry={8} r={8} />
      <Ln d="M22 56 Q16 60 15 68" w={3} />
      {/* arm holding sword */}
      <circle cx="85" cy="76" r="6.5" fill="#f3dcb4" />
      {/* face */}
      <Eye x={39} y={64} r={8} />
      <Eye x={62} y={64} r={8} />
      <Cheek x={28} y={75} r={5} />
      <Cheek x={72} y={75} r={5} />
      <Smile x={50} y={73} w={5} h={3.5} />
      {/* cap */}
      <path d="M17 44 Q14 8 50 8 Q86 8 83 44 Q83 51 74 51 L26 51 Q17 51 17 44Z" fill={P.cream} />
      <Ln d="M26 51 Q50 57 74 51" w={2.5} />
      <ellipse cx="34" cy="20" rx="9" ry="4" fill="#fff" opacity="0.75" transform="rotate(-25 34 20)" stroke="none" />
      <circle cx="62" cy="21" r="5.5" fill={P.beige} strokeWidth={2.5} />
      <circle cx="72" cy="38" r="4" fill={P.beige} strokeWidth={2.5} />
      <circle cx="44" cy="36" r="3.6" fill={P.beige} strokeWidth={2.5} />
      <circle cx="26" cy="38" r="3.2" fill={P.beige} strokeWidth={2.5} />
      <Dot x={50} y={14} r={2} c={P.beige} />
    </>
  );
}
