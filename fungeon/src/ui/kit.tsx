// Small shared UI pieces: tooltips, sheets, buttons, bars, status chips.
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Art, Icon } from '../art';
import type { IconName } from '../art';
import type { StatusView } from '../engine';
import { audio } from '../art';

// ------------------------------------------------------------------ tooltips
export interface TipContent {
  title: string;
  body?: string;
  /** Extra glossary lines. */
  extra?: { name: string; text: string }[];
  art?: ReactNode;
}
interface TipState { content: TipContent; rect: DOMRect }
const TipCtx = createContext<(el: Element, c: TipContent) => void>(() => {});
export const useTip = () => useContext(TipCtx);

export function TipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<TipState | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; arrow: number } | null>(null);
  const show = useCallback((el: Element, content: TipContent) => {
    audio.play('click');
    setTip({ content, rect: el.getBoundingClientRect() });
  }, []);
  useEffect(() => {
    if (!tip) return;
    const close = () => setTip(null);
    const t = window.setTimeout(close, 6000);
    window.addEventListener('pointerdown', close, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('pointerdown', close, true);
    };
  }, [tip]);
  useLayoutEffect(() => {
    if (!tip || !ref.current) { setPos(null); return; }
    const app = document.querySelector('.app')?.getBoundingClientRect() ?? new DOMRect(0, 0, innerWidth, innerHeight);
    const w = ref.current.offsetWidth, h = ref.current.offsetHeight;
    const r = tip.rect;
    const cx = r.left + r.width / 2;
    let left = cx - w / 2;
    left = Math.max(app.left + 8, Math.min(app.right - w - 8, left));
    let top = r.bottom + 8;
    if (top + h > app.bottom - 8) top = r.top - h - 8;
    top = Math.max(app.top + 8, Math.min(app.bottom - h - 8, top));
    setPos({ left: left - app.left, top: top - app.top, arrow: Math.max(14, Math.min(w - 14, cx - left)) });
  }, [tip]);
  return (
    <TipCtx.Provider value={show}>
      {children}
      {tip && (
        <div className="tip" ref={ref} style={pos ? { left: pos.left, top: pos.top } : { visibility: 'hidden', left: 0, top: 0 }} role="tooltip" data-testid="tooltip">
          <div className="tip-head">
            {tip.content.art}
            <b>{tip.content.title}</b>
          </div>
          {tip.content.body && <p>{tip.content.body}</p>}
          {tip.content.extra?.map((e) => (
            <p key={e.name} className="tip-extra"><b>{e.name}</b> {e.text}</p>
          ))}
        </div>
      )}
    </TipCtx.Provider>
  );
}

// ------------------------------------------------------------------ sheet
export function Sheet({ title, onClose, children, tall, testid }: { title?: string; onClose?: () => void; children: ReactNode; tall?: boolean; testid?: string }) {
  return (
    <div className="sheet-wrap" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }} data-testid={testid}>
      <div className={`sheet ${tall ? 'tall' : ''}`} role="dialog" aria-label={title}>
        <div className="sheet-head">
          <h2>{title}</h2>
          {onClose && (
            <button className="icon-btn" onClick={() => { audio.play('click'); onClose(); }} aria-label="Close" data-testid="sheet-close">
              <Icon name="close" size={22} />
            </button>
          )}
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ buttons
export function Btn({ children, onClick, kind = 'primary', disabled, testid, big, icon, className = '' }: {
  children: ReactNode; onClick?: () => void; kind?: 'primary' | 'secondary' | 'danger' | 'ghost'; disabled?: boolean; testid?: string; big?: boolean; icon?: IconName; className?: string;
}) {
  return (
    <button
      className={`btn ${kind} ${big ? 'big' : ''} ${className}`}
      disabled={disabled}
      data-testid={testid}
      onClick={() => { audio.play('click'); onClick?.(); }}
    >
      {icon && <Icon name={icon} size={20} />}
      <span>{children}</span>
    </button>
  );
}

// ------------------------------------------------------------------ bars
export function HpBar({ hp, max, block, small }: { hp: number; max: number; block?: number; small?: boolean }) {
  const pct = Math.max(0, Math.min(100, (hp / Math.max(1, max)) * 100));
  return (
    <div className={`hpbar ${small ? 'small' : ''}`} aria-label={`HP ${hp} of ${max}`}>
      <div className={`hpbar-fill ${block ? 'has-block' : ''}`} style={{ width: `${pct}%` }} />
      {!!block && block > 0 && (
        <div className="hpbar-block"><Icon name="block" size={small ? 12 : 16} /><b>{block}</b></div>
      )}
      <span className="hpbar-text">{hp}/{max}</span>
    </div>
  );
}

// ------------------------------------------------------------------ status chips
export function StatusRow({ views, size = 20 }: { views: StatusView[]; size?: number }) {
  const tip = useTip();
  if (!views.length) return null;
  return (
    <div className="status-row">
      {views.map((s) => (
        <button
          key={s.id}
          className={`status ${s.kind}`}
          data-testid={`status-${s.id}`}
          onClick={(e) => { e.stopPropagation(); tip(e.currentTarget, { title: `${s.name}${s.showNumber ? ` ${s.n}` : ''}`, body: s.desc, art: <Art k={s.icon} size={24} /> }); }}
          aria-label={`${s.name} ${s.n}`}
        >
          <Art k={s.icon} size={size} />
          {s.showNumber && <i>{s.n}</i>}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ hooks
export function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [w, setW] = useState(360);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const upd = () => setW(el.clientWidth);
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

export function Loot({ art, title, sub, price, sold, disabled, onClick, testid, rarity }: {
  art: ReactNode; title: string; sub?: string; price?: number; sold?: boolean; disabled?: boolean; onClick?: () => void; testid?: string; rarity?: string;
}) {
  return (
    <button className={`loot ${sold ? 'sold' : ''} ${rarity ?? ''}`} onClick={onClick} disabled={disabled && !onClick} data-testid={testid}>
      <div className="loot-art">{art}</div>
      <div className="loot-text"><b>{title}</b>{sub && <small>{sub}</small>}</div>
      {price !== undefined && !sold && (
        <span className={`price ${disabled ? 'poor' : ''}`}><Icon name="acorn" size={16} />{price}</span>
      )}
      {sold && <span className="sold-tag">SOLD</span>}
    </button>
  );
}
