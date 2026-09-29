import type { ReactNode } from 'react';
import { INK, P } from './palette';

export { INK, P };
/** Shared stroke props for every drawn shape. */
export const S = { stroke: INK, strokeWidth: 3.5, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;
const N = { stroke: 'none' } as const;

/** Big dark eye with two white glints. */
export const Eye = ({ x, y, r = 6 }: { x: number; y: number; r?: number }) => (
  <g {...N}>
    <circle cx={x} cy={y} r={r} fill={INK} />
    <circle cx={x - r * 0.3} cy={y - r * 0.35} r={r * 0.4} fill="#fff" />
    <circle cx={x + r * 0.38} cy={y + r * 0.35} r={r * 0.17} fill="#fff" />
  </g>
);
/** White-of-eye version with a pupil looking left. */
export const WEye = ({ x, y, r = 7, c = '#fff' }: { x: number; y: number; r?: number; c?: string }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill={c} strokeWidth={2.5} />
    <circle cx={x - r * 0.28} cy={y + r * 0.05} r={r * 0.55} fill={INK} stroke="none" />
    <circle cx={x - r * 0.45} cy={y - r * 0.2} r={r * 0.2} fill="#fff" stroke="none" />
  </g>
);
export const Cheek = ({ x, y, r = 4 }: { x: number; y: number; r?: number }) => (
  <ellipse cx={x} cy={y} rx={r} ry={r * 0.7} fill={P.pink} opacity={0.75} {...N} />
);
/** Soft highlight blob. */
export const Hl = ({ x, y, rx = 6, ry = 3, r = 0, o = 0.4 }: { x: number; y: number; rx?: number; ry?: number; r?: number; o?: number }) => (
  <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#fff" opacity={o} transform={`rotate(${r} ${x} ${y})`} {...N} />
);
/** Line/curve without fill. */
export const Ln = ({ d, w = 3, c }: { d: string; w?: number; c?: string }) => (
  <path d={d} fill="none" strokeWidth={w} {...(c ? { stroke: c } : {})} />
);
export const Smile = ({ x, y, w = 7, h = 5 }: { x: number; y: number; w?: number; h?: number }) => (
  <path d={`M${x - w} ${y} Q${x} ${y + h * 1.6} ${x + w} ${y}`} fill="none" strokeWidth={2.5} />
);
export const Spark = ({ x, y, s = 6, c = '#fff', o = 1 }: { x: number; y: number; s?: number; c?: string; o?: number }) => (
  <path d={`M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`} fill={c} opacity={o} stroke="none" />
);
export const Dot = ({ x, y, r = 3, c = '#fff', o = 1 }: { x: number; y: number; r?: number; c?: string; o?: number }) => (
  <circle cx={x} cy={y} r={r} fill={c} opacity={o} stroke="none" />
);
export const Shadow = ({ rx = 30, cx = 50, cy = 92 }: { rx?: number; cx?: number; cy?: number }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={4.5} fill="#000" opacity={0.2} {...N} />
);
export const Wrap = ({ children }: { children: ReactNode }) => <g {...S}>{children}</g>;
