import { useSyncExternalStore } from 'react';

/**
 * The rest timer lives outside the workout screen so it keeps counting, and still beeps,
 * while the lifter browses other tabs mid-session.
 */
export interface RestState {
  /** Seconds the next run starts from. Follows the open exercise's rest until changed. */
  duration: number;
  /** When the running timer ends, or null when stopped. */
  endAt: number | null;
  /** Seconds left while paused. */
  paused: number | null;
  /** True for a few seconds after the timer runs out. */
  finished: boolean;
}

let state: RestState = { duration: 120, endAt: null, paused: null, finished: false };
const listeners = new Set<() => void>();
let ticker: ReturnType<typeof setInterval> | null = null;
let vibrateOnEnd = true;

function set(patch: Partial<RestState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useRestTimer(): RestState {
  return useSyncExternalStore(subscribe, () => state);
}

/** Seconds left - counting down, paused or ready to start. */
export function remaining(s: RestState, now = Date.now()): number {
  if (s.endAt != null) return Math.max(0, Math.ceil((s.endAt - now) / 1000));
  return s.paused ?? s.duration;
}

export function isRunning(s: RestState = state): boolean {
  return s.endAt != null;
}

/** The open exercise's rest time, used while the timer is idle. */
export function setDefaultRest(seconds: number) {
  if (state.endAt == null && state.paused == null && state.duration !== seconds) set({ duration: seconds });
}

function tick() {
  if (state.endAt == null) {
    stopTicker();
    return;
  }
  if (Date.now() >= state.endAt) {
    stopTicker();
    set({ endAt: null, paused: null, finished: true });
    if (vibrateOnEnd) navigator.vibrate?.([300, 120, 300, 120, 500]);
    beep();
    setTimeout(() => state.finished && set({ finished: false }), 4000);
    return;
  }
  // A fresh snapshot so subscribers re-render with the new remaining time.
  set({});
}

function stopTicker() {
  if (ticker) clearInterval(ticker);
  ticker = null;
}

export function startOrPause(vibrate: boolean) {
  vibrateOnEnd = vibrate;
  if (state.endAt != null) {
    stopTicker();
    set({ paused: remaining(state), endAt: null, finished: false });
    return;
  }
  unlockAudio();
  set({ endAt: Date.now() + (state.paused ?? state.duration) * 1000, paused: null, finished: false });
  stopTicker();
  ticker = setInterval(tick, 250);
}

/** Clear a paused timer back to its full duration. */
export function resetPaused() {
  if (state.paused != null) set({ paused: null, finished: false });
}

export function adjust(d: number) {
  if (state.endAt != null) set({ endAt: state.endAt + d * 1000 });
  else if (state.paused != null) set({ paused: Math.max(0, state.paused + d) });
  else set({ duration: Math.max(15, state.duration + d) });
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
