import {
  answerPrompt as engineAnswer,
  buildSession,
  finishSession,
  itemFromSlot,
  lastWeightKey,
  newItem,
  newState,
  setItemStage,
  uid,
} from '../engine/progression';
import { variantAt, variantForTrack } from '../engine/rotation';
import { snapWeight } from '../engine/weights';
import type { Day, Exercise, SessionItem, Slot, Tier, Track } from '../engine/types';
import type { Quote } from './quotes';
import { starterProgram } from './starter';
import { getExporter, getState, isValidBackup, normalise, replaceState, update, type AppState, type Settings } from './store';

// Program setup

export function loadStarter() {
  const { exercises, slots } = starterProgram();
  update((s) => {
    s.exercises.push(...exercises);
    s.slots.push(...slots);
  });
}

export function saveExercise(ex: Exercise) {
  update((s) => {
    const i = s.exercises.findIndex((e) => e.id === ex.id);
    const before = i >= 0 ? s.exercises[i].mode : null;
    if (i >= 0) s.exercises[i] = ex;
    else s.exercises.push(ex);
    // A new plate setup can make different weights - move programmed weights to the nearest one it can make.
    if (before && ex.mode.kind === 'plates' && JSON.stringify(before) !== JSON.stringify(ex.mode)) {
      for (const slot of s.slots) {
        if (slot.exerciseId !== ex.id) continue;
        for (const st of Object.values(slot.states)) if (st && st.weight > 0) st.weight = snapWeight(ex.mode, st.weight);
      }
    }
  });
}

export function deleteExercise(id: string) {
  update((s) => {
    s.exercises = s.exercises.filter((e) => e.id !== id);
    s.slots = s.slots.filter((sl) => sl.exerciseId !== id);
  });
}

function statesFor(tier: Tier, ex: Exercise | undefined): Slot['states'] {
  const st = (t: Track) => {
    const key = lastWeightKey(tier, t);
    const reps = ex?.lastReps?.[key];
    return { ...newState(ex?.lastWeights[key] ?? 0), ...(reps && { reps }) };
  };
  return tier === 1 ? { heavy: st('heavy'), volume: st('volume') } : { none: st('none') };
}

export function addSlot(day: Day, tier: Tier, exerciseId: string): string {
  const id = uid('slot');
  update((s) => {
    const same = s.slots.filter((x) => x.day === day && x.tier === tier);
    const ex = s.exercises.find((e) => e.id === exerciseId);
    const slot: Slot = {
      id,
      day,
      tier,
      exerciseId,
      order: same.reduce((m, x) => Math.max(m, x.order + 1), 0),
      states: statesFor(tier, ex),
    };
    if (tier === 1) {
      const other = same[0]?.variant1Track;
      slot.variant1Track = other === 'heavy' ? 'volume' : other === 'volume' ? 'heavy' : 'heavy';
    }
    s.slots.push(slot);
  });
  return id;
}

export function removeSlot(id: string) {
  update((s) => {
    s.slots = s.slots.filter((x) => x.id !== id);
  });
}

export function changeSlotExercise(id: string, exerciseId: string) {
  update((s) => {
    const slot = s.slots.find((x) => x.id === id);
    const ex = s.exercises.find((e) => e.id === exerciseId);
    if (!slot || !ex) return;
    slot.exerciseId = exerciseId;
    slot.states = statesFor(slot.tier, ex);
  });
}

/** Manual override of a slot's stage and weight for one track. Clears any pending prompt. */
export function setSlotState(id: string, track: Track, stage: number, weight: number) {
  update((s) => {
    const slot = s.slots.find((x) => x.id === id);
    if (!slot) return;
    const prev = slot.states[track] ?? newState();
    if (prev.stage === stage && prev.weight === weight) return;
    slot.states[track] = { ...prev, stage, weight, pendingPrompt: false };
  });
}

/** Flip which variant runs which track for a main lift, and the opposite for the day's other main lift. */
export function swapTracks(slotId: string) {
  update((s) => {
    const slot = s.slots.find((x) => x.id === slotId);
    if (!slot || slot.tier !== 1) return;
    const next = slot.variant1Track === 'volume' ? 'heavy' : 'volume';
    for (const x of s.slots) {
      if (x.day !== slot.day || x.tier !== 1) continue;
      x.variant1Track = x.id === slot.id ? next : next === 'heavy' ? 'volume' : 'heavy';
    }
  });
}

export function reorderSlots(ids: string[]) {
  update((s) => {
    ids.forEach((id, order) => {
      const slot = s.slots.find((x) => x.id === id);
      if (slot) slot.order = order;
    });
  });
}

// Sessions

export function startSession() {
  update((s) => {
    if (s.active) return;
    s.active = buildSession(variantAt(s.nextIndex), s.slots, s.exercises, s.settings.deloadPct);
  });
}

