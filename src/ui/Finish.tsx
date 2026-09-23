import { useApp } from '../data/store';
import { bestSet } from '../engine/estimates';
import { variantAt } from '../engine/rotation';
import { schemeLabel } from '../engine/schemes';
import { fmt } from '../engine/weights';
import { Chalk, formatDuration, Tag } from './components';

const SIGN_OFFS = ['Good work.', 'Solid.', 'Done. Well earned.', 'That counts.', 'Nice session.'];
const AFTER = ['Eat something.', 'Go eat.', 'Sleep well.', 'Drink some water.', 'Rest up.'];

export function Finish({ sessionId, go }: { sessionId: string; go: (to: string) => void }) {
  const s = useApp();
  const idx = s.sessions.findIndex((x) => x.id === sessionId);
  const session = s.sessions[idx];
  if (!session) {
    return (
      <div className="screen">
        <div className="empty">
          <h3>Session not found</h3>
          <button className="btn primary" onClick={() => go('today')}>
            Back to today
          </button>
        </div>
      </div>
    );
  }
  const earlier = s.sessions.slice(0, idx);

  // New best estimated 1RM - biggest improvement over any earlier session of the same exercise.
  let best: { name: string; e1: number; gain: number } | null = null;
  for (const it of session.items) {
    if (it.outcome === 'skipped') continue;
    const b = bestSet(it.sets, it.weight);
    if (!b) continue;
    let prev = 0;
    for (const ss of earlier)
      for (const p of ss.items) if (p.exerciseId === it.exerciseId) prev = Math.max(prev, bestSet(p.sets, p.weight)?.e1 ?? 0);
    if (prev > 0 && b.e1 > prev + 0.05 && (!best || b.e1 - prev > best.gain)) best = { name: it.exerciseName, e1: b.e1, gain: b.e1 - prev };
  }

  const sets = session.items.reduce((n, i) => n + i.sets.filter((x) => x.reps != null).length, 0);
  const pick = (arr: string[]) => arr[(session.start / 1000) % arr.length | 0];
  const next = variantAt(s.nextIndex);

  return (
    <div className="screen">
      <div className="head">
        <div>
          <div className="eyebrow">Session {s.sessions.length} · done</div>
          <h1 style={{ fontSize: 40 }}>{session.variant} complete</h1>
        </div>
      </div>
      <div className="stats">
        <div className="stat">
          <div className="label">Time</div>
          <div className="val">{formatDuration((session.end ?? Date.now()) - session.start)}</div>
        </div>
        <div className="stat">
          <div className="label">Sets</div>
          <div className="val">{sets}</div>
        </div>
        <div className="stat" style={best ? { borderColor: 'var(--accent)' } : undefined}>
          <div className="label">{best ? `New best · ${best.name}` : 'New best'}</div>
          <div className="val" style={best ? { color: 'var(--accent)' } : { color: 'var(--muted)' }}>
            {best ? `e1 ${Math.round(best.e1)}` : '–'}
          </div>
        </div>
      </div>

      <div className="sec">Next time</div>
      <div className="group">
        {session.items.map((it) => {
          const diff = it.nextWeight != null ? Math.round((it.nextWeight - it.weight) * 100) / 100 : 0;
          const label =
            it.outcome === 'up'
              ? { t: `+${fmt(diff)}`, c: 'accent' }
              : it.outcome === 'missed'
                ? { t: 'missed', c: 'miss' }
                : it.outcome === 'skipped'
                  ? { t: 'skipped', c: 'mu' }
                  : { t: 'same', c: 'mu' };
          return (
            <div className="row" key={it.id}>
              <Tag tier={it.tier} />
              <div className="grow name">
                {it.exerciseName}{' '}
                <span className="mu small">
                  {it.swapped ? 'swapped in' : schemeLabel(it.tier, it.track, it.nextStage ?? it.stage)}
                </span>
              </div>
              <span className="w">{fmt(it.nextWeight ?? it.weight)}</span>
              <span className={`delta ${label.c}`} style={{ minWidth: 52 }}>
                {label.t}
              </span>
            </div>
          );
        })}
      </div>

      <div className="board">
        <Chalk text={`${pick(SIGN_OFFS)} ${next} is next. ${pick(AFTER)}`} seed={session.start % 97} maxChars={20} size={15} />
      </div>

      <div className="pad">
        <button className="btn primary big" onClick={() => go('today')}>
          Done
        </button>
      </div>
    </div>
  );
}
