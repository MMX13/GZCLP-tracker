import { useSyncExternalStore } from 'react';
import type { Exercise, Session, Slot } from '../engine/types';
import type { Quote } from './quotes';

export interface Settings {
  defaultRest: number;
  deloadPct: number;
  keepAwake: boolean;
  vibrate: boolean;
  backupReminder: boolean;
  lastBackup: number | null;
  hiddenQuotes: string[];
}

export interface AppState {
  version: 1;
  exercises: Exercise[];
  slots: Slot[];
  /** Finished sessions, oldest first. */
  sessions: Session[];
  /** Position in the A1, B1, A2, B2 rotation. */
  nextIndex: number;
  active: Session | null;
  settings: Settings;
  customQuotes: Quote[];
  quoteCursor: number;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultRest: 120,
  deloadPct: 85,
  keepAwake: true,
  vibrate: true,
  backupReminder: true,
  lastBackup: null,
  hiddenQuotes: [],
};

export function emptyState(): AppState {
  return {
    version: 1,
    exercises: [],
    slots: [],
    sessions: [],
    nextIndex: 0,
    active: null,
    settings: { ...DEFAULT_SETTINGS },
    customQuotes: [],
    quoteCursor: Math.floor(Math.random() * 1000),
  };
}

/** Fill in anything missing from older or imported data. */
export function normalise(raw: unknown): AppState {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<AppState>;
  return {
    ...base,
    ...r,
    version: 1,
    exercises: Array.isArray(r.exercises) ? r.exercises : [],
    slots: Array.isArray(r.slots) ? r.slots : [],
    sessions: Array.isArray(r.sessions) ? r.sessions : [],
    nextIndex: typeof r.nextIndex === 'number' ? r.nextIndex : 0,
    active: r.active ?? null,
    settings: { ...DEFAULT_SETTINGS, ...(r.settings ?? {}) },
    customQuotes: Array.isArray(r.customQuotes) ? r.customQuotes : [],
    quoteCursor: typeof r.quoteCursor === 'number' ? r.quoteCursor : base.quoteCursor,
  };
}

export function isValidBackup(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;
  return Array.isArray(r.exercises) && Array.isArray(r.slots) && Array.isArray(r.sessions);
}

// Persistence - one JSON document in IndexedDB, with localStorage as a fallback.

const DB_NAME = 'gzclp-tracker';
const STORE = 'kv';
const KEY = 'state';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;
function db() {
  if (!dbPromise) dbPromise = openDb();
  return dbPromise;
}

async function readStored(): Promise<unknown> {
  try {
    const d = await db();
    return await new Promise((resolve, reject) => {
      const req = d.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const s = localStorage.getItem(DB_NAME);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  }
}

async function writeStored(value: AppState): Promise<void> {
  try {
    const d = await db();
    await new Promise<void>((resolve, reject) => {
      const tx = d.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try {
      localStorage.setItem(DB_NAME, JSON.stringify(value));
    } catch {
      /* nothing else to try */
    }
  }
}

/** Where the state is kept. The installed app uses IndexedDB; the Claude artifact swaps in its database. */
export interface Backend {
  load(): Promise<unknown>;
  save(state: AppState): Promise<void>;
}

export const browserBackend: Backend = {
  load: readStored,
  save: writeStored,
};

let backend: Backend = browserBackend;

/** Saves a backup file. The installed app downloads it directly; the artifact routes it through the viewer. */
export type Exporter = (filename: string, json: string) => Promise<boolean>;
let exporter: Exporter | null = null;
export function setExporter(fn: Exporter | null) {
  exporter = fn;
}
export function getExporter(): Exporter | null {
  return exporter;
}

// Store

let state: AppState = emptyState();
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saving: Promise<void> = Promise.resolve();

export async function loadState(using: Backend = browserBackend): Promise<AppState> {
  backend = using;
  state = normalise(await backend.load());
  emit();
  if (backend === browserBackend) {
    try {
      await navigator.storage?.persist?.();
    } catch {
      /* not supported */
    }
  }
  return state;
}

function emit() {
  for (const l of listeners) l();
}

/** Save now. Saves run one at a time, in order. */
export function flush(): Promise<void> {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  const snapshot = state;
  saving = saving.then(() => backend.save(snapshot)).catch(() => undefined);
  return saving;
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void flush(), 400);
}

export function getState(): AppState {
  return state;
}

/** Apply a change to a copy of the state, then save. */
export function update(fn: (draft: AppState) => void): void {
  const draft = structuredClone(state);
  fn(draft);
  state = draft;
  emit();
  scheduleSave();
}

export function replaceState(next: AppState): void {
  state = next;
  emit();
  void flush();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getState);
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush();
  });
}
