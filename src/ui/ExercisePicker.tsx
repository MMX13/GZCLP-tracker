import { useState } from 'react';
import { useApp } from '../data/store';
import { Icon, Sheet } from './components';
import { modeShort } from './helpers';

export function ExercisePicker({
  title,
  exclude,
  onPick,
  onNew,
  onClose,
}: {
  title: string;
  exclude?: string[];
  onPick: (id: string) => void;
  onNew?: () => void;
  onClose: () => void;
}) {
  const s = useApp();
  const [q, setQ] = useState('');
  const skip = new Set(exclude ?? []);
  const list = s.exercises
    .filter((e) => !skip.has(e.id) && e.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Sheet onClose={onClose}>
      <div style={{ padding: '0 16px 12px' }}>
        <h2>{title}</h2>
      </div>
      <div className="search">
        <input className="field" placeholder="Search exercises" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="group">
        {list.map((e) => (
          <button key={e.id} className="row tap" style={{ width: '100%', textAlign: 'left' }} onClick={() => onPick(e.id)}>
            <div className="grow name">{e.name}</div>
            <span className="mu small">{modeShort(e.mode)}</span>
          </button>
        ))}
        {list.length === 0 && <div className="row mu small">No exercises match.</div>}
        {onNew && (
          <button className="add-row" onClick={onNew}>
            <Icon name="plus" size={18} /> New exercise
          </button>
        )}
      </div>
    </Sheet>
  );
}
