import { useRef, useState, type ReactNode } from 'react';
import { Icon } from './components';

interface Drag {
  id: string;
  from: number;
  startY: number;
  dy: number;
  heights: number[];
}

/** A vertical list whose rows can be reordered by dragging their handle. */
export function Sortable<T>({
  items,
  getId,
  onReorder,
  children,
}: {
  items: T[];
  getId: (item: T) => string;
  onReorder: (ids: string[]) => void;
  children: (item: T, handle: ReactNode) => ReactNode;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const refs = useRef(new Map<string, HTMLDivElement>());

  const targetIndex = (d: Drag) => {
    let idx = d.from;
    let dy = d.dy;
    if (dy > 0) {
      while (idx < items.length - 1 && dy > d.heights[idx + 1] / 2) {
        dy -= d.heights[idx + 1];
        idx++;
      }
    } else {
      while (idx > 0 && -dy > d.heights[idx - 1] / 2) {
        dy += d.heights[idx - 1];
        idx--;
      }
    }
    return idx;
  };

  const to = drag ? targetIndex(drag) : -1;

  return (
    <>
      {items.map((item, i) => {
        const id = getId(item);
        let shift = 0;
        if (drag) {
          if (id === drag.id) shift = drag.dy;
          else if (drag.from < to && i > drag.from && i <= to) shift = -drag.heights[drag.from];
          else if (drag.from > to && i < drag.from && i >= to) shift = drag.heights[drag.from];
        }
        const handle = (
          <span
            className="handle"
            aria-label="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              const heights = items.map((x) => refs.current.get(getId(x))?.offsetHeight ?? 48);
              setDrag({ id, from: i, startY: e.clientY, dy: 0, heights });
            }}
            onPointerMove={(e) => {
              if (!drag || drag.id !== id) return;
              setDrag({ ...drag, dy: e.clientY - drag.startY });
            }}
            onPointerUp={() => {
              if (!drag) return;
              const target = targetIndex(drag);
              if (target !== drag.from) {
                const ids = items.map(getId);
                const [moved] = ids.splice(drag.from, 1);
                ids.splice(target, 0, moved);
                onReorder(ids);
              }
              setDrag(null);
            }}
            onPointerCancel={() => setDrag(null)}
          >
            <Icon name="grip" size={18} />
          </span>
        );
        return (
          <div
            key={id}
            ref={(el) => {
              if (el) refs.current.set(id, el);
              else refs.current.delete(id);
            }}
            className="sortable-item"
            style={{
              transform: shift ? `translateY(${shift}px)` : undefined,
              transition: drag && drag.id !== id ? 'transform 0.15s' : undefined,
              position: 'relative',
              zIndex: drag?.id === id ? 2 : undefined,
              background: drag?.id === id ? 'var(--surface-2)' : undefined,
            }}
          >
            {children(item, handle)}
          </div>
        );
      })}
    </>
  );
}
