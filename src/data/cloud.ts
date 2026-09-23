/**
 * Storage for the Claude artifact build. State is split across database documents to stay under
 * the per-document size limit:
 *   app/program   - exercises, slots, settings, quotes, rotation position
 *   app/active    - the session in progress, if any
 *   sessions/<id> - one document per finished session
 * Only changed parts are written.
 */
import type { Session } from '../engine/types';
import type { AppState, Backend } from './store';

interface DocSnap {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}
interface DocRef {
  get(): Promise<DocSnap>;
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
}
interface QuerySnap {
  docs: DocSnap[];
}
interface Query {
  where(field: string, op: string, value: unknown): Query;
  orderBy(field: string, dir?: 'asc' | 'desc'): Query;
  limit(n: number): Query;
  get(): Promise<QuerySnap>;
}
export interface Db {
  doc(path: string): DocRef;
  collection(path: string): Query & { doc(id: string): DocRef };
}

function programPart(s: AppState) {
  return {
    version: s.version,
    exercises: s.exercises,
    slots: s.slots,
    nextIndex: s.nextIndex,
    settings: s.settings,
    customQuotes: s.customQuotes,
    quoteCursor: s.quoteCursor,
  };
}

async function retry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code !== 'unavailable') throw e;
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
    return fn();
  }
}

export function cloudBackend(db: Db, onError: (message: string) => void): Backend {
  let savedProgram = '';
  let savedActive = '';
  const savedSessions = new Map<string, string>();

  return {
    async load() {
      const [program, active] = await Promise.all([db.doc('app/program').get(), db.doc('app/active').get()]);
      const sessions: Session[] = [];
      let after = -Infinity;
      for (;;) {
        let q = db.collection('sessions').orderBy('start').limit(1000);
        if (after > -Infinity) q = q.where('start', '>', after);
        const page = await q.get();
        for (const d of page.docs) sessions.push(d.data() as unknown as Session);
        if (page.docs.length < 1000) break;
        after = sessions[sessions.length - 1].start;
      }
      const p = (program.exists ? program.data() : {}) ?? {};
      const a = active.exists ? (active.data() as { session?: Session | null }) : null;
      const state = { ...p, sessions, active: a?.session ?? null };
      savedProgram = program.exists ? JSON.stringify(p) : '';
      savedActive = JSON.stringify(a?.session ?? null);
      for (const s of sessions) savedSessions.set(s.id, JSON.stringify(s));
      return program.exists || sessions.length ? state : null;
    },

    async save(s) {
      try {
        const program = JSON.stringify(programPart(s));
        if (program !== savedProgram) {
          await retry(() => db.doc('app/program').set(programPart(s)));
          savedProgram = program;
        }
        const active = JSON.stringify(s.active);
        if (active !== savedActive) {
          await retry(() => db.doc('app/active').set({ session: s.active }));
          savedActive = active;
        }
        const ids = new Set<string>();
        for (const session of s.sessions) {
          ids.add(session.id);
          const json = JSON.stringify(session);
          if (savedSessions.get(session.id) === json) continue;
          await retry(() => db.collection('sessions').doc(session.id).set(session as unknown as Record<string, unknown>));
          savedSessions.set(session.id, json);
        }
        // An import can remove sessions.
        for (const id of [...savedSessions.keys()]) {
          if (ids.has(id)) continue;
          await retry(() => db.collection('sessions').doc(id).delete());
          savedSessions.delete(id);
        }
      } catch (e) {
        const code = (e as { code?: string })?.code;
        onError(
          code === 'quota_exceeded'
            ? 'Storage is full. Export a backup, then delete old sessions.'
            : code === 'revoked' || code === 'not_granted'
              ? "This page can't save any more. Reopen it to keep logging."
              : "Couldn't save your last change. It will retry on your next change.",
        );
        throw e;
      }
    },
  };
}
