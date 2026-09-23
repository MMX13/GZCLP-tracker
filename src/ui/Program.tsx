import { useState } from 'react';
import { addSlot, changeSlotExercise, removeSlot, reorderSlots, setSlotState, swapTracks } from '../data/actions';
import { useApp } from '../data/store';
import { newState } from '../engine/progression';
import { variantForTrack } from '../engine/rotation';
import { bodyweightLabel, schemeLabel, stagesFor, trackLabel } from '../engine/schemes';
import type { Day, Exercise, ProgState, Slot, Tier, Track, WeightMode } from '../engine/types';
import { describeSetup, fmt, nextWeight, prevWeight, snapWeight } from '../engine/weights';
import { Icon, NumPad, Sheet, Stepper, Tag } from './components';
import { ExerciseEditor, ExerciseLibrary } from './ExerciseEditor';
import { ExercisePicker } from './ExercisePicker';
import { Sortable } from './Sortable';

const FALLBACK: WeightMode = { kind: 'fixed', increment: 2.5 };

export function Program({ go }: { go: (to: string) => void }) {
  const s = useApp();
  const [day, setDay] = useState<Day>('A');
  const [slotId, setSlotId] = useState<string | null>(null);
  const [adding, setAdding] = useState<Tier | null>(null);
  const [creatingFor, setCreatingFor] = useState<Tier | null>(null);
  const [library, setLibrary] = useState(false);
  const exercises = new Map(s.exercises.map((e) => [e.id, e]));

  const byTier = (t: Tier) => s.slots.filter((x) => x.day === day && x.tier === t).sort((a, b) => a.order - b.order);
  const t1 = byTier(1);

  const add = (tier: Tier, exerciseId: string) => {
    const id = addSlot(day, tier, exerciseId);
    setAdding(null);
    setSlotId(id);
  };

  const section = (tier: Tier, title: string, addLabel: string) => {
    const list = byTier(tier);
    return (
      <>
        <div className="sec">
          <span>{title}</span>
          {tier === 1 && (
            <span className={list.length === 2 ? 'accent' : 'miss'}>
              {list.length === 2 && <Icon name="check" size={14} style={{ verticalAlign: -2 }} />} {list.length} of 2
            </span>
          )}
        </div>
        <div className="group">
          <Sortable items={list} getId={(x) => x.id} onReorder={reorderSlots}>
            {(slot, handle) => <SlotRow slot={slot} ex={exercises.get(slot.exerciseId)} handle={handle} onOpen={() => setSlotId(slot.id)} />}
          </Sortable>
          {(tier !== 1 || list.length < 2) && (
            <button className="add-row" onClick={() => setAdding(tier)}>
              <Icon name="plus" size={18} /> {addLabel}
            </button>
          )}
        </div>
      </>
    );
  };

  const open = s.slots.find((x) => x.id === slotId);

  return (
    <div className="screen with-nav">
      <div className="head">
        <div>
          <div className="eyebrow">A1 · B1 · A2 · B2</div>
          <h1>Program</h1>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button className="head-link" onClick={() => setLibrary(true)}>
            <Icon name="books" size={18} /> Exercises
          </button>
          <button className="icon-btn" aria-label="Settings" onClick={() => go('settings')}>
            <Icon name="settings" size={22} />
          </button>
        </div>
      </div>
      <div className="seg" style={{ margin: '0 12px 14px' }}>
        {(['A', 'B'] as Day[]).map((d) => (
          <button key={d} className={day === d ? 'on' : ''} onClick={() => setDay(d)}>
            Day {d}
          </button>
        ))}
      </div>

      {section(1, 'Main lifts · T1', 'Add main lift')}
      {t1.length === 2 && t1[0].variant1Track === t1[1].variant1Track && (
        <div className="banner">Both main lifts are on the same track. Open one and swap its tracks.</div>
      )}
      {section(2, 'Secondary · T2', 'Add secondary lift')}
      {section(3, 'Accessories · T3', 'Add accessory')}
      <div className="list-note">Drag the handle to reorder. Order here is the default order in the workout.</div>

      {adding && (
        <ExercisePicker
          title={`Add ${adding === 1 ? 'main lift' : adding === 2 ? 'secondary lift' : 'accessory'} to day ${day}`}
          onPick={(id) => add(adding, id)}
          onNew={() => {
            setCreatingFor(adding);
            setAdding(null);
          }}
          onClose={() => setAdding(null)}
        />
      )}
      {creatingFor && (
        <ExerciseEditor
          exerciseId={null}
          onClose={() => setCreatingFor(null)}
          onSaved={(id) => {
            const tier = creatingFor;
            setCreatingFor(null);
            setTimeout(() => add(tier, id), 0);
          }}
        />
      )}
      {open && <SlotSheet slot={open} exercise={exercises.get(open.exerciseId)} onClose={() => setSlotId(null)} />}
      {library && <ExerciseLibrary onClose={() => setLibrary(false)} />}
    </div>
  );
}

