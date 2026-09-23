import { BUILT_IN_QUOTES, type Quote } from '../data/quotes';
import type { AppState } from '../data/store';
import type { Exercise, Session, SessionItem, Track, WeightMode } from '../engine/types';
import { fmt } from '../engine/weights';

export function activeQuotes(s: AppState): Quote[] {
  const hidden = new Set(s.settings.hiddenQuotes);
  const list = [...BUILT_IN_QUOTES.filter((q) => !hidden.has(q.id)), ...s.customQuotes];
  return list.length ? list : BUILT_IN_QUOTES;
}

export function currentQuote(s: AppState): Quote {
  const list = activeQuotes(s);
  return list[((s.quoteCursor % list.length) + list.length) % list.length];
}

export function exMap(s: AppState): Map<string, Exercise> {
  return new Map(s.exercises.map((e) => [e.id, e]));
}

/** The weight lifted the last time a slot's track was trained. */
export function lastLifted(sessions: Session[], slotId: string, track: Track): number | null {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const item = sessions[i].items.find((it) => it.slotId === slotId && it.track === track && it.outcome !== 'skipped');
    if (item) return item.weight;
  }
  return null;
}

/** The last time a slot's track was trained, for "last time" hints in the workout. */
export function lastItem(sessions: Session[], slotId: string | null, exerciseId: string, track: Track): SessionItem | null {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const item = sessions[i].items.find(
      (it) => (slotId ? it.slotId === slotId : it.exerciseId === exerciseId) && it.track === track && it.outcome !== 'skipped',
    );
    if (item) return item;
  }
  return null;
}

/** Rough session length: 40 seconds per set plus rest between sets. */
export function estimateMinutes(items: SessionItem[], exercises: Map<string, Exercise>): number {
  let sec = 0;
  for (const it of items) {
    if (it.skipped) continue;
    const rest = exercises.get(it.exerciseId)?.rest ?? 120;
    sec += it.sets.length * 40 + Math.max(0, it.sets.length - 1) * rest + 60;
  }
  return Math.round(sec / 60 / 5) * 5;
}

export function daysSince(ts: number, now = Date.now()): number {
  const a = new Date(ts);
  const b = new Date(now);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function sinceLabel(ts: number | undefined): string {
  if (!ts) return 'First session';
  const d = daysSince(ts);
  if (d === 0) return 'Last trained today';
  if (d === 1) return 'Last trained yesterday';
  return `${d} days since last`;
}

const DAY = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
export function shortDate(ts: number): string {
  return DAY.format(new Date(ts));
}

/** Monday at midnight for the week containing `ts`. */
export function weekStart(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.getTime();
}

export function weekLabel(start: number, now = Date.now()): string {
  const thisWeek = weekStart(now);
  if (start === thisWeek) return 'This week';
  if (start === thisWeek - 7 * 86400000) return 'Last week';
  return `Week of ${new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(start))}`;
}

export function deltaLabel(next: number, last: number | null): { text: string; cls: string } {
  if (last == null) return { text: 'new', cls: 'mu' };
  const d = Math.round((next - last) * 100) / 100;
  if (d > 0) return { text: `+${d}`, cls: 'accent' };
  if (d < 0) return { text: `${d}`, cls: 'miss' };
  return { text: 'same', cls: 'mu' };
}

/** One-line description of how an exercise is loaded, for the exercise library. */
export function modeSummary(mode: WeightMode): string {
  if (mode.kind === 'bodyweight') return `Bodyweight · ${mode.sets} set${mode.sets === 1 ? '' : 's'}`;
  if (mode.kind === 'plates') {
    const u = mode.unit === 'lb' ? ' lb' : '';
    return `Plates ${fmt(mode.plate)}${u} + add-on ${fmt(mode.addon)}${u}`;
  }
  return `+${fmt(mode.increment)} kg`;
}

export function modeShort(mode: WeightMode): string {
  if (mode.kind === 'bodyweight') return 'Bodyweight';
  if (mode.kind === 'plates') return 'Plates';
  return `+${fmt(mode.increment)} kg`;
}

/** Last time's reps per set for a bodyweight item, e.g. "8, 7, 6". Null when there's no history. */
export function lastRepsLabel(item: SessionItem): string | null {
  if (!item.sets.some((s) => s.target > 0)) return null;
  return item.sets.map((s) => s.target).join(', ');
}
