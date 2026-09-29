// The fanned hand: tap to select/play, drag up to play, long-press to zoom.
import { useRef, useState } from 'react';
import { audio } from '../art';
import type { CardView } from '../engine';
import { CardFace } from './Card';
import { useWidth } from './kit';

interface Props {
  views: CardView[];
  sel: number | null;
  disabled: boolean;
  onTap: (uid: number) => void;
  onDrop: (uid: number, enemy: string | null, upFar: boolean) => void;
  onZoom: (v: CardView) => void;
  onHover: (enemy: string | null) => void;
  onDragging: (uid: number | null) => void;
}

interface DragState { uid: number; dx: number; dy: number }

function enemyAt(x: number, y: number): string | null {
  const els = document.elementsFromPoint(x, y);
  for (const el of els) {
    const e = (el as HTMLElement).closest?.('[data-enemy-uid]') as HTMLElement | null;
    if (e) return e.dataset.enemyUid ?? null;
  }
  return null;
}

export function Hand({ views, sel, disabled, onTap, onDrop, onZoom, onHover, onDragging }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const W = useWidth(ref);
  const n = views.length;
  const cw = Math.max(88, Math.min(132, Math.round(W * 0.3)));
  const ch = Math.round(cw * 1.42);
  const step = n <= 1 ? 0 : Math.min(cw * 0.94, (W - cw - 10) / (n - 1));
  const x0 = (W - (cw + step * (n - 1))) / 2;
  const [drag, setDrag] = useState<DragState | null>(null);
  const st = useRef<{ uid: number; x: number; y: number; id: number; timer: number; moved: boolean; long: boolean } | null>(null);

  const down = (e: React.PointerEvent, v: CardView) => {
    if (disabled) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const s = { uid: v.uid, x: e.clientX, y: e.clientY, id: e.pointerId, timer: 0, moved: false, long: false };
    s.timer = window.setTimeout(() => {
      if (!s.moved) { s.long = true; onZoom(v); audio.play('select'); }
    }, 480);
    st.current = s;
  };
  const move = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (!s.moved && Math.hypot(dx, dy) > 12) {
      s.moved = true;
      window.clearTimeout(s.timer);
      if (dy < -8) { onDragging(s.uid); audio.play('select'); }
    }
    if (s.moved && dy < -8) {
      setDrag({ uid: s.uid, dx, dy });
      onHover(enemyAt(e.clientX, e.clientY));
    } else if (s.moved) setDrag(null);
  };
  const up = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s || s.id !== e.pointerId) return;
    window.clearTimeout(s.timer);
    st.current = null;
    const dy = e.clientY - s.y;
    if (drag && drag.uid === s.uid) {
      const enemy = enemyAt(e.clientX, e.clientY);
      setDrag(null);
      onHover(null);
      onDragging(null);
      onDrop(s.uid, enemy, dy < -90);
    } else if (!s.moved && !s.long) onTap(s.uid);
    else onDragging(null);
  };
  const cancel = () => {
    if (st.current) window.clearTimeout(st.current.timer);
    st.current = null;
    setDrag(null);
    onHover(null);
    onDragging(null);
  };

  return (
    <div className="hand" ref={ref} style={{ height: ch + 34 }} data-testid="hand">
      {views.map((v, i) => {
        const off = i - (n - 1) / 2;
        const rot = off * (n > 7 ? 2.2 : 3.4);
        const dropY = Math.abs(off) ** 2 * (n > 7 ? 1 : 1.8);
        const isSel = sel === v.uid;
        const isDrag = drag?.uid === v.uid;
        let tf = `translateY(${dropY + 24}px) rotate(${rot}deg)`;
        if (isDrag) tf = `translate(${drag!.dx}px, ${drag!.dy + 24}px) scale(1.12)`;
        else if (isSel) tf = `translateY(-14px) scale(1.14)`;
        return (
          <div
            key={v.uid}
            className={`hand-slot ${isSel ? 'sel' : ''} ${isDrag ? 'drag' : ''}`}
            style={{ left: x0 + i * step, width: cw, height: ch, transform: tf, zIndex: isDrag ? 100 : isSel ? 60 : i + 1, ['--enter' as string]: `${i * 45}ms` }}
            onPointerDown={(e) => down(e, v)}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={cancel}
            onContextMenu={(e) => e.preventDefault()}
            data-testid={`card-${v.uid}`}
            data-card={v.id}
            data-playable={v.playable ? '1' : '0'}
            role="button"
            aria-label={`${v.name}, ${v.text}`}
          >
            <CardFace v={v} w={cw} dim={!v.playable} selected={isSel} />
          </div>
        );
      })}
    </div>
  );
}
