import { useEffect, useRef, useState } from 'react';
import {
  answerPrompt,
  discardActive,
  finishActive,
  logSet,
  setItemWeight,
  skipItem,
  swapItem,
  undoSwap,
} from '../data/actions';
import { useApp } from '../data/store';
import { schemeLabel, trackLabel } from '../engine/schemes';
import type { Exercise, SessionItem, SetLog, WeightMode } from '../engine/types';
import { describeSetup, fmt, nextWeight, prevWeight, snapWeight } from '../engine/weights';
import { formatDuration, formatRest, Icon, NumPad, Sheet, Tag, useLongPress } from './components';
import { ExercisePicker } from './ExercisePicker';
import { exMap, lastItem } from './helpers';

const FALLBACK: WeightMode = { kind: 'fixed', increment: 2.5 };

function isComplete(it: SessionItem) {
  return it.sets.every((s) => s.reps != null);
}

function doneCount(it: SessionItem) {
  return it.sets.filter((s) => s.reps != null).length;
}

function firstOpen(items: SessionItem[]): string | null {
  return items.find((i) => !i.skipped && !isComplete(i))?.id ?? null;
}

export function Workout({ go }: { go: (to: string, arg?: string) => void }) {
  const s = useApp();
  const session = s.active;
  const exercises = exMap(s);
  const [openId, setOpenId] = useState<string | null>(() => (session ? firstOpen(session.items) : null));
  const [menuId, setMenuId] = useState<string | null>(null);
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [reps, setReps] = useState<{ itemId: string; index: number } | null>(null);
  const [weightFor, setWeightFor] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'finish' | 'discard' | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useWakeLock(!!session && s.settings.keepAwake);

  if (!session) {
    return (
      <div className="screen">
        <div className="empty">
          <h3>No session running</h3>
          <button className="btn primary" onClick={() => go('today')}>
            Back to today
          </button>
        </div>
      </div>
    );
  }

  const openItem = session.items.find((i) => i.id === openId) ?? null;
  const restFor = (openItem && exercises.get(openItem.exerciseId)?.rest) || s.settings.defaultRest;
  const unlogged = session.items.filter((i) => !i.skipped && doneCount(i) === 0).length;
  const partial = session.items.filter((i) => !i.skipped && doneCount(i) > 0 && !isComplete(i)).length;
  const totalSets = session.items.filter((i) => !i.skipped).reduce((n, i) => n + i.sets.length, 0);
  const loggedSets = session.items.reduce((n, i) => n + doneCount(i), 0);

  const onLogged = (item: SessionItem, index: number, value: number | null) => {
    logSet(item.id, index, value);
    const after = item.sets.map((x, i) => (i === index ? { ...x, reps: value } : x));
    if (value != null && after.every((x) => x.reps != null)) {
      const rest = session.items.map((i) => (i.id === item.id ? { ...i, sets: after } : i));
      setTimeout(() => setOpenId(firstOpen(rest)), 350);
    }
  };

  const finish = () => {
    const id = finishActive();
    setConfirm(null);
    if (id) go('finish', id);
  };

  const repsItem = reps ? session.items.find((i) => i.id === reps.itemId) : null;
  const repsSet = repsItem && reps ? repsItem.sets[reps.index] : null;
  const weightItem = weightFor ? session.items.find((i) => i.id === weightFor) : null;

  return (
    <div className="screen with-timer">
      <div className="head">
        <div>
          <div className="eyebrow">
            {loggedSets} of {totalSets} sets · {formatDuration(Date.now() - session.start)}
          </div>
          <h1>Day {session.variant}</h1>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button className="icon-btn" aria-label="Discard session" onClick={() => setConfirm('discard')}>
            <Icon name="trash" />
          </button>
          <button className="btn primary" onClick={() => (unlogged || partial ? setConfirm('finish') : finish())}>
            Finish
          </button>
        </div>
      </div>

      {session.items.map((item) => (
        <ExerciseCard
          key={item.id}
          item={item}
          exercise={exercises.get(item.exerciseId)}
          last={lastItem(s.sessions, item.slotId, item.exerciseId, item.track)}
          open={item.id === openId}
          menuOpen={item.id === menuId}
          onToggle={() => {
            setMenuId(null);
            setOpenId(item.id === openId ? null : item.id);
          }}
          onMenu={() => setMenuId(item.id === menuId ? null : item.id)}
          onSwap={() => {
            setMenuId(null);
            setSwapFor(item.id);
          }}
          onUndoSwap={() => {
            setMenuId(null);
            undoSwap(item.id);
          }}
          onSkip={() => {
            setMenuId(null);
            skipItem(item.id, !item.skipped);
            if (!item.skipped && openId === item.id) setOpenId(firstOpen(session.items.filter((i) => i.id !== item.id)));
          }}
          onLog={(index, value) => onLogged(item, index, value)}
          onRepsPad={(index) => setReps({ itemId: item.id, index })}
          onWeightPad={() => setWeightFor(item.id)}
        />
      ))}

      <div className="pad" style={{ paddingTop: 6 }}>
        <button className="btn big" onClick={() => (unlogged || partial ? setConfirm('finish') : finish())}>
          Finish session
        </button>
      </div>

      <RestTimer defaultSeconds={restFor} vibrate={s.settings.vibrate} />

      {swapFor && (
        <ExercisePicker
          title="Swap for today"
          exclude={[session.items.find((i) => i.id === swapFor)?.exerciseId ?? '']}
          onPick={(id) => {
            swapItem(swapFor, id);
            setSwapFor(null);
            setOpenId(null);
          }}
          onClose={() => setSwapFor(null)}
        />
      )}

      {repsItem && repsSet && reps && (
        <NumPad
          title={repsSet.amrap ? 'AMRAP reps' : `Set ${reps.index + 1} reps`}
          subtitle={`${repsItem.exerciseName} · ${fmt(repsItem.weight)} kg · target ${repsSet.amrap ? `${repsSet.target}+` : repsSet.target}`}
          initial={repsSet.reps ?? (repsSet.amrap ? null : repsSet.target)}
          onClose={() => setReps(null)}
          onDone={(v) => {
            onLogged(repsItem, reps.index, Math.max(0, Math.round(v)));
            setReps(null);
          }}
          extra={
            repsSet.reps != null ? (
              <button
                className="btn big"
                onClick={() => {
                  logSet(repsItem.id, reps.index, null);
                  setReps(null);
                }}
              >
                Clear
              </button>
            ) : undefined
          }
        />
      )}

      {weightItem && (
        <NumPad
          title="Weight today"
          subtitle={`${weightItem.exerciseName} · kg`}
          initial={weightItem.weight}
          decimal
          onClose={() => setWeightFor(null)}
          onDone={(v) => {
            const mode = exercises.get(weightItem.exerciseId)?.mode ?? FALLBACK;
            setItemWeight(weightItem.id, snapWeight(mode, v));
            setWeightFor(null);
          }}
        />
      )}

      {confirm === 'finish' && (
        <Sheet onClose={() => setConfirm(null)}>
          <div style={{ padding: '0 16px 14px' }}>
            <h2>Finish session?</h2>
            <p className="mu">
              {unlogged > 0 && (
                <>
                  {unlogged} exercise{unlogged === 1 ? ' has' : 's have'} no sets logged and will count as skipped.{' '}
                </>
              )}
              {partial > 0 && (
                <>
                  {partial} exercise{partial === 1 ? ' is' : 's are'} partly logged, so the missing sets count as missed reps.
                </>
              )}
            </p>
          </div>
          <div className="pad btn-row">
            <button className="btn big" onClick={() => setConfirm(null)}>
              Keep going
            </button>
            <button className="btn primary big" onClick={finish}>
              Finish
            </button>
          </div>
        </Sheet>
      )}

      {confirm === 'discard' && (
        <Sheet onClose={() => setConfirm(null)}>
          <div style={{ padding: '0 16px 14px' }}>
            <h2>Discard this session?</h2>
            <p className="mu">Nothing from it is saved and the rotation stays on {session.variant}.</p>
          </div>
          <div className="pad btn-row">
            <button className="btn big" onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button
              className="btn big danger"
              onClick={() => {
                setConfirm(null);
                discardActive();
                go('today');
              }}
            >
              Discard
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function ExerciseCard({
  item,
  exercise,
  last,
  open,
  menuOpen,
  onToggle,
  onMenu,
  onSwap,
  onUndoSwap,
  onSkip,
  onLog,
  onRepsPad,
  onWeightPad,
}: {
  item: SessionItem;
  exercise: Exercise | undefined;
  last: SessionItem | null;
  open: boolean;
  menuOpen: boolean;
  onToggle: () => void;
  onMenu: () => void;
  onSwap: () => void;
  onUndoSwap: () => void;
  onSkip: () => void;
  onLog: (index: number, reps: number | null) => void;
  onRepsPad: (index: number) => void;
  onWeightPad: () => void;
}) {
  const mode = exercise?.mode ?? FALLBACK;
  const scheme = schemeLabel(item.tier, item.track, item.stage);
  const complete = isComplete(item);
  const done = doneCount(item);
  const track = trackLabel(item.track);
  const sub = [track, scheme, `${fmt(item.weight)} kg`].filter(Boolean).join(' · ');
  const setup = describeSetup(mode, item.weight);
  const showPrompt = open && item.prompt && !item.promptAnswer;

  return (
    <div className={`card ${open ? 'open' : ''} ${complete && !open ? 'done-card' : ''} ${item.skipped ? 'skipped' : ''}`}>
      <div className="card-head">
        <button style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, textAlign: 'left' }} onClick={onToggle}>
          <Tag tier={item.tier} />
          <div className="grow">
            <div className="title">
              {item.exerciseName}
              {item.swapped && <span className="mu small"> · swapped in</span>}
            </div>
            <div className="sub">{item.skipped ? 'Skipped today' : sub}</div>
          </div>
          {!item.skipped && complete && <Icon name="check" className="accent" />}
          {!item.skipped && !complete && done > 0 && (
            <span className="cd accent" style={{ fontSize: 15 }}>
              {done} of {item.sets.length}
            </span>
          )}
          {item.prompt && !item.promptAnswer && !open && <Icon name="alert" size={18} className="accent" />}
        </button>
        <button className="icon-btn" aria-label="Exercise options" onClick={onMenu} style={menuOpen ? { color: 'var(--accent)' } : undefined}>
          <Icon name="dots" />
        </button>
      </div>

      {menuOpen && (
        <div className="menu">
          <button onClick={onSwap}>
            <Icon name="replace" size={18} className="mu" /> Swap for today
          </button>
          {item.swapped && (
            <button onClick={onUndoSwap}>
              <Icon name="undo" size={18} className="mu" /> Back to the programmed lift
            </button>
          )}
          <button onClick={onSkip}>
            <Icon name="skip" size={18} className="mu" /> {item.skipped ? 'Unskip' : 'Skip today'}
          </button>
        </div>
      )}

      {open && !item.skipped && (
        <div className="card-body">
          {showPrompt && item.prompt && <PromptBox item={item} />}
          <div className="big-w">
            <button onClick={onWeightPad} aria-label="Type weight">
              <span className="num">{fmt(item.weight)}</span>
              <span className="unit"> kg</span>
            </button>
            <div className="btn-row" style={{ flex: 'none' }}>
              <button className="step" aria-label="Lighter" onClick={() => setItemWeight(item.id, prevWeight(mode, item.weight))}>
                −
              </button>
              <button className="step" aria-label="Heavier" onClick={() => setItemWeight(item.id, nextWeight(mode, item.weight))}>
                +
              </button>
            </div>
          </div>
          <div className="mu small" style={{ marginTop: 4 }}>
            {setup && <span style={{ color: 'var(--text)' }}>{setup} · </span>}
            {item.weight !== item.plannedWeight && <span className="accent">planned {fmt(item.plannedWeight)} · </span>}
            {last ? `Last time ${fmt(last.weight)} kg · ${last.sets.map((x) => x.reps ?? '–').join(', ')}` : 'First time on this lift'}
          </div>
          <div className="sets">
            {item.sets.map((set, i) => (
              <SetButton key={i} set={set} onLog={(v) => onLog(i, v)} onPad={() => onRepsPad(i)} />
            ))}
          </div>
          <div className="hint">Tap to log as planned · hold or tap again to enter reps</div>
        </div>
      )}
    </div>
  );
}

function SetButton({ set, onLog, onPad }: { set: SetLog; onLog: (v: number | null) => void; onPad: () => void }) {
  const done = set.reps != null;
  const short = done && set.reps! < set.target && !set.amrap;
  const press = useLongPress(onPad, () => {
    if (done || set.amrap) onPad();
    else onLog(set.target);
  });
  return (
    <button className={`set ${done ? (short ? 'short' : 'done') : ''}`} {...press} aria-label={done ? `${set.reps} reps logged` : `Log ${set.target} reps`}>
      {done ? set.reps : set.amrap ? `${set.target}+` : set.target}
      <small>{done ? 'reps' : set.amrap ? 'AMRAP' : 'tap'}</small>
    </button>
  );
}

function PromptBox({ item }: { item: SessionItem }) {
  const p = item.prompt!;
  const from = schemeLabel(item.tier, item.track, p.fromStage);
  const to = schemeLabel(item.tier, item.track, p.toStage);
  const missed = p.missed > 0 ? `Missed ${p.missed} rep${p.missed === 1 ? '' : 's'}` : 'Missed reps';
  return (
    <div className="prompt">
      <div>
        <Icon name="alert" size={16} className="accent" style={{ verticalAlign: -3 }} /> {missed} last time at {from} · {fmt(item.plannedWeight)} kg
        {p.kind === 'deload' && <span className="mu"> - that was the last stage.</span>}
      </div>
      <div className="btn-row">
        <button className="btn primary" onClick={() => answerPrompt(item.id, true)}>
          {p.kind === 'drop' ? `Drop to ${to}` : `Restart ${to} · ${fmt(p.toWeight)}`}
        </button>
        <button className="btn" onClick={() => answerPrompt(item.id, false)}>
          Stay at {from}
        </button>
      </div>
    </div>
  );
}

function RestTimer({ defaultSeconds, vibrate }: { defaultSeconds: number; vibrate: boolean }) {
  const [duration, setDuration] = useState(defaultSeconds);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [paused, setPaused] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [, tick] = useState(0);
  const running = endAt != null;

  useEffect(() => {
    if (!running && paused == null) setDuration(defaultSeconds);
  }, [defaultSeconds, running, paused]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      tick((n) => n + 1);
      if (endAt != null && Date.now() >= endAt) {
        setEndAt(null);
        setPaused(null);
        setFinished(true);
        if (vibrate) navigator.vibrate?.([300, 120, 300, 120, 500]);
        beep();
        setTimeout(() => setFinished(false), 4000);
      }
    }, 250);
    return () => clearInterval(t);
  }, [running, endAt, vibrate]);

  const remaining = running ? Math.max(0, Math.ceil((endAt! - Date.now()) / 1000)) : paused ?? duration;
  const adjust = (d: number) => {
    if (running) setEndAt((e) => (e ?? Date.now()) + d * 1000);
    else if (paused != null) setPaused((p) => Math.max(0, (p ?? 0) + d));
    else setDuration((x) => Math.max(15, x + d));
  };
  const toggle = () => {
    setFinished(false);
    if (running) {
      setPaused(remaining);
      setEndAt(null);
    } else {
      unlockAudio();
      setEndAt(Date.now() + (paused ?? duration) * 1000);
      setPaused(null);
    }
  };

  return (
    <div className="timer">
      <div className="timer-inner">
        <Icon name="clock" className="mu" />
        <button className="btn" onClick={() => adjust(-15)} aria-label="Subtract 15 seconds">
          −15
        </button>
        <button
          className={`clock ${finished ? 'done' : ''}`}
          onClick={() => {
            if (paused != null) {
              setPaused(null);
              setFinished(false);
            }
          }}
          aria-label="Rest time"
        >
          {finished ? 'Go' : formatRest(remaining)}
        </button>
        <button className="btn" onClick={() => adjust(15)} aria-label="Add 15 seconds">
          +15
        </button>
        <button className="btn primary" style={{ minWidth: 72 }} onClick={toggle}>
          {running ? 'Pause' : paused != null ? 'Resume' : 'Start'}
        </button>
      </div>
    </div>
  );
}

let audioCtx: AudioContext | null = null;
function unlockAudio() {
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
  } catch {
    /* audio unavailable */
  }
}

function beep() {
  try {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    [0, 0.25, 0.5].forEach((off, i) => {
      const o = audioCtx!.createOscillator();
      const g = audioCtx!.createGain();
      o.frequency.value = i === 2 ? 1320 : 880;
      g.gain.setValueAtTime(0.0001, t + off);
      g.gain.exponentialRampToValueAtTime(0.25, t + off + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.18);
      o.connect(g).connect(audioCtx!.destination);
      o.start(t + off);
      o.stop(t + off + 0.2);
    });
  } catch {
    /* audio unavailable */
  }
}

function useWakeLock(enabled: boolean) {
  const lock = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let cancelled = false;
    const request = async () => {
      try {
        if (document.visibilityState !== 'visible') return;
        lock.current = await navigator.wakeLock.request('screen');
        if (cancelled) void lock.current.release();
      } catch {
        /* denied or unsupported */
      }
    };
    void request();
    const onVis = () => document.visibilityState === 'visible' && void request();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      void lock.current?.release().catch(() => undefined);
      lock.current = null;
    };
  }, [enabled]);
}
