import { useState } from 'react';
import { useApp } from '../data/store';
import { VARIANTS } from '../engine/rotation';
import { schemeLabel } from '../engine/schemes';
import type { Session, SessionItem, Variant } from '../engine/types';
import { fmt } from '../engine/weights';
import { formatDuration, Icon, Tag } from './components';
import { shortDate, weekLabel, weekStart } from './helpers';

export function History() {
  const s = useApp();
  const [filter, setFilter] = useState<Variant | 'all'>('all');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const list = [...s.sessions]
    .reverse()
    .filter((x) => filter === 'all' || x.variant === filter)
    .filter((x) => !q || x.items.some((i) => i.exerciseName.toLowerCase().includes(q) && i.outcome !== 'skipped'));

  const groups: { start: number; items: Session[] }[] = [];
  for (const x of list) {
    const w = weekStart(x.start);
    const g = groups[groups.length - 1];
    if (g && g.start === w) g.items.push(x);
    else groups.push({ start: w, items: [x] });
  }

  return (
    <div className="screen with-nav">
      <div className="head">
        <div>
          <div className="eyebrow">
            {s.sessions.length} session{s.sessions.length === 1 ? '' : 's'} logged
          </div>
          <h1>History</h1>
        </div>
        <button
          className="icon-btn"
          aria-label="Search by lift"
          onClick={() => {
            setSearching(!searching);
            if (searching) setQuery('');
          }}
        >
          <Icon name={searching ? 'x' : 'search'} size={22} />
        </button>
      </div>
      {searching && (
        <div className="search">
          <input className="field" autoFocus placeholder="Find sessions with a lift" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}
      <div className="chips" style={{ padding: '0 16px 6px' }}>
        {(['all', ...VARIANTS] as const).map((v) => (
          <button key={v} className={`chip ${filter === v ? 'on' : ''}`} onClick={() => setFilter(v)}>
            {v === 'all' ? 'All' : v}
          </button>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="empty">
          <h3>{s.sessions.length ? 'No matching sessions' : 'Your log starts here'}</h3>
          <p>{s.sessions.length ? 'Try another filter or lift.' : 'Finished sessions show up here, grouped by week.'}</p>
        </div>
      )}

      {groups.map((g) => (
        <div key={g.start}>
          <div className="week">{weekLabel(g.start)}</div>
          {g.items.map((x) => (
            <SessionCard key={x.id} session={x} open={open === x.id} highlight={q} onToggle={() => setOpen(open === x.id ? null : x.id)} />
          ))}
        </div>
      ))}
    </div>
  );
}

function SessionCard({ session, open, highlight, onToggle }: { session: Session; open: boolean; highlight: string; onToggle: () => void }) {
  const done = session.items.filter((i) => i.outcome !== 'skipped');
  const skipped = session.items.length - done.length;
  return (
    <div className="card" style={open ? { borderColor: 'var(--border-2)' } : undefined}>
      <button className="card-head" onClick={onToggle}>
        <div className="cd" style={{ fontSize: 22, width: 34 }}>
          {session.variant}
        </div>
        <div className="grow">
          <div className="title">{shortDate(session.start)}</div>
          <div className="sub">
            {formatDuration((session.end ?? session.start) - session.start)} · {done.length} lift{done.length === 1 ? '' : 's'}
            {skipped > 0 && ` · ${skipped} skipped`}
          </div>
        </div>
        <div className="dots" aria-hidden="true">
          {session.items.map((i) => (
            <span key={i.id} className={i.outcome === 'skipped' ? 's' : i.outcome === 'missed' || (i.outcome === 'same' && i.tier === 3) ? 'x' : ''} />
          ))}
        </div>
        <Icon name={open ? 'up' : 'down'} className="mu" />
      </button>
      {open && (
        <div>
          {session.items.map((i) => (
            <ItemRow key={i.id} item={i} highlight={highlight} />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemRow({ item, highlight }: { item: SessionItem; highlight: string }) {
  const hit = highlight && item.exerciseName.toLowerCase().includes(highlight);
  if (item.outcome === 'skipped') {
    return (
      <div className="row" style={{ opacity: 0.55, fontSize: 13 }}>
        <Tag tier={item.tier} />
        <div className="grow name">{item.exerciseName}</div>
        <span className="mu small">skipped</span>
      </div>
    );
  }
  const good = item.outcome === 'up';
  return (
    <div className="row" style={{ fontSize: 13, padding: '8px 12px', background: hit ? 'var(--surface-2)' : undefined }}>
      <Tag tier={item.tier} />
      <div className="grow name">
        {item.exerciseName} <span className="mu">{schemeLabel(item.tier, item.track, item.stage)}</span>
        {item.swapped && <span className="mu" style={{ fontSize: 11 }}> swapped in</span>}
      </div>
      <span className="cd mu" style={{ fontSize: 15, letterSpacing: '0.03em' }}>
        {item.sets.map((x, i) => {
          const short = x.reps == null || (item.tier === 3 && x.amrap ? x.reps < 12 : x.reps < x.target);
          return (
            <span key={i} className={short ? 'miss' : undefined}>
              {i > 0 ? ' ' : ''}
              {x.reps ?? '–'}
            </span>
          );
        })}
      </span>
      <span className="w" style={{ fontSize: 16, minWidth: 40, textAlign: 'right' }}>
        {fmt(item.weight)}
      </span>
      <Icon name={good ? 'arrowUp' : 'minus'} size={16} className={good ? 'accent' : 'miss'} />
    </div>
  );
}