export function discardActive() {
  update((s) => {
    s.active = null;
  });
}

function withItem(id: string, fn: (item: SessionItem, s: AppState) => SessionItem) {
  update((s) => {
    if (!s.active) return;
    s.active.items = s.active.items.map((i) => (i.id === id ? fn(i, s) : i));
  });
}

export function logSet(itemId: string, index: number, reps: number | null) {
  withItem(itemId, (item) => {
    const sets = item.sets.map((set, i) =>
      i === index ? { ...set, reps, weight: reps == null ? undefined : item.weight, at: reps == null ? undefined : Date.now() } : set,
    );
    // Logging a set answers an open prompt with "stay".
    const promptAnswer = item.prompt && !item.promptAnswer && reps != null ? ('stayed' as const) : item.promptAnswer;
    return { ...item, sets, promptAnswer, skipped: false };
  });
}

export function setItemWeight(itemId: string, weight: number) {
  withItem(itemId, (item) => ({ ...item, weight }));
}

export function changeItemStage(itemId: string, stage: number) {
  withItem(itemId, (item) => setItemStage(item, stage));
}

export function answerPrompt(itemId: string, accept: boolean) {
  withItem(itemId, (item) => engineAnswer(item, accept));
}

export function skipItem(itemId: string, skipped: boolean) {
  withItem(itemId, (item) => ({ ...item, skipped }));
}

/** Swap an exercise in for today only. Tier and track stay the same; progression starts at the first stage. */
export function swapItem(itemId: string, exerciseId: string) {
  withItem(itemId, (item, s) => {
    const ex = s.exercises.find((e) => e.id === exerciseId);
    if (!ex) return item;
    const key = lastWeightKey(item.tier, item.track);
    const state = { weight: ex.lastWeights[key] ?? 0, stage: 0, reps: ex.lastReps?.[key] };
    return {
      ...newItem(ex, item.tier, item.track, state, null),
      replacedSlotId: item.replacedSlotId ?? item.slotId ?? undefined,
      swapped: true,
    };
  });
}

/** Put the programmed exercise back after a swap. */
export function undoSwap(itemId: string) {
  withItem(itemId, (item, s) => {
    const slot = s.slots.find((x) => x.id === item.replacedSlotId);
    const ex = slot && s.exercises.find((e) => e.id === slot.exerciseId);
    if (!slot || !ex || !s.active) return item;
    return itemFromSlot(slot, ex, s.active.variant, s.settings.deloadPct);
  });
}

/** Finish the active session, apply progression and move the rotation on. Returns the finished session id. */
export function finishActive(): string | null {
  const active = getState().active;
  if (!active) return null;
  update((s) => {
    if (!s.active) return;
    const r = finishSession(s.active, s.slots, s.exercises);
    s.sessions.push(r.session);
    s.slots = r.slots;
    s.exercises = r.exercises;
    s.active = null;
    s.nextIndex = (s.nextIndex + 1) % 4;
    // The quote belongs to the upcoming session, so it only moves on when one is finished.
    s.quoteCursor += 1;
  });
  return active.id;
}

// Settings and quotes

export function updateSettings(patch: Partial<Settings>) {
  update((s) => {
    s.settings = { ...s.settings, ...patch };
  });
}

export function nextQuote() {
  update((s) => {
    s.quoteCursor += 1;
  });
}

export function addQuote(text: string, by: string) {
  const q: Quote = { id: uid('q'), text: text.trim(), by: by.trim(), builtIn: false };
  update((s) => {
    s.customQuotes.push(q);
  });
}

export function removeQuote(id: string) {
  update((s) => {
    s.customQuotes = s.customQuotes.filter((q) => q.id !== id);
  });
}

export function toggleQuoteHidden(id: string) {
  update((s) => {
    const h = new Set(s.settings.hiddenQuotes);
    if (h.has(id)) h.delete(id);
    else h.add(id);
    s.settings.hiddenQuotes = [...h];
  });
}

// Backup

/** Save a JSON backup. Resolves false if the file wasn't saved (declined or unavailable). */
export async function exportData(): Promise<boolean> {
  const s = getState();
  const payload = { app: 'gzclp-tracker', exportedAt: new Date().toISOString(), ...s };
  const json = JSON.stringify(payload, null, 2);
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const filename = `gzclp-backup-${stamp}.json`;

  const custom = getExporter();
  if (custom) {
    const ok = await custom(filename, json);
    if (ok) updateSettings({ lastBackup: Date.now() });
    return ok;
  }

  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  updateSettings({ lastBackup: Date.now() });
  return true;
}

export async function importData(file: File): Promise<string | null> {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    return "That file isn't valid JSON.";
  }
  if (!isValidBackup(raw)) return "That file doesn't look like a backup from this app.";
  const next = normalise(raw);
  next.settings.lastBackup = Date.now();
  replaceState(next);
  return null;
}

export { variantForTrack };
