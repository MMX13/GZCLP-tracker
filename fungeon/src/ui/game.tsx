// Game controller: holds the run, profile, animation queue (fx overlay) and dispatches engine actions.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { act, cardView, newRun } from '../engine';
import type { Action, CardView, CombatState, GameEvent, RunState } from '../engine';
import { STATUSES } from '../content';
import { audio } from '../art';
import { clearRun, loadProfile, loadRun, saveProfile, saveRun } from './store';
import type { Profile, Settings } from './store';

// ---------------------------------------------------------------- overlay types
export interface Ov {
  hp: Record<string, number>;
  block: Record<string, number>;
  st: Record<string, Record<string, number>>;
  energy: number;
  nut: number;
  intentNew: Record<string, boolean>;
}
export interface Floater {
  id: number;
  target: string;
  text: string;
  kind: 'dmg' | 'block' | 'heal' | 'status' | 'say' | 'blocked' | 'debuff' | 'move';
}
export interface Fx {
  active: boolean;
  prev: RunState | null;
  ov: Ov | null;
  floaters: Floater[];
  anim: Record<string, 'hit' | 'attack' | 'dead'>;
  shake: boolean;
  banner: string | null;
  ghost: { key: number; view: CardView } | null;
  slotFx: Record<number, 'grow' | 'bloom' | 'plant'>;
  relicFlash: string | null;
  goldFlash: number;
  drawFlash: number;
  discardFlash: number;
  compostFlash: number;
}
const EMPTY_FX: Fx = {
  active: false, prev: null, ov: null, floaters: [], anim: {}, shake: false, banner: null, ghost: null,
  slotFx: {}, relicFlash: null, goldFlash: 0, drawFlash: 0, discardFlash: 0, compostFlash: 0,
};

function initOv(c: CombatState): Ov {
  const hp: Ov['hp'] = { player: c.player.hp };
  const block: Ov['block'] = { player: c.player.block };
  const st: Ov['st'] = { player: { ...c.player.statuses } };
  for (const e of c.enemies) {
    hp[e.uid] = e.hp;
    block[e.uid] = e.block;
    st[e.uid] = { ...e.statuses };
  }
  return { hp, block, st, energy: c.player.energy, nut: c.player.nutrients, intentNew: {} };
}

export type Targeting = { kind: 'potion'; slot: number; name: string } | null;

interface Ctx {
  run: RunState | null;
  /** The run the screen should be drawn from (keeps combat visible while its last events play). */
  screenRun: RunState | null;
  hasSave: boolean;
  inGame: boolean;
  fx: Fx;
  busy: boolean;
  profile: Profile;
  toast: string | null;
  targeting: Targeting;
  setTargeting: (t: Targeting) => void;
  dispatch: (a: Action) => boolean;
  skip: () => void;
  startRun: (ascension: number) => void;
  continueRun: () => void;
  toTitle: () => void;
  abandon: () => void;
  updateSettings: (s: Partial<Settings>) => void;
  showToast: (m: string) => void;
}
const GameCtx = createContext<Ctx | null>(null);
export function useGame(): Ctx {
  const c = useContext(GameCtx);
  if (!c) throw new Error('no GameProvider');
  return c;
}

