import { Eye, Cheek, Hl, Ln, Smile, Shadow, P, INK, Dot } from './kit';

/** Pip, the round button mushroom. Faces right. Also used (face only) for the app icon. */
export function Pip() {
  return (
    <>
      <Shadow rx={28} />
      {/* feet */}
      <ellipse cx="41" cy="90" rx="9" ry="5" fill="#f3dcb4" />
      <ellipse cx="62" cy="90" rx="9" ry="5" fill="#f3dcb4" />
      {/* twig sword behind */}
      <Ln d="M76 76 L93 42" w={5} c={INK} />
      <Ln d="M76 76 L93 42" w={2.4} c="#a9744a" />
      <path d="M93 42 q6 -8 2 -14 q-8 4 -2 14z" fill={P.lime} />
      <Ln d="M84 62 l6 -2" w={2.5} />
      {/* body */}
      <path d="M28 54 Q23 91 50 91 Q77 91 72 54Z" fill="#f3dcb4" />
      <Hl x={35} y={72} rx={3} ry={8} r={10} />
      {/* satchel strap + leaf bag */}
      <Ln d="M30 60 L68 84" w={3} />
      <path d="M22 76 q4 -10 16 -8 q2 12 -8 16 q-9 0 -8 -8z" fill={P.moss} />
      <Ln d="M24 82 q6 -6 12 -12" w={2} />
      {/* arm */}
      <circle cx="74" cy="76" r="6.5" fill="#f3dcb4" />
      {/* face */}
      <Eye x={48} y={70} r={6.5} />
      <Eye x={64} y={70} r={6.5} />
      <Cheek x={41} y={79} r={4.5} />
      <Cheek x={69} y={79} r={4.5} />
      <Smile x={56} y={77} w={4.5} h={3} />
      {/* cap */}
      <path d="M12 52 Q10 12 50 12 Q90 12 88 52 Q88 60 78 60 L22 60 Q12 60 12 52Z" fill={P.cream} />
      <Ln d="M22 60 Q50 66 78 60" w={2.5} />
      <ellipse cx="34" cy="26" rx="9" ry="4.5" fill="#fff" opacity="0.7" transform="rotate(-25 34 26)" stroke="none" />
      <circle cx="64" cy="26" r="5.5" fill={P.beige} strokeWidth={2.5} />
      <circle cx="74" cy="44" r="4.5" fill={P.beige} strokeWidth={2.5} />
      <circle cx="42" cy="43" r="4" fill={P.beige} strokeWidth={2.5} />
      <circle cx="24" cy="46" r="3.5" fill={P.beige} strokeWidth={2.5} />
      <Dot x={49} y={20} r={2.2} c={P.beige} />
    </>
  );
}
