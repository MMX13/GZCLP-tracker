import { useEffect, useMemo, useRef, useState } from 'react';
import { Art, EnemyArt, Icon, IntentIcon, PlayerArt, audio } from '../art';
import { cardView, intentView, statusViews } from '../engine';
import type { CardInstance, CardView, CombatState, EnemyState, IntentView, RunState, StatusView } from '../engine';
import { ENEMIES } from '../content';
import { useGame } from './game';
import type { Fx } from './game';
import { Btn, HpBar, StatusRow, useHeight, useTip } from './kit';
import { CardFace, CardZoom } from './Card';
import { CardGrid, PileSheet } from './TopBar';
import { Hand } from './Hand';

function Floaters({ id, fx }: { id: string; fx: Fx }) {
  const list = fx.floaters.filter((f) => f.target === id);
  if (!list.length) return null;
  return (
    <div className="floaters">
      {list.map((f, i) => (
        <span key={f.id} className={`floater ${f.kind}`} style={{ ['--i' as string]: i % 4 }}>{f.text}</span>
      ))}
    </div>
  );
}

function viewsFor(run: RunState, id: string, fx: Fx): StatusView[] {
  let base: StatusView[] = [];
  try { base = statusViews(run, id); } catch { return []; }
  const o = fx.ov?.st[id];
  if (!o) return base;
  return base.map((v) => ({ ...v, n: o[v.id] ?? 0 })).filter((v) => v.n !== 0);
}

function describeIntent(iv: IntentView): string {
  const bits: string[] = [];
  if (iv.dmg !== undefined) bits.push(`Attacks for ${iv.dmg}${iv.hits && iv.hits > 1 ? ` x${iv.hits}` : ''} damage.`);
  if (iv.intents.includes('block')) bits.push('Gains Block.');
  if (iv.intents.includes('buff')) bits.push('Buffs itself or allies.');
  if (iv.intents.includes('debuff')) bits.push('Applies a debuff or junk cards to you.');
  if (iv.intents.includes('summon')) bits.push('Summons help.');
  if (iv.intents.includes('sleep')) bits.push('Resting this turn.');
  if (iv.intents.includes('unknown')) bits.push('Unknown intentions.');
  if (iv.intents.includes('escape')) bits.push('Trying to run away.');
  return bits.join(' ') || 'Planning something.';
}

function EnemyView({ e, run, fx, size, targetable, hover, onTap }: {
  e: EnemyState; run: RunState; fx: Fx; size: number; targetable: boolean; hover: boolean; onTap: (e: EnemyState, el: Element) => void;
}) {
  const tip = useTip();
  const def = ENEMIES[e.id];
  const ov = fx.ov;
  const hp = ov?.hp[e.uid] ?? e.hp;
  const block = ov?.block[e.uid] ?? e.block;
  const newIntent = !ov || ov.intentNew[e.uid] || !fx.prev;
  let iv: IntentView | null = null;
  try {
    if (newIntent) iv = intentView(run, e.uid);
    else {
      iv = fx.prev ? intentView(fx.prev, e.uid) : null;
    }
  } catch { /* ignore */ }
  const dead = fx.anim[e.uid] === 'dead';
  const state = fx.anim[e.uid] ?? 'idle';
  const scale = def?.scale ?? 1;
  return (
    <div
      className={`enemy ${targetable ? 'targetable' : ''} ${hover ? 'hover' : ''} ${dead ? 'dead' : ''} tier-${def?.tier ?? 'normal'}`}
      data-enemy-uid={e.uid}
      data-testid={`enemy-${e.uid}`}
      data-enemy-id={e.id}
      onClick={(ev) => onTap(e, ev.currentTarget)}
    >
      <div className="intent" data-testid={`intent-${e.uid}`}>
        {iv && !dead && (
          <button
            className="intent-btn"
            onClick={(ev) => { ev.stopPropagation(); tip(ev.currentTarget, { title: iv!.name, body: describeIntent(iv!) }); }}
            aria-label={`Intent: ${iv.name}`}
          >
            {iv.intents.map((k, i) => <IntentIcon key={i} kind={k} size={26} />)}
            {iv.dmg !== undefined && (
              <b className="intent-dmg">{iv.dmg}{iv.hits && iv.hits > 1 ? <small>×{iv.hits}</small> : null}</b>
            )}
          </button>
        )}
      </div>
      <div className="enemy-art" style={{ height: size * scale, minHeight: size }}>
        <EnemyArt id={e.id} size={Math.round(size * scale)} state={state} />
        <Floaters id={e.uid} fx={fx} />
      </div>
      <HpBar hp={hp} max={e.maxHp} block={block} small />
      <StatusRow views={viewsFor(run, e.uid, fx)} size={18} />
      <div className="enemy-name">{e.name}</div>
    </div>
  );
}