function collectSeen(run: RunState, p: Profile): Profile | null {
  const cards = new Set(p.seen.cards), relics = new Set(p.seen.relics), potions = new Set(p.seen.potions);
  const n0 = cards.size + relics.size + potions.size;
  run.deck.forEach((c) => cards.add(c.id));
  run.relics.forEach((r) => relics.add(r.id));
  run.potions.forEach((x) => x && potions.add(x));
  const s = run.screen;
  if (s.kind === 'reward') {
    for (const r of s.rewards) {
      if (r.kind === 'card') r.options.forEach((c) => cards.add(c.id));
      else if (r.kind === 'relic') relics.add(r.id);
      else if (r.kind === 'potion') potions.add(r.id);
    }
  } else if (s.kind === 'shop') {
    s.shop.cards.forEach((c) => cards.add(c.card.id));
    s.shop.relics.forEach((r) => relics.add(r.id));
    s.shop.potions.forEach((r) => potions.add(r.id));
  } else if (s.kind === 'bossRelic') s.options.forEach((r) => relics.add(r));
  else if (s.kind === 'treasure' && s.opened) relics.add(s.relicId);
  if (cards.size + relics.size + potions.size === n0) return null;
  return { ...p, seen: { cards: [...cards], relics: [...relics], potions: [...potions] } };
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const profileRef = useRef(profile);
  const [run, setRun] = useState<RunState | null>(null);
  const runRef = useRef<RunState | null>(null);
  const [saved, setSaved] = useState<RunState | null>(() => loadRun());
  const [inGame, setInGame] = useState(false);
  const [fx, setFx] = useState<Fx>(EMPTY_FX);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const skipRef = useRef(false);
  const tokenRef = useRef(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>(0);
  const [targeting, setTargeting] = useState<Targeting>(null);
  const idRef = useRef(1);

  const commitProfile = useCallback((p: Profile) => {
    profileRef.current = p;
    setProfile(p);
    saveProfile(p);
  }, []);

  const showToast = useCallback((m: string) => {
    setToast(m);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  // settings side effects
  useEffect(() => {
    audio.setSfx(profile.settings.sfx);
    audio.setMusic(profile.settings.music);
    const root = document.documentElement;
    root.dataset.reduce = profile.settings.reduceMotion ? '1' : '0';
  }, [profile.settings]);

  const updateSettings = useCallback((s: Partial<Settings>) => {
    const p = profileRef.current;
    commitProfile({ ...p, settings: { ...p.settings, ...s } });
  }, [commitProfile]);

  const markSeen = useCallback((r: RunState) => {
    const np = collectSeen(r, profileRef.current);
    if (np) commitProfile(np);
  }, [commitProfile]);

  const finishRun = useCallback((r: RunState, won: boolean) => {
    clearRun();
    setSaved(null);
    const p = profileRef.current;
    const st = { ...p.stats };
    st.runs += 1;
    st.kills += r.stats.enemiesKilled;
    st.bestFloor = Math.max(st.bestFloor, r.stats.floorsClimbed);
    let unlocked = p.unlocked;
    if (won) {
      st.wins += 1;
      st.streak += 1;
      st.bestStreak = Math.max(st.bestStreak, st.streak);
      unlocked = Math.min(10, Math.max(unlocked, r.ascension + 1));
    } else st.streak = 0;
    commitProfile({ ...p, stats: st, unlocked });
  }, [commitProfile]);

  const persist = useCallback((prev: RunState | null, next: RunState) => {
    const k = next.screen.kind;
    if ((k === 'victory' || k === 'defeat') && prev?.screen.kind !== k) finishRun(next, k === 'victory');
    else if (k !== 'victory' && k !== 'defeat') {
      saveRun(next);
      setSaved(next);
    }
    markSeen(next);
  }, [finishRun, markSeen]);

  // ------------------------------------------------------------- animation queue
  const playEvents = useCallback(async (prev: RunState, events: GameEvent[]) => {
    const token = ++tokenRef.current;
    busyRef.current = true;
    skipRef.current = false;
    setBusy(true);
    const pc = prev.screen.kind === 'combat' ? prev.screen.combat : null;
    const speedK = profileRef.current.settings.speed === 'fast' ? 0.4 : 1;
    const alive = () => tokenRef.current === token;
    const wait = (ms: number) =>
      skipRef.current || ms <= 0 ? Promise.resolve() : new Promise<void>((r) => setTimeout(r, ms * speedK));
    setFx({ ...EMPTY_FX, active: true, prev, ov: pc ? initOv(pc) : null });

    const patchOv = (fn: (o: Ov) => void) =>
      setFx((f) => {
        if (!f.ov) return f;
        const o: Ov = { ...f.ov, hp: { ...f.ov.hp }, block: { ...f.ov.block }, st: { ...f.ov.st }, intentNew: { ...f.ov.intentNew } };
        fn(o);
        return { ...f, ov: o };
      });
    const floater = (target: string, text: string, kind: Floater['kind']) => {
      const id = idRef.current++;
      setFx((f) => ({ ...f, floaters: [...f.floaters, { id, target, text, kind }] }));
      window.setTimeout(() => setFx((f) => ({ ...f, floaters: f.floaters.filter((x) => x.id !== id) })), 1100);
    };
    const anim = (who: string, s: 'hit' | 'attack' | 'dead', ms: number) => {
      setFx((f) => ({ ...f, anim: { ...f.anim, [who]: s } }));
      if (s !== 'dead')
        window.setTimeout(() => setFx((f) => {
          if (f.anim[who] !== s) return f;
          const a = { ...f.anim };
          delete a[who];
          return { ...f, anim: a };
        }), ms);
    };
    const slot = (n: number, s: 'grow' | 'bloom' | 'plant') => {
      setFx((f) => ({ ...f, slotFx: { ...f.slotFx, [n]: s } }));
      window.setTimeout(() => setFx((f) => {
        const a = { ...f.slotFx };
        delete a[n];
        return { ...f, slotFx: a };
      }), 700);
    };
    const bump = (k: 'drawFlash' | 'discardFlash' | 'compostFlash' | 'goldFlash') =>
      setFx((f) => ({ ...f, [k]: f[k] + 1 }));

    try {
      for (const ev of events) {
        if (!alive() || skipRef.current) break;
        switch (ev.t) {
          case 'turn':
            audio.play('turn');
            setFx((f) => ({ ...f, banner: ev.who === 'player' ? `Turn ${ev.turn}` : 'Enemy turn' }));
            window.setTimeout(() => setFx((f) => ({ ...f, banner: null })), 900 * speedK);
            await wait(ev.who === 'enemy' ? 350 : 200);
            break;
          case 'damage': {
            patchOv((o) => { o.hp[ev.target] = ev.hpAfter; o.block[ev.target] = ev.blockAfter; });
            if (ev.amount > 0) {
              floater(ev.target, `-${ev.amount}`, 'dmg');
              audio.play(ev.kind === 'rot' ? 'rot' : ev.amount >= 15 ? 'bigHit' : 'hit');
              anim(ev.target, 'hit', 350);
              if (ev.amount >= 15 || (ev.target === 'player' && ev.amount >= 10)) {
                setFx((f) => ({ ...f, shake: true }));
                window.setTimeout(() => setFx((f) => ({ ...f, shake: false })), 400);
              }
            } else if (ev.blocked > 0) {
              floater(ev.target, `${ev.blocked}`, 'blocked');
              audio.play('block');
            }
            if (ev.amount > 0 && ev.blocked > 0 && ev.blockAfter === 0) audio.play('blockBreak');
            await wait(ev.kind === 'attack' ? 260 : 200);
            break;
          }
          case 'block':
            patchOv((o) => { o.block[ev.target] = ev.blockAfter; });
            floater(ev.target, `+${ev.amount}`, 'block');
            audio.play('block');
            await wait(160);
            break;
          case 'heal':
            patchOv((o) => { o.hp[ev.target] = ev.hpAfter; });
            floater(ev.target, `+${ev.amount}`, 'heal');
            audio.play('heal');
            await wait(200);
            break;
          case 'status': {
            patchOv((o) => {
              o.st[ev.target] = { ...(o.st[ev.target] ?? {}), [ev.status]: ev.after };
            });
            const def = STATUSES[ev.status];
            const name = def?.name ?? ev.status;
            const bad = def ? (def.kind === 'debuff') === ev.delta > 0 : ev.delta < 0;
            floater(ev.target, `${ev.delta > 0 ? '+' : ''}${ev.delta} ${name}`, bad ? 'debuff' : 'status');
            audio.play(ev.status === 'rot' && ev.delta > 0 ? 'rot' : bad ? 'debuff' : 'buff');
            await wait(180);
            break;
          }
          case 'energy':
            patchOv((o) => { o.energy = ev.after; });
            break;
          case 'nutrients':
            patchOv((o) => { o.nut = ev.after; });
            break;
          case 'play': {
            audio.play('card');
            const card = pc?.hand.find((c) => c.uid === ev.uid);
            if (card) {
              try {
                const view = cardView(card);
                setFx((f) => ({ ...f, ghost: { key: idRef.current++, view } }));
                if (view.type === 'attack') anim('player', 'attack', 380);
              } catch { /* ignore */ }
            }
            await wait(180);
            break;
          }
          case 'draw':
            audio.play('draw');
            bump('drawFlash');
            await wait(60);
            break;
          case 'discard':
            bump('discardFlash');
            break;
          case 'compost':
            audio.play('compost');
            bump('compostFlash');
            await wait(90);
            break;
          case 'shuffle':
            audio.play('shuffle');
            bump('drawFlash');
            await wait(200);
            break;
          case 'plant':
            audio.play('plant');
            slot(ev.slot, 'plant');
            await wait(160);
            break;
          case 'grow':
            audio.play('grow');
            slot(ev.slot, 'grow');
            await wait(110);
            break;
          case 'bloom':
            audio.play('bloom');
            slot(ev.slot, 'bloom');
            await wait(380);
            break;
          case 'enemyMove':
            anim(ev.enemy, 'attack', 400);
            floater(ev.enemy, ev.name, 'move');
            await wait(300);
            break;
          case 'intent':
            patchOv((o) => { o.intentNew[ev.enemy] = true; });
            break;
          case 'enemyDie':
            anim(ev.enemy, 'dead', 0);
            audio.play('enemyDie');
            await wait(380);
            break;
          case 'spawn':
            await wait(200);
            break;
          case 'escape':
            await wait(200);
            break;
          case 'relic':
            audio.play('relic');
            setFx((f) => ({ ...f, relicFlash: ev.id }));
            window.setTimeout(() => setFx((f) => ({ ...f, relicFlash: null })), 900);
            await wait(350);
            break;
          case 'say':
            floater(ev.who, ev.text, 'say');
            await wait(300);
            break;
          case 'gold':
            audio.play('coin');
            bump('goldFlash');
            break;
          case 'potion':
            audio.play('potion');
            await wait(200);
            break;
          case 'victory':
            audio.play('victory');
            setFx((f) => ({ ...f, banner: 'Victory!' }));
            await wait(1000);
            break;
          case 'defeat':
            audio.play('defeat');
            setFx((f) => ({ ...f, banner: 'Defeated...' }));
            await wait(1100);
            break;
        }
      }
    } catch (e) {
      console.error(e);
    }
    if (!alive()) return;
    busyRef.current = false;
    setBusy(false);
    setFx(EMPTY_FX);
  }, []);

  const dispatch = useCallback((action: Action): boolean => {
    if (busyRef.current) return false;
    const cur = runRef.current;
    if (!cur) return false;
    let res;
    try {
      res = act(cur, action);
    } catch (e) {
      console.error(e);
      showToast('Something went wrong.');
      return false;
    }
    if (res.error) {
      audio.play('error');
      showToast(res.error);
      return false;
    }
    runRef.current = res.run;
    setRun(res.run);
    persist(cur, res.run);
    const animate = cur.screen.kind === 'combat' && res.events.length > 0;
    if (animate) void playEvents(cur, res.events);
    else {
      for (const ev of res.events) {
        if (ev.t === 'gold') audio.play('coin');
        else if (ev.t === 'relic') audio.play('relic');
        else if (ev.t === 'potion') audio.play('potion');
        else if (ev.t === 'heal') audio.play('heal');
      }
      if (action.type === 'selectNode') audio.play('nodeSelect');
    }
    return true;
  }, [persist, playEvents, showToast]);

  const skip = useCallback(() => { skipRef.current = true; }, []);

  const startRun = useCallback((ascension: number) => {
    audio.unlock();
    let r: RunState;
    try {
      r = newRun({ ascension });
    } catch (e) {
      console.error(e);
      showToast('Could not start a run.');
      return;
    }
    tokenRef.current++;
    busyRef.current = false;
    setBusy(false);
    setFx(EMPTY_FX);
    runRef.current = r;
    setRun(r);
    setInGame(true);
    setTargeting(null);
    saveRun(r);
    setSaved(r);
    markSeen(r);
  }, [markSeen, showToast]);

  const continueRun = useCallback(() => {
    audio.unlock();
    const r = saved ?? loadRun();
    if (!r) return;
    tokenRef.current++;
    busyRef.current = false;
    setBusy(false);
    setFx(EMPTY_FX);
    runRef.current = r;
    setRun(r);
    setInGame(true);
    setTargeting(null);
  }, [saved]);

  const toTitle = useCallback(() => {
    tokenRef.current++;
    busyRef.current = false;
    setBusy(false);
    setFx(EMPTY_FX);
    setInGame(false);
    setTargeting(null);
    const r = runRef.current;
    if (r && r.screen.kind !== 'victory' && r.screen.kind !== 'defeat') setSaved(r);
    else { runRef.current = null; setRun(null); }
  }, []);

  const abandon = useCallback(() => {
    const r = runRef.current ?? saved;
    if (r && r.screen.kind !== 'victory' && r.screen.kind !== 'defeat') finishRun(r, false);
    else { clearRun(); setSaved(null); }
    tokenRef.current++;
    busyRef.current = false;
    setBusy(false);
    setFx(EMPTY_FX);
    runRef.current = null;
    setRun(null);
    setInGame(false);
    setTargeting(null);
  }, [finishRun, saved]);

  const screenRun = useMemo(() => {
    if (busy && fx.prev && fx.prev.screen.kind === 'combat' && run && run.screen.kind !== 'combat') return fx.prev;
    return run;
  }, [busy, fx.prev, run]);

  const value: Ctx = {
    run, screenRun, hasSave: !!saved, inGame, fx, busy, profile, toast, targeting, setTargeting,
    dispatch, skip, startRun, continueRun, toTitle, abandon, updateSettings, showToast,
  };
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}
