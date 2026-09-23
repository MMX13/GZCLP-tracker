import { useMemo, useState } from 'react';
import { useApp } from '../data/store';
import { bestSet, e5rm } from '../engine/estimates';
import { schemeLabel } from '../engine/schemes';
import type { Tier } from '../engine/types';
import { fmt } from '../engine/weights';
import { Tag } from './components';
import { shortDate, weekStart } from './helpers';

const RANGES = [
  { key: '1M', days: 31 },
  { key: '3M', days: 92 },
  { key: '6M', days: 183 },
  { key: 'All', days: Infinity },
] as const;

const TIER_COLOUR: Record<Tier, string> = { 1: '#e8702a', 2: '#d8cdb8', 3: '#8a8e95' };

interface Point {
  t: number;
  tier: Tier;
  weight: number;
  e1: number;
  best: { weight: number; reps: number } | null;
  scheme: string;
  id: string;
}

export function Progress() {
  const s = useApp();
  const used = useMemo(() => {
    const seen = new Map<string, number>();
    for (const x of s.sessions) for (const i of x.items) if (i.outcome !== 'skipped') seen.set(i.exerciseId, x.start);
    return s.exercises.filter((e) => seen.has(e.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [s.sessions, s.exercises]);

  const [exId, setExId] = useState<string | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('3M');
  const selected = used.find((e) => e.id === exId) ?? used[0];

  const all: Point[] = useMemo(() => {
    if (!selected) return [];
    const pts: Point[] = [];
    for (const x of s.sessions)
      for (const i of x.items) {
        if (i.exerciseId !== selected.id || i.outcome === 'skipped') continue;
        const b = bestSet(i.sets, i.weight);
        pts.push({
          t: x.start,
          tier: i.tier,
          weight: i.weight,
          e1: b?.e1 ?? 0,
          best: b ? { weight: b.weight, reps: b.reps } : null,
          scheme: schemeLabel(i.tier, i.track, i.stage),
          id: i.id,
        });
      }
    return pts;
  }, [s.sessions, selected]);

  if (!selected) {
    return (
      <div className="screen with-nav">
        <div className="head">
          <div>
            <div className="eyebrow">Progress</div>
            <h1>No data yet</h1>
          </div>
        </div>
        <div className="empty">
          <p>Finish a session and your lifts, estimated maxes and trends show up here.</p>
        </div>
      </div>
    );
  }

  const days = RANGES.find((r) => r.key === range)!.days;
  const cutoff = Number.isFinite(days) ? Date.now() - days * 86400000 : -Infinity;
  const pts = all.filter((p) => p.t >= cutoff);

  const top = pts.reduce<Point | null>((m, p) => (!m || p.e1 > m.e1 ? p : m), null);
  const firstWeek = pts.length ? weekStart(pts[0].t) : 0;
  const startBest = pts.filter((p) => weekStart(p.t) === firstWeek).reduce((m, p) => Math.max(m, p.e1), 0);
  const gain = top && startBest ? top.e1 - startBest : 0;

  return (
    <div className="screen with-nav">
      <div className="head" style={{ alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">Progress</div>
          <select className="picker" value={selected.id} onChange={(e) => setExId(e.target.value)} aria-label="Exercise">
            {used.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="label">Est. 1RM</div>
          <div className="val">
            {top ? Math.round(top.e1) : '–'}
            <span className="mu" style={{ fontSize: 15 }}> kg</span>
          </div>
          <div className={`small ${gain > 0 ? 'accent' : 'mu'}`}>{gain > 0 ? `+${Math.round(gain)} kg` : 'no change'}</div>
        </div>
        <div className="stat">
          <div className="label">Est. 5RM</div>
          <div className="val">
            {top ? Math.round(e5rm(top.e1)) : '–'}
            <span className="mu" style={{ fontSize: 15 }}> kg</span>
          </div>
          <div className="small mu">{gain > 0 ? `+${Math.round(e5rm(gain))} kg` : ' '}</div>
        </div>
        <div className="stat">
          <div className="label">Best set</div>
          <div className="val">{top?.best ? fmt(top.best.weight) : '–'}</div>
          <div className="small mu">{top?.best ? `× ${top.best.reps} reps` : ' '}</div>
        </div>
      </div>

      <div className="chart-wrap">
        <Chart pts={pts} />
        <div className="legend">
          {([1, 2, 3] as Tier[])
            .filter((t) => pts.some((p) => p.tier === t))
            .map((t) => (
              <span key={t}>
                <svg width="18" height="8" aria-hidden="true">
                  <line x1="0" y1="4" x2="18" y2="4" stroke={TIER_COLOUR[t]} strokeWidth="2" />
                  <circle cx="9" cy="4" r="3" fill={TIER_COLOUR[t]} />
                </svg>
                T{t} weight
              </span>
            ))}
          <span>
            <svg width="10" height="10" aria-hidden="true">
              <circle cx="5" cy="5" r="3.5" fill="none" stroke="#ece7dd" strokeWidth="1.5" />
            </svg>
            Best est. 1RM per week
          </span>
        </div>
      </div>

      <div className="chips" style={{ padding: '10px 12px 12px', justifyContent: 'center' }}>
        {RANGES.map((r) => (
          <button key={r.key} className={`chip ${range === r.key ? 'on' : ''}`} onClick={() => setRange(r.key)}>
            {r.key}
          </button>
        ))}
      </div>

      {pts.length > 0 && (
        <div className="group">
          {[...pts]
            .reverse()
            .slice(0, 30)
            .map((p) => (
              <div className="row" key={p.id} style={{ fontSize: 13, padding: '8px 14px' }}>
                <Tag tier={p.tier} />
                <div className="grow">
                  {shortDate(p.t)} <span className="mu">{p.scheme}</span>
                </div>
                <span className="w" style={{ fontSize: 16 }}>
                  {fmt(p.weight)}
                </span>
                <span className="cd mu" style={{ fontSize: 14, minWidth: 52, textAlign: 'right' }}>
                  e1 {Math.round(p.e1)}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function niceTicks(lo: number, hi: number, count = 4): number[] {
  const span = hi - lo || 1;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

function Chart({ pts }: { pts: Point[] }) {
  const W = 330;
  const H = 200;
  const x0 = 36;
  const x1 = W - 10;
  const y0 = H - 22;
  const y1 = 10;
  if (pts.length === 0) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="No sessions in this range">
        <text x={W / 2} y={H / 2} textAnchor="middle" fill="#9a958b" fontSize="13">
          No sessions in this range
        </text>
      </svg>
    );
  }

  // Best estimate per week.
  const weekly = new Map<number, Point>();
  for (const p of pts) {
    const w = weekStart(p.t);
    const cur = weekly.get(w);
    if (p.e1 > 0 && (!cur || p.e1 > cur.e1)) weekly.set(w, p);
  }
  const est = [...weekly.values()];

  const values = [...pts.map((p) => p.weight), ...est.map((p) => p.e1)].filter((v) => v > 0);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  const pad = Math.max(2.5, (hi - lo) * 0.1);
  lo = Math.max(0, lo - pad);
  hi = hi + pad;
  const tMin = pts[0].t;
  const tMax = pts[pts.length - 1].t;
  const X = (t: number) => (tMax === tMin ? (x0 + x1) / 2 : x0 + ((t - tMin) / (tMax - tMin)) * (x1 - x0));
  const Y = (v: number) => y0 - ((v - lo) / (hi - lo)) * (y0 - y1);

  const months: { t: number; label: string }[] = [];
  const d = new Date(tMin);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + 1);
  while (d.getTime() <= tMax) {
    months.push({ t: d.getTime(), label: d.toLocaleString(undefined, { month: 'short' }) });
    d.setMonth(d.getMonth() + 1);
  }
  if (months.length === 0) months.push({ t: tMin, label: new Date(tMin).toLocaleString(undefined, { month: 'short' }) });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Working weight by tier and best estimated 1RM per week">
      {niceTicks(lo, hi).map((v) => (
        <g key={v}>
          <line x1={x0} x2={x1} y1={Y(v)} y2={Y(v)} stroke="#34322e" strokeWidth="1" />
          <text x={x0 - 6} y={Y(v) + 4} textAnchor="end" fill="#9a958b" fontSize="11" fontFamily="var(--cond)">
            {fmt(v)}
          </text>
        </g>
      ))}
      {months.map((m) => (
        <text key={m.t} x={Math.min(x1 - 12, Math.max(x0, X(m.t)))} y={H - 4} fill="#9a958b" fontSize="11" fontFamily="var(--cond)">
          {m.label}
        </text>
      ))}
      {est.map((p) => (
        <circle key={`e${p.id}`} cx={X(p.t)} cy={Y(p.e1)} r="4" fill="none" stroke="#ece7dd" strokeWidth="1.5" />
      ))}
      {([1, 2, 3] as Tier[]).map((tier) => {
        const q = pts.filter((p) => p.tier === tier);
        if (!q.length) return null;
        const d = q.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)} ${Y(p.weight).toFixed(1)}`).join('');
        return (
          <g key={tier}>
            <path d={d} fill="none" stroke={TIER_COLOUR[tier]} strokeWidth="2" strokeLinejoin="round" />
            {q.map((p) => (
              <circle key={p.id} cx={X(p.t)} cy={Y(p.weight)} r="3.5" fill={TIER_COLOUR[tier]} stroke="#252421" strokeWidth="1.5" />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
