import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Tier } from '../engine/types';
import { fmt } from '../engine/weights';
import { GHOST_WORDS, type Quote } from '../data/quotes';

// Icons - outline style, 24px grid.

const PATHS: Record<string, string> = {
  barbell: 'M2 12h1M6 8h-2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2M6 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1M9 12h6M15 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1M18 8h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M22 12h-1',
  history: 'M12 8v4l2 2M3.05 11a9 9 0 1 1 .5 4M3 20v-5h5',
  chart: 'M4 19l4-6 4 2 4-5 4 4M4 4v16h16',
  list: 'M9 6h11M9 12h11M9 18h11M5 6v.01M5 12v.01M5 18v.01',
  check: 'M5 12l5 5L20 7',
  down: 'M6 9l6 6 6-6',
  up: 'M6 15l6-6 6 6',
  right: 'M9 6l6 6-6 6',
  left: 'M15 6l-6 6 6 6',
  back: 'M5 12h14M5 12l6 6M5 12l6-6',
  dots: 'M12 5v.01M12 12v.01M12 19v.01',
  alert: 'M12 9v4M12 17h.01M10.36 3.6L2.4 17a1.9 1.9 0 0 0 1.64 2.85h15.92A1.9 1.9 0 0 0 21.6 17L13.64 3.6a1.9 1.9 0 0 0-3.28 0z',
  clock: 'M12 7v5l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  search: 'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-6-6',
  settings:
    'M10.33 4.32c.43-1.76 2.92-1.76 3.35 0a1.72 1.72 0 0 0 2.57 1.07c1.54-.94 3.3.82 2.37 2.37a1.72 1.72 0 0 0 1.06 2.57c1.76.43 1.76 2.92 0 3.35a1.72 1.72 0 0 0-1.07 2.57c.94 1.54-.82 3.3-2.37 2.37a1.72 1.72 0 0 0-2.57 1.06c-.43 1.76-2.92 1.76-3.35 0a1.72 1.72 0 0 0-2.57-1.07c-1.54.94-3.3-.82-2.37-2.37a1.72 1.72 0 0 0-1.06-2.57c-1.76-.43-1.76-2.92 0-3.35a1.72 1.72 0 0 0 1.07-2.57c-.94-1.54.82-3.3 2.37-2.37 1 .61 2.3.07 2.57-1.06zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M6 12h12',
  arrowUp: 'M7 17L17 7M8 7h9v9',
  grip: 'M9 5v.01M9 12v.01M9 19v.01M15 5v.01M15 12v.01M15 19v.01',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3',
  replace: 'M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4',
  skip: 'M4 5v14l12-7zM20 5v14',
  download: 'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5 5-5M12 4v12',
  upload: 'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 9l5-5 5 5M12 4v12',
  quote: 'M10 11H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6c0 2.67-1.33 4.33-4 5M19 11h-4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6c0 2.67-1.33 4.33-4 5',
  x: 'M18 6L6 18M6 6l12 12',
  books: 'M5 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM9 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H9M5 8h4M9 16h4M13.8 8.1l3.87-1a1 1 0 0 1 1.22.72l3.1 12.3a1 1 0 0 1-.72 1.22l-3.88 1a1 1 0 0 1-1.22-.72L13.08 9.3a1 1 0 0 1 .72-1.2z',
  bell: 'M10 5a2 2 0 1 1 4 0 7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H4a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6M9 17v1a3 3 0 0 0 6 0v-1',
  phone: 'M6 5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2zM11 4h2M12 17v.01',
  vibrate: 'M8 5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1zM3 8l2 2-2 2 2 2M21 8l-2 2 2 2-2 2',
  percent: 'M17 17v.01M7 7v.01M5 19L19 5M7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  undo: 'M9 14l-4-4 4-4M5 10h11a4 4 0 1 1 0 8h-1',
  eye: 'M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0M21 12c-2.4 4-5.4 6-9 6s-6.6-2-9-6c2.4-4 5.4-6 9-6s6.6 2 9 6',
  eyeOff: 'M10.58 10.59a2 2 0 0 0 2.83 2.83M9.36 5.37A9.9 9.9 0 0 1 12 5c4 0 7.33 2.33 10 7-.78 1.37-1.62 2.52-2.52 3.47M17.36 17.35C15.9 18.45 14.1 19 12 19c-4 0-7.33-2.33-10-7 1.24-2.17 2.66-3.8 4.24-4.9M3 3l18 18',
};

export function Icon({ name, size = 20, className, style }: { name: string; size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d={PATHS[name] ?? ''} />
    </svg>
  );
}

export function Tag({ tier }: { tier: Tier }) {
  return <span className={`tag t${tier}`}>T{tier}</span>;
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button className={`toggle ${on ? 'on' : ''}`} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />;
}

export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="grab" />
        {children}
      </div>
    </div>
  );
}