/** Scheme and load for a slot's track, e.g. "3×5 · 60" or "3×AMRAP · 8, 7, 6". */
function stateLabel(slot: Slot, ex: Exercise | undefined, t: Track, st: ProgState): { scheme: string; load: string } {
  if (ex?.mode.kind === 'bodyweight') {
    return { scheme: bodyweightLabel(ex.mode.sets), load: st.reps?.length ? st.reps.join(', ') : 'BW' };
  }
  return { scheme: schemeLabel(slot.tier, t, st.stage), load: fmt(st.weight) };
}

function tracksOf(slot: Slot): Track[] {
  if (slot.tier !== 1) return ['none'];
  const v1 = slot.variant1Track ?? 'heavy';
  return [v1, v1 === 'heavy' ? 'volume' : 'heavy'];
}

function SlotRow({ slot, ex, handle, onOpen }: { slot: Slot; ex: Exercise | undefined; handle: React.ReactNode; onOpen: () => void }) {
  const name = ex?.name ?? 'Missing exercise';
  if (slot.tier === 1) {
    return (
      <div className="row tap" style={{ alignItems: 'flex-start' }} onClick={onOpen} role="button">
        {handle}
        <div className="grow">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag tier={1} />
            <span className="name">{name}</span>
          </div>
          <div className="tracks">
            {tracksOf(slot).map((t) => {
              const st = slot.states[t] ?? newState();
              const l = stateLabel(slot, ex, t, st);
              return (
                <div key={t} className={`trk ${st.stage > 0 ? 'dropped' : ''}`}>
                  <div className="l">
                    {variantForTrack(slot, t as 'heavy' | 'volume')} · {trackLabel(t)}
                  </div>
                  <span className="cd" style={{ fontSize: 15 }}>
                    {l.scheme} · {l.load}
                  </span>
                  {st.pendingPrompt && <Icon name="alert" size={13} className="accent" style={{ marginLeft: 4, verticalAlign: -2 }} />}
                </div>
              );
            })}
          </div>
        </div>
        <Icon name="right" className="mu" style={{ marginTop: 2 }} />
      </div>
    );
  }
  const st = slot.states.none ?? newState();
  const setup = ex ? describeSetup(ex.mode, st.weight) : null;
  const l = stateLabel(slot, ex, 'none', st);
  const bw = ex?.mode.kind === 'bodyweight';
  return (
    <div className="row tap" onClick={onOpen} role="button">
      {handle}
      <Tag tier={slot.tier} />
      <div className="grow">
        <div className="name">{name}</div>
        <div className="sub">
          {l.scheme}
          {bw && st.reps?.length ? ` · last ${st.reps.reduce((a, b) => a + b, 0)} reps` : ''}
          {setup && ` · ${setup}`}
          {st.pendingPrompt && <span className="accent"> · missed last time</span>}
        </div>
      </div>
      <span className="w">{bw ? (st.reps?.length ? st.reps.join(' ') : 'BW') : l.load}</span>
      <Icon name="right" className="mu" />
    </div>
  );
}