function Garden({ combat, run, fx, onZoom }: { combat: CombatState; run: RunState; fx: Fx; onZoom: (v: CardView) => void }) {
  return (
    <div className="garden" data-testid="garden">
      {combat.garden.map((p, i) => {
        let v: CardView | null = null;
        if (p) { try { v = cardView(p.card, run); } catch { /* ignore */ } }
        const g = v?.grow;
        return (
          <button key={i} className={`plot ${p ? 'full' : ''} ${fx.slotFx[i] ?? ''}`} data-testid={`plot-${i}`} onClick={() => v && onZoom(v)} aria-label={v ? `${v.name}, growth ${p!.growth}` : 'Empty plot'}>
            {v && p ? (
              <>
                <Art k={v.art} size={38} />
                <span className="pips">
                  {g === null || g === undefined
                    ? <b>∞</b>
                    : Array.from({ length: g }).map((_, k) => <i key={k} className={k < p.growth ? 'on' : ''} />)}
                </span>
                <em>{g === null || g === undefined ? p.growth : `${p.growth}/${g}`}</em>
              </>
            ) : <span className="soil" />}
          </button>
        );
      })}
    </div>
  );
}

function PendingSheet({ combat, run }: { combat: CombatState; run: RunState }) {
  const { dispatch, busy } = useGame();
  const p = combat.pending!;
  const [picked, setPicked] = useState<number[]>([]);
  const pool: CardInstance[] = useMemo(() => {
    if (p.from === 'options') return p.options ?? [];
    const src = p.from === 'hand' ? combat.hand : p.from === 'draw' ? combat.draw : p.from === 'discard' ? combat.discard : combat.compost;
    return p.candidates.length ? src.filter((c) => p.candidates.includes(c.uid)) : src;
  }, [p, combat]);
  useEffect(() => setPicked([]), [p.prompt, pool.length]);
  const toggle = (c: CardInstance) => {
    setPicked((cur) => {
      if (cur.includes(c.uid)) return cur.filter((x) => x !== c.uid);
      if (p.max === 1) return [c.uid];
      if (cur.length >= p.max) return cur;
      return [...cur, c.uid];
    });
  };
  const need = Math.min(p.min, pool.length);
  const ok = picked.length >= need && picked.length <= p.max;
  return (
    <div className="pending" data-testid="pending">
      <div className="pending-head">
        <b>{p.prompt}</b>
        <small>{p.min === p.max ? `Choose ${p.max}` : `Choose ${p.min}-${p.max}`} · {picked.length} selected</small>
      </div>
      <div className="pending-cards">
        <CardGrid cards={pool} run={run} onPick={toggle} selected={picked} prefix="pc" />
      </div>
      <div className="row gap">
        <Btn testid="pending-confirm" disabled={!ok || busy} onClick={() => dispatch({ type: 'choose', uids: picked })} icon="check">Confirm</Btn>
      </div>
    </div>
  );
}