export function Stepper({
  value,
  onDec,
  onInc,
  onTap,
  unit,
  display,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
  onTap?: () => void;
  unit?: string;
  display?: string;
}) {
  return (
    <div className="stepper">
      <button className="step" onClick={onDec} aria-label="Decrease">
        −
      </button>
      <div className="val">
        <button onClick={onTap} disabled={!onTap}>
          {display ?? fmt(value)}
          {unit && <span className="mu" style={{ fontSize: 15 }}> {unit}</span>}
        </button>
      </div>
      <button className="step" onClick={onInc} aria-label="Increase">
        +
      </button>
    </div>
  );
}

/** Number entry sheet, used for reps and for typing an exact weight. */
export function NumPad({
  title,
  subtitle,
  initial,
  decimal,
  onDone,
  onClose,
  extra,
}: {
  title: string;
  subtitle?: string;
  initial: number | null;
  decimal?: boolean;
  onDone: (v: number) => void;
  onClose: () => void;
  extra?: ReactNode;
}) {
  const [text, setText] = useState(initial == null ? '' : String(initial));
  const [fresh, setFresh] = useState(true);
  const press = (k: string) => {
    setText((t) => {
      const base = fresh ? '' : t;
      if (k === '.') return base.includes('.') ? base : (base || '0') + '.';
      if (base.length >= 6) return base;
      return base === '0' ? k : base + k;
    });
    setFresh(false);
  };
  const back = () => {
    setFresh(false);
    setText((t) => t.slice(0, -1));
  };
  const value = parseFloat(text);
  return (
    <Sheet onClose={onClose}>
      <div style={{ padding: '0 16px' }}>
        <h2>{title}</h2>
        {subtitle && <div className="mu small">{subtitle}</div>}
      </div>
      <div className="numpad-val">{text || '0'}</div>
      <div className="numpad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
          <button key={k} onClick={() => press(k)}>
            {k}
          </button>
        ))}
        <button onClick={() => (decimal ? press('.') : undefined)} style={{ opacity: decimal ? 1 : 0.3 }} aria-label="Decimal point">
          {decimal ? '.' : ''}
        </button>
        <button onClick={() => press('0')}>0</button>
        <button onClick={back} aria-label="Delete">
          ⌫
        </button>
      </div>
      <div className="pad btn-row">
        {extra}
        <button className="btn primary big" style={{ flex: 2 }} onClick={() => onDone(Number.isFinite(value) ? value : 0)}>
          Save
        </button>
      </div>
    </Sheet>
  );
}

// Chalkboard quote

/** The SVG filter that roughens text into chalk. Render once near the root. */
export function ChalkFilter() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <filter id="chalk" x="-5%" y="-15%" width="110%" height="130%">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} seed={3} result="w" />
        <feDisplacementMap in="SourceGraphic" in2="w" scale={3} xChannelSelector="R" yChannelSelector="G" result="d" />
        <feTurbulence type="fractalNoise" baseFrequency="1.8" numOctaves={1} seed={7} result="g" />
        <feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 3.2 0 0 0 -0.95" result="m" />
        <feComposite in="d" in2="m" operator="in" />
      </filter>
    </svg>
  );
}

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function splitLines(text: string, max = 22): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > max) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function Chalk({ text, by, seed = 0, maxChars = 22, size = 16 }: { text: string; by?: string; seed?: number; maxChars?: number; size?: number }) {
  const layout = useMemo(() => {
    const rnd = seeded(hash(text) + seed * 7919 + 1);
    let indent = 0;
    return splitLines(text, maxChars).map((line) => {
      const rot = -(0.6 + rnd() * 2.2);
      indent = Math.min(34, indent + 4 + rnd() * 12);
      return { line, rot, indent };
    });
  }, [text, seed, maxChars]);
  return (
    <div className="chalk" style={{ fontSize: size }}>
      {layout.map((l, i) => (
        <span key={i} className="line" style={{ transform: `rotate(${l.rot.toFixed(2)}deg) translateX(${i === 0 ? 0 : l.indent.toFixed(0)}px)` }}>
          {l.line}
        </span>
      ))}
      {by && (
        <span className="by" style={{ transform: `rotate(${-(1.5 + (hash(by) % 20) / 10)}deg)` }}>
          — {by}
        </span>
      )}
    </div>
  );
}

export function QuoteBoard({ quote, seed, onTap }: { quote: Quote | undefined; seed: number; onTap?: () => void }) {
  const ghost = GHOST_WORDS[seed % GHOST_WORDS.length];
  if (!quote) return null;
  return (
    <div className={`board ${onTap ? 'tap' : ''}`} onClick={onTap} role={onTap ? 'button' : undefined} aria-label={`${quote.text} — ${quote.by}`}>
      <div className="ghost">{ghost}</div>
      <Chalk text={quote.text} by={quote.by} seed={seed} />
    </div>
  );
}

/** Press-and-hold detection that still lets a normal tap through. */
export function useLongPress(onLong: () => void, onTap: () => void, ms = 450) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  return {
    onPointerDown: () => {
      fired.current = false;
      clear();
      timer.current = setTimeout(() => {
        fired.current = true;
        navigator.vibrate?.(15);
        onLong();
      }, ms);
    },
    onPointerUp: () => {
      clear();
      if (!fired.current) onTap();
    },
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatRest(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
