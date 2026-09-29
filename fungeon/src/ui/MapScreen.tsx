import { useEffect, useMemo, useRef } from 'react';
import { EnemyArt, Icon } from '../art';
import type { IconName } from '../art';
import { selectableNodes } from '../engine';
import type { MapNode } from '../engine';
import { ENEMIES } from '../content';
import { useGame } from './game';
import { useTip } from './kit';
import { ACT_NAMES } from './store';

const ROW = 88;
const TOP = 250; // room for the boss header
const BOT = 110;
const NODE_LABEL: Record<string, string> = {
  fight: 'Fight', elite: 'Elite fight', rest: 'Dewdrop Glade (rest)', shop: 'Shop', event: 'Mystery event', treasure: 'Treasure', boss: 'Boss',
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}
function nodePos(n: MapNode): { x: number; y: number } {
  const jx = (hash(n.id + 'x') - 0.5) * 5;
  const jy = (hash(n.id + 'y') - 0.5) * 22;
  const lane = n.floor === 11 ? 2 : n.lane;
  return { x: 10 + lane * 20 + jx * (n.floor === 11 ? 0 : 1), y: TOP + (11 - n.floor) * ROW + jy * (n.floor === 11 ? 0 : 1) };
}

export function MapScreen() {
  const { run, dispatch, busy } = useGame();
  const tip = useTip();
  const scroller = useRef<HTMLDivElement>(null);
  const map = run!.map;
  const selectable = useMemo(() => {
    try { return new Set(selectableNodes(run!)); } catch { return new Set<string>(); }
  }, [run]);
  const height = TOP + 11 * ROW + BOT;
  const startPos = { x: 50, y: TOP + 11 * ROW + 46 };

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const cur = map.current ? map.nodes[map.current] : null;
    const y = cur ? nodePos(cur).y : startPos.y;
    el.scrollTo({ top: Math.max(0, y - el.clientHeight * 0.62), behavior: 'auto' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map.current, map.act]);

  const visited = new Set(map.visited);
  const boss = ENEMIES[map.bossId];
  const nodes = Object.values(map.nodes);
  const edges: { a: { x: number; y: number }; b: { x: number; y: number }; lit: boolean; live: boolean; key: string }[] = [];
  for (const n of nodes) {
    for (const nx of n.next) {
      const t = map.nodes[nx];
      if (!t) continue;
      edges.push({
        a: nodePos(n), b: nodePos(t), key: `${n.id}>${nx}`,
        lit: visited.has(n.id) && visited.has(nx),
        live: n.id === map.current && selectable.has(nx),
      });
    }
  }
  if (!map.current) {
    for (const n of nodes) if (n.floor === 1) edges.push({ a: startPos, b: nodePos(n), key: `s>${n.id}`, lit: false, live: selectable.has(n.id) });
  }
  const curve = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const my = (a.y + b.y) / 2;
    return `M${a.x} ${a.y} C${a.x} ${my} ${b.x} ${my} ${b.x} ${b.y}`;
  };

  return (
    <div className="map-scroll" ref={scroller} data-testid="map">
      <div className="map" style={{ height }}>
        <svg className="map-svg" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden>
          {edges.map((e) => (
            <path key={e.key} d={curve(e.a, e.b)} className={`edge ${e.lit ? 'lit' : ''} ${e.live ? 'live' : ''}`} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <div className="map-boss" style={{ top: 18 }}>
          <div className="act-name">Act {map.act}</div>
          <h2>{ACT_NAMES[map.act]}</h2>
          <div className="boss-art"><EnemyArt id={map.bossId} size={110} /></div>
          <small>{boss?.name ?? 'Boss'}</small>
        </div>
        {!map.current && (
          <div className="map-start" style={{ left: `${startPos.x}%`, top: startPos.y }}>
            <Icon name="star" size={22} /><small>Start</small>
          </div>
        )}
        {nodes.map((n) => {
          const p = nodePos(n);
          const isCur = map.current === n.id;
          const vis = visited.has(n.id);
          const sel = selectable.has(n.id) && !busy;
          const cls = `node ${n.type} ${vis ? 'visited' : ''} ${isCur ? 'current' : ''} ${sel ? 'selectable' : ''}`;
          return (
            <button
              key={n.id}
              className={cls}
              style={{ left: `${p.x}%`, top: p.y }}
              data-testid={`node-${n.id}`}
              data-type={n.type}
              aria-label={`${NODE_LABEL[n.type]}, floor ${n.floor}`}
              onClick={(e) => (sel ? dispatch({ type: 'selectNode', nodeId: n.id }) : tip(e.currentTarget, { title: NODE_LABEL[n.type] ?? n.type, body: vis ? 'Already visited.' : 'Not reachable yet.' }))}
            >
              <Icon name={n.type as IconName} size={27} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
