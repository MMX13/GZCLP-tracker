import { useMemo, useState } from 'react';
import { deleteExercise, saveExercise } from '../data/actions';
import { useApp } from '../data/store';
import { uid } from '../engine/progression';
import { variantForTrack } from '../engine/rotation';
import type { Exercise, WeightMode } from '../engine/types';
import { fmt, plateCombos, round2 } from '../engine/weights';
import { formatRest, Icon, NumPad, Sheet, Stepper, Tag } from './components';

type Field = 'increment' | 'plate' | 'addon' | null;

export function ExerciseEditor({ exerciseId, onClose, onSaved }: { exerciseId: string | null; onClose: () => void; onSaved?: (id: string) => void }) {
  const s = useApp();
  const existing = s.exercises.find((e) => e.id === exerciseId);
  const [name, setName] = useState(existing?.name ?? '');
  const [mode, setMode] = useState<WeightMode>(existing?.mode ?? { kind: 'fixed', increment: 2.5 });
  const [fixedInc, setFixedInc] = useState(existing?.mode.kind === 'fixed' ? existing.mode.increment : 2.5);
  const [plates, setPlates] = useState(
    existing?.mode.kind === 'plates' ? existing.mode : { kind: 'plates' as const, plate: 4.5, addon: 2.3, maxAddons: 2 },
  );
  const [rest, setRest] = useState(existing?.rest ?? s.settings.defaultRest);
  const [pad, setPad] = useState<Field>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  const usedIn = s.slots.filter((x) => x.exerciseId === exerciseId);
  const preview = useMemo(() => plateCombos(plates.plate, plates.addon, plates.maxAddons).filter((c) => c.weight <= 60), [plates]);
  const current: WeightMode = mode.kind === 'fixed' ? { kind: 'fixed', increment: fixedInc } : plates;

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the exercise a name.');
      return;
    }
    if (s.exercises.some((e) => e.id !== exerciseId && e.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('There is already an exercise with that name.');
      return;
    }
    if (current.kind === 'plates' && !(current.plate > 0)) {
      setError('Plate weight must be more than zero.');
      return;
    }
    const ex: Exercise = { id: existing?.id ?? uid('e'), name: trimmed, mode: current, rest, lastWeights: existing?.lastWeights ?? {} };
    saveExercise(ex);
    onSaved?.(ex.id);
    onClose();
  };

  return (
    <div className="overlay">
      <div className="overlay-inner screen">
        <div className="head" style={{ alignItems: 'center' }}>
          <button className="icon-btn" onClick={onClose} aria-label="Back">
            <Icon name="back" size={22} />
          </button>
          <div className="cd" style={{ fontSize: 22 }}>
            {existing ? 'Edit exercise' : 'New exercise'}
          </div>
          {existing ? (
            <button className="icon-btn" onClick={() => setConfirmDelete(true)} aria-label="Delete exercise">
              <Icon name="trash" />
            </button>
          ) : (
            <span style={{ width: 40 }} />
          )}
        </div>

        <div className="pad" style={{ marginBottom: 10 }}>
          <div className="label">Name</div>
          <input
            className="field"
            value={name}
            placeholder="Lat pulldown"
            autoFocus={!existing}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
          />
        </div>

        <div className="box">
          <div className="label">Weight mode</div>
          <div className="stage-chips">
            <button className={mode.kind === 'fixed' ? 'on' : ''} onClick={() => setMode({ kind: 'fixed', increment: fixedInc })}>
              Fixed increment
            </button>
            <button className={mode.kind === 'plates' ? 'on' : ''} onClick={() => setMode(plates)}>
              Plates + add-ons
            </button>
          </div>

          {mode.kind === 'fixed' ? (
            <div style={{ marginTop: 12 }}>
              <div className="label">Increment</div>
              <Stepper
                value={fixedInc}
                unit="kg"
                onDec={() => setFixedInc((v) => Math.max(0.25, round2(v - 0.25)))}
                onInc={() => setFixedInc((v) => round2(v + 0.25))}
                onTap={() => setPad('increment')}
              />
              <div className="mu small" style={{ marginTop: 8 }}>
                Barbells and most dumbbells. Dumbbell weights are per hand.
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              <div className="label">Plate</div>
              <Stepper
                value={plates.plate}
                unit="kg"
                onDec={() => setPlates((p) => ({ ...p, plate: Math.max(0.1, round2(p.plate - 0.1)) }))}
                onInc={() => setPlates((p) => ({ ...p, plate: round2(p.plate + 0.1) }))}
                onTap={() => setPad('plate')}
              />
              <div className="label" style={{ marginTop: 12 }}>
                Add-on
              </div>
              <Stepper
                value={plates.addon}
                unit="kg"
                onDec={() => setPlates((p) => ({ ...p, addon: Math.max(0, round2(p.addon - 0.1)) }))}
                onInc={() => setPlates((p) => ({ ...p, addon: round2(p.addon + 0.1) }))}
                onTap={() => setPad('addon')}
              />
              <div className="label" style={{ marginTop: 12 }}>
                Max add-ons at once
              </div>
              <div className="stage-chips">
                {[0, 1, 2, 3].map((n) => (
                  <button key={n} className={plates.maxAddons === n ? 'on' : ''} onClick={() => setPlates((p) => ({ ...p, maxAddons: n }))}>
                    {n}
                  </button>
                ))}
              </div>
              <div className="label" style={{ marginTop: 12 }}>
                Weights you can make
              </div>
              <div className="cd" style={{ fontSize: 15, lineHeight: 1.6 }}>
                {preview.map((c) => fmt(c.weight)).join('  ·  ')}  …
              </div>
            </div>
          )}
        </div>

        <div className="box">
          <div className="label">Rest time</div>
          <Stepper
            value={rest}
            display={formatRest(rest)}
            onDec={() => setRest((r) => Math.max(15, r - 15))}
            onInc={() => setRest((r) => r + 15)}
          />
        </div>

        {usedIn.length > 0 && (
          <div className="list-note" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            Used in
            {usedIn.map((x) => (
              <span key={x.id} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', color: 'var(--text)' }}>
                <Tag tier={x.tier} />
                {x.tier === 1 ? `${variantForTrack(x, 'heavy')} and ${variantForTrack(x, 'volume')}` : `Day ${x.day}`}
              </span>
            ))}
          </div>
        )}

        {error && (
          <div className="pad" style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>
            {error}
          </div>
        )}
        <div className="pad">
          <button className="btn primary big" onClick={save}>
            Save exercise
          </button>
        </div>
      </div>

      {pad && (
        <NumPad
          title={pad === 'increment' ? 'Increment' : pad === 'plate' ? 'Plate weight' : 'Add-on weight'}
          subtitle="kg"
          decimal
          initial={pad === 'increment' ? fixedInc : pad === 'plate' ? plates.plate : plates.addon}
          onClose={() => setPad(null)}
          onDone={(v) => {
            const val = round2(Math.max(0, v));
            if (pad === 'increment') setFixedInc(val || 0.25);
            else if (pad === 'plate') setPlates((p) => ({ ...p, plate: val || 0.1 }));
            else setPlates((p) => ({ ...p, addon: val }));
            setPad(null);
          }}
        />
      )}

      {confirmDelete && existing && (
        <Sheet onClose={() => setConfirmDelete(false)}>
          <div style={{ padding: '0 16px 14px' }}>
            <h2>Delete {existing.name}?</h2>
            <p className="mu">
              {usedIn.length > 0
                ? `It's in your program ${usedIn.length} time${usedIn.length === 1 ? '' : 's'}, and those slots will be removed too. Past sessions stay in history.`
                : 'Past sessions stay in history.'}
            </p>
          </div>
          <div className="pad btn-row">
            <button className="btn big" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
            <button
              className="btn big danger"
              onClick={() => {
                deleteExercise(existing.id);
                onClose();
              }}
            >
              Delete
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

export function ExerciseLibrary({ onClose }: { onClose: () => void }) {
  const s = useApp();
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const list = [...s.exercises].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="overlay">
      <div className="overlay-inner screen">
        <div className="head" style={{ alignItems: 'center' }}>
          <button className="icon-btn" onClick={onClose} aria-label="Back">
            <Icon name="back" size={22} />
          </button>
          <div className="cd" style={{ fontSize: 22 }}>
            Exercises
          </div>
          <span style={{ width: 40 }} />
        </div>
        <div className="group">
          {list.map((e) => {
            const n = s.slots.filter((x) => x.exerciseId === e.id).length;
            return (
              <button key={e.id} className="row tap" style={{ width: '100%', textAlign: 'left' }} onClick={() => setEditing(e.id)}>
                <div className="grow">
                  <div className="name">{e.name}</div>
                  <div className="sub">
                    {e.mode.kind === 'plates'
                      ? `Plates ${fmt(e.mode.plate)} + add-on ${fmt(e.mode.addon)}`
                      : `+${fmt(e.mode.increment)} kg`}{' '}
                    · rest {formatRest(e.rest)} · {n ? `in program ×${n}` : 'not in program'}
                  </div>
                </div>
                <Icon name="right" className="mu" />
              </button>
            );
          })}
          <button className="add-row" onClick={() => setEditing('new')}>
            <Icon name="plus" size={18} /> New exercise
          </button>
        </div>
      </div>
      {editing && <ExerciseEditor exerciseId={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