function SlotSheet({ slot, exercise, onClose }: { slot: Slot; exercise: Exercise | undefined; onClose: () => void }) {
  const mode = exercise?.mode ?? FALLBACK;
  const tracks = tracksOf(slot);
  const [draft, setDraft] = useState(() =>
    Object.fromEntries(tracks.map((t) => [t, { ...(slot.states[t] ?? newState()) }])) as Record<string, ReturnType<typeof newState>>,
  );
  const [changing, setChanging] = useState(false);
  const [typing, setTyping] = useState<Track | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [editEx, setEditEx] = useState(false);

  const set = (t: Track, patch: Partial<ReturnType<typeof newState>>) => setDraft((d) => ({ ...d, [t]: { ...d[t], ...patch } }));

  const save = () => {
    for (const t of tracks) setSlotState(slot.id, t, draft[t].stage, draft[t].weight);
    onClose();
  };

  const role = slot.tier === 1 ? 'Main lift' : slot.tier === 2 ? 'Secondary lift' : 'Accessory';

  return (
    <>
      <Sheet onClose={onClose}>
        <div style={{ padding: '0 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Tag tier={slot.tier} />
              <span className="mu small">
                {role} · Day {slot.day}
              </span>
            </div>
            <h2>{exercise?.name ?? 'Missing exercise'}</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <button className="head-link" onClick={() => setChanging(true)}>
              <Icon name="replace" size={16} /> Change
            </button>
            {exercise && (
              <button className="head-link" onClick={() => setEditEx(true)} style={{ paddingTop: 0 }}>
                <Icon name="settings" size={16} /> Edit exercise
              </button>
            )}
          </div>
        </div>

        {tracks.map((t) => {
          const st = draft[t];
          if (mode.kind === 'bodyweight') {
            const label = slot.tier === 1 ? `${variantForTrack(slot, t as 'heavy' | 'volume')} · ${trackLabel(t)} track` : 'Next session';
            return (
              <div key={t} className="box">
                <div className="label">{label}</div>
                <div className="cd" style={{ fontSize: 22 }}>
                  {bodyweightLabel(mode.sets)} · {st.reps?.length ? `beat ${st.reps.join(', ')}` : 'first time'}
                </div>
                <div className="mu small" style={{ marginTop: 4 }}>
                  Bodyweight. Targets are the reps from each set last time.
                </div>
              </div>
            );
          }
          const stages = stagesFor(slot.tier, t);
          const label = slot.tier === 1 ? `${variantForTrack(slot, t as 'heavy' | 'volume')} · ${trackLabel(t)} track` : 'Next session';
          const setup = describeSetup(mode, st.weight);
          return (
            <div key={t} className={`box ${st.stage > 0 ? 'warn' : ''}`}>
              <div className="label">
                {label}
                {st.stage > 0 && <span className="accent"> · dropped a stage</span>}
                {st.pendingPrompt && <span className="accent"> · missed last time</span>}
              </div>
              {stages && (
                <div className="stage-chips" style={{ marginBottom: 10 }}>
                  {stages.map((sc, i) => (
                    <button key={sc.label} className={st.stage === i ? 'on' : ''} onClick={() => set(t, { stage: i })}>
                      {sc.label}
                    </button>
                  ))}
                </div>
              )}
              <Stepper
                value={st.weight}
                unit="kg"
                onDec={() => set(t, { weight: prevWeight(mode, st.weight) })}
                onInc={() => set(t, { weight: nextWeight(mode, st.weight) })}
                onTap={() => setTyping(t)}
              />
              {setup && (
                <div className="mu small" style={{ textAlign: 'center', marginTop: 4 }}>
                  {setup}
                </div>
              )}
            </div>
          );
        })}

        {slot.tier === 1 && (
          <div className="list-note">
            {exercise?.name} is heavy on {variantForTrack(slot, 'heavy')} and volume on {variantForTrack(slot, 'volume')}.{' '}
            <button
              className="accent"
              onClick={() => swapTracks(slot.id)}
            >
              Swap tracks
            </button>
          </div>
        )}
        {mode.kind !== 'bodyweight' && (
          <div className="list-note">Changes here override what the app calculated. The next session uses these values.</div>
        )}
        <div className="pad btn-row">
          <button className="btn big danger" onClick={() => setConfirmRemove(true)}>
            Remove
          </button>
          <button className="btn primary big" style={{ flex: 2 }} onClick={save}>
            Save
          </button>
        </div>
      </Sheet>

      {changing && (
        <ExercisePicker
          title="Change exercise"
          exclude={[slot.exerciseId]}
          onPick={(id) => {
            changeSlotExercise(slot.id, id);
            setChanging(false);
            onClose();
          }}
          onClose={() => setChanging(false)}
        />
      )}
      {typing && (
        <NumPad
          title="Weight"
          subtitle={`${exercise?.name ?? ''} · kg`}
          initial={draft[typing].weight}
          decimal
          onClose={() => setTyping(null)}
          onDone={(v) => {
            set(typing, { weight: snapWeight(mode, v) });
            setTyping(null);
          }}
        />
      )}
      {confirmRemove && (
        <Sheet onClose={() => setConfirmRemove(false)}>
          <div style={{ padding: '0 16px 14px' }}>
            <h2>Remove from day {slot.day}?</h2>
            <p className="mu">Its progression for this slot is lost. The exercise stays in your library and past sessions stay in history.</p>
          </div>
          <div className="pad btn-row">
            <button className="btn big" onClick={() => setConfirmRemove(false)}>
              Cancel
            </button>
            <button
              className="btn big danger"
              onClick={() => {
                removeSlot(slot.id);
                onClose();
              }}
            >
              Remove
            </button>
          </div>
        </Sheet>
      )}
      {editEx && exercise && <ExerciseEditor exerciseId={exercise.id} onClose={() => setEditEx(false)} />}
    </>
  );
}