export function Combat() {
  const { screenRun: run, fx, busy, dispatch, targeting, setTargeting, skip } = useGame();
  const tip = useTip();
  const combat = (run!.screen as { kind: 'combat'; combat: CombatState }).combat;
  const [sel, setSel] = useState<number | null>(null);
  const [pile, setPile] = useState<'draw' | 'discard' | 'compost' | null>(null);
  const [zoom, setZoom] = useState<CardView | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const enemiesRef = useRef<HTMLDivElement>(null);
  const areaH = useHeight(enemiesRef);

  const views = useMemo(() => combat.hand.map((c) => {
    try { return cardView(c, run!); } catch { return null; }
  }).filter((v): v is CardView => !!v), [combat.hand, run]);

  useEffect(() => {
    if (sel !== null && !combat.hand.some((c) => c.uid === sel)) setSel(null);
  }, [combat.hand, sel]);

  const living = combat.enemies.filter((e) => e.alive || (busy && fx.anim[e.uid] === 'dead') || (busy && fx.prev?.screen.kind === 'combat' && fx.prev.screen.combat.enemies.find((x) => x.uid === e.uid)?.alive));
  const alive = combat.enemies.filter((e) => e.alive);
  const selView = views.find((v) => v.uid === sel) ?? null;
  const focus = dragging !== null ? views.find((v) => v.uid === dragging) ?? null : selView;
  const cardTargeting = !!focus && focus.targeted && focus.playable && !busy;
  const potionTargeting = targeting?.kind === 'potion';
  const canAct = combat.phase === 'player' && !busy && !combat.pending;

  const play = (uid: number, target?: string) => {
    setSel(null);
    dispatch({ type: 'playCard', uid, target });
  };

  const onTapCard = (uid: number) => {
    const v = views.find((x) => x.uid === uid);
    if (!v || !canAct) return;
    if (targeting) setTargeting(null);
    if (sel !== uid) { setSel(uid); audio.play('select'); return; }
    if (!v.playable) { setSel(null); return; }
    if (v.targeted) {
      if (alive.length === 1) play(uid, alive[0].uid);
      else audio.play('click');
    } else play(uid);
  };
  const onDrop = (uid: number, enemy: string | null, far: boolean) => {
    const v = views.find((x) => x.uid === uid);
    if (!v || !canAct) return;
    if (!v.playable) { setSel(uid); return; }
    if (v.targeted) {
      const t = enemy && alive.some((e) => e.uid === enemy) ? enemy : far && alive.length === 1 ? alive[0].uid : null;
      if (t) play(uid, t); else setSel(uid);
    } else if (far) play(uid);
    else setSel(uid);
  };
  const onEnemyTap = (e: EnemyState, el: Element) => {
    if (busy || !e.alive) return;
    if (potionTargeting) {
      dispatch({ type: 'usePotion', slot: targeting.slot, target: e.uid });
      setTargeting(null);
      return;
    }
    if (cardTargeting && selView) { play(selView.uid, e.uid); return; }
    const def = ENEMIES[e.id];
    tip(el, {
      title: `${e.name}  ${e.hp}/${e.maxHp}`,
      body: def?.passiveText ?? (def ? `A ${def.tier} enemy.` : undefined),
      art: <EnemyArt id={e.id} size={32} />,
    });
  };

  const n = living.length;
  const byCount = n <= 2 ? 118 : n === 3 ? 96 : n === 4 ? 76 : 64;
  const maxScale = Math.max(1, ...living.map((e) => ENEMIES[e.id]?.scale ?? 1));
  // leave room for intent (38), hp bar (17), statuses (28), name (16) and gaps
  const size = Math.max(44, Math.min(byCount, Math.floor((areaH - 112) / maxScale)));
  const small = areaH < 250;
  const p = combat.player;
  const energy = fx.ov?.energy ?? p.energy;
  const nut = fx.ov?.nut ?? p.nutrients;
  const php = fx.ov?.hp.player ?? p.hp;
  const pblock = fx.ov?.block.player ?? p.block;
  const targetHint = potionTargeting ? `Choose a target for ${targeting.name}` : cardTargeting ? `Choose a target for ${focus!.name}` : null;
  const pips = viewsFor(run!, 'player', fx);

  return (
    <div className={`combat ${small ? 'compact' : ''} ${fx.shake ? 'shake' : ''} ${combat.phase !== 'player' ? 'ended' : ''}`} data-testid="combat" data-phase={combat.phase} onPointerDown={(e) => { if ((e.target as HTMLElement).closest('.enemy,.hand,.btn,button,.sel-info')) return; setSel(null); }}>
      <div className="field">
        <div className="enemies" data-count={n} ref={enemiesRef}>
          {living.map((e) => (
            <EnemyView key={e.uid} e={e} run={run!} fx={fx} size={size} targetable={(cardTargeting || potionTargeting) && e.alive} hover={hover === e.uid} onTap={onEnemyTap} />
          ))}
        </div>
        {targetHint && (
          <div className="target-hint" data-testid="target-hint">
            {targetHint}
            {potionTargeting && <button onClick={() => setTargeting(null)}>Cancel</button>}
          </div>
        )}
        <div className="mid">
          <div className={`pip ${fx.anim.player ?? ''}`} data-testid="pip">
            <div className="pip-art">
              <PlayerArt size={small ? 70 : 92} state={fx.anim.player === 'dead' ? 'dead' : fx.anim.player ?? 'idle'} />
              <Floaters id="player" fx={fx} />
            </div>
            <HpBar hp={php} max={p.maxHp} block={pblock} />
            <StatusRow views={pips} size={20} />
          </div>
          <Garden combat={combat} run={run!} fx={fx} onZoom={setZoom} />
        </div>
        {focus && !targetHint && (
          <div className="sel-info" data-testid="sel-info">
            <b>{focus.name}</b>
            <span>{focus.text}</span>
            {!focus.playable && focus.reason && <em>{focus.reason}</em>}
            {focus.playable && !focus.targeted && <small>Tap again or drag up to play</small>}
            {focus.playable && focus.targeted && <small>{alive.length === 1 ? 'Tap again to play' : 'Tap an enemy or drag onto one'}</small>}
          </div>
        )}
      </div>

      <div className="dock">
        <div className="orb" data-testid="energy" aria-label={`Spores ${energy} of ${p.maxEnergy}`}>
          <Icon name="spore" size={54} />
          <b>{energy}<small>/{p.maxEnergy}</small></b>
        </div>
        <div className="nutri" data-testid="nutrients" aria-label={`Nutrients ${nut}`}>
          <Icon name="nutrient" size={30} /><b>{nut}</b>
        </div>
        <div className="piles">
          <button className="pile" key={`d${fx.drawFlash}`} onClick={() => setPile('draw')} data-testid="pile-draw" aria-label="Draw pile"><Icon name="deck" size={22} /><b>{combat.draw.length}</b></button>
          <button className="pile" key={`x${fx.discardFlash}`} onClick={() => setPile('discard')} data-testid="pile-discard" aria-label="Discard pile"><Icon name="discard" size={22} /><b>{combat.discard.length}</b></button>
          <button className="pile" key={`c${fx.compostFlash}`} onClick={() => setPile('compost')} data-testid="pile-compost" aria-label="Compost pile"><Icon name="compost" size={22} /><b>{combat.compost.length}</b></button>
        </div>
        <button className={`end-turn ${views.every((v) => !v.playable) ? 'pulse' : ''}`} disabled={!canAct} onClick={() => { setSel(null); dispatch({ type: 'endTurn' }); }} data-testid="end-turn">
          End Turn
        </button>
      </div>

      <div className="hand-zone">
        <Hand
          views={views}
          sel={sel}
          disabled={!canAct}
          onTap={onTapCard}
          onDrop={onDrop}
          onZoom={setZoom}
          onHover={setHover}
          onDragging={setDragging}
        />
      </div>

      {fx.ghost && <CardFace key={fx.ghost.key} v={fx.ghost.view} w={130} className="ghost" flat />}
      {fx.banner && <div className="banner" key={fx.banner}>{fx.banner}</div>}
      {(combat.phase === 'won' || combat.phase === 'lost') && !busy && (
        <div className="banner-card">
          <h2>{combat.phase === 'won' ? 'Victory!' : 'Defeated...'}</h2>
          <Btn testid="proceed" onClick={() => dispatch({ type: 'proceed' })}>Continue</Btn>
        </div>
      )}
      {combat.pending && !busy && <PendingSheet combat={combat} run={run!} />}
      {busy && <div className="skip-catch" onPointerDown={skip} data-testid="skip" />}
      {pile && (
        <PileSheet
          title={pile === 'draw' ? 'Draw pile' : pile === 'discard' ? 'Discard pile' : 'Compost pile'}
          cards={pile === 'draw' ? combat.draw : pile === 'discard' ? combat.discard : combat.compost}
          run={run!}
          onClose={() => setPile(null)}
        />
      )}
      {zoom && <CardZoom v={zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}
