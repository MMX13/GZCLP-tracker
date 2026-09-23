import { useMemo } from 'react';
import { loadStarter, nextQuote, startSession, exportData } from '../data/actions';
import { useApp } from '../data/store';
import { buildSession } from '../engine/progression';
import { VARIANTS, variantAt, variantDay } from '../engine/rotation';
import { itemSchemeLabel } from '../engine/schemes';
import { fmt } from '../engine/weights';
import { QuoteBoard, Tag } from './components';
import { currentQuote, deltaLabel, estimateMinutes, exMap, lastLifted, sinceLabel } from './helpers';

export function Today({ go }: { go: (to: string) => void }) {
  const s = useApp();
  const variant = variantAt(s.nextIndex);
  const day = variantDay(variant);
  const preview = useMemo(() => buildSession(variant, s.slots, s.exercises, s.settings.deloadPct), [variant, s.slots, s.exercises, s.settings.deloadPct]);
  const exercises = exMap(s);
  const last = s.sessions[s.sessions.length - 1];
  const t1Count = s.slots.filter((x) => x.day === day && x.tier === 1).length;
  const quote = currentQuote(s);

  const now = Date.now();
  const firstSession = s.sessions[0]?.start;
  const backupDue =
    s.settings.backupReminder &&
    s.sessions.length > 0 &&
    now - (s.settings.lastBackup ?? firstSession ?? now) > 7 * 86400000;

  if (s.slots.length === 0) {
    return (
      <div className="screen with-nav">
        <div className="head">
          <div>
            <div className="eyebrow">Welcome</div>
            <h1>Today</h1>
          </div>
        </div>
        <QuoteBoard quote={quote} seed={s.quoteCursor} onTap={nextQuote} />
        <div className="empty">
          <h3>Set up your program</h3>
          <p>Add two main lifts to day A and day B, plus any secondary lifts and accessories.</p>
        </div>
        <div className="pad" style={{ display: 'grid', gap: 8 }}>
          <button className="btn primary big" onClick={() => go('program')}>
            Build program
          </button>
          <button className="btn block" onClick={loadStarter}>
            Load a starter program to edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen with-nav">
      <div className="head">
        <div>
          <div className="eyebrow">Up next · {sinceLabel(last?.end)}</div>
          <h1 style={{ fontSize: 40 }}>Day {variant}</h1>
        </div>
        <div className="mu small" style={{ textAlign: 'right' }}>
          {preview.items.length} lifts
          <br />~{estimateMinutes(preview.items, exercises)} min
        </div>
      </div>
      <div className="rot">
        {VARIANTS.map((v) => (
          <div key={v} className={v === variant ? 'on' : ''}>
            {v}
          </div>
        ))}
      </div>

      {backupDue && (
        <div className="banner">
          Your workouts only live on this phone. It's been over a week since your last backup.
          <div className="btn-row">
            <button className="btn primary" onClick={exportData}>
              Back up now
            </button>
          </div>
        </div>
      )}

      {t1Count !== 2 && (
        <div className="banner">
          Day {day} has {t1Count} main lift{t1Count === 1 ? '' : 's'}. Each day needs exactly two.
          <div className="btn-row">
            <button className="btn" onClick={() => go('program')}>
              Open program
            </button>
          </div>
        </div>
      )}

      <QuoteBoard quote={quote} seed={s.quoteCursor} onTap={nextQuote} />

      {preview.items.length > 0 && (
        <div className="group">
          {preview.items.map((it) => {
            const target = it.sets.reduce((n, x) => n + x.target, 0);
            const d = it.bodyweight
              ? { text: target > 0 ? 'reps' : 'new', cls: 'mu' }
              : deltaLabel(it.weight, it.slotId ? lastLifted(s.sessions, it.slotId, it.track) : null);
            return (
              <div className="row" key={it.id}>
                <Tag tier={it.tier} />
                <div className="grow name">
                  {it.exerciseName}
                  <span className="mu small" style={{ marginLeft: 6 }}>
                    {itemSchemeLabel(it)}
                  </span>
                </div>
                <div className="w" style={{ minWidth: 44, textAlign: 'right' }}>
                  {it.bodyweight ? (target > 0 ? target : 'BW') : fmt(it.weight)}
                </div>
                <div className={`delta ${d.cls}`}>{d.text}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="pad" style={{ paddingTop: 2 }}>
        {s.active ? (
          <button className="btn primary big" onClick={() => go('workout')}>
            Resume {s.active.variant}
          </button>
        ) : (
          <button
            className="btn primary big"
            onClick={() => {
              startSession();
              go('workout');
            }}
            disabled={preview.items.length === 0}
          >
            Start session
          </button>
        )}
      </div>
    </div>
  );
}
