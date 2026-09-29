import { useState } from 'react';
import { Art, Icon } from '../art';
import { cardView } from '../engine';
import type { CardInstance, RunState } from '../engine';
import { POTIONS, RELICS } from '../content';
import { useGame } from './game';
import { Btn, Sheet, useTip } from './kit';
import { CardFace, CardZoom, gridCardW } from './Card';
import { SettingsSheet } from './Menus';

const TYPE_ORDER: Record<string, number> = { attack: 0, skill: 1, plant: 2, power: 3, status: 4, curse: 5 };

export function CardGrid({ cards, run, onPick, selected, dimUnselectable, w = gridCardW(), prefix = 'gc' }: {
  cards: CardInstance[]; run?: RunState; onPick?: (c: CardInstance) => void; selected?: number[]; dimUnselectable?: boolean; w?: number; prefix?: string;
}) {
  return (
    <div className="grid" style={{ ['--gw' as string]: `${w}px` }}>
      {cards.map((c) => {
        let v;
        try { v = cardView(c, run); } catch { return null; }
        const sel = selected?.includes(c.uid);
        return (
          <button key={c.uid} className={`grid-card ${sel ? 'picked' : ''}`} onClick={() => onPick?.(c)} data-testid={`${prefix}-${c.uid}`}>
            <CardFace v={v} w={w} dim={dimUnselectable && !sel} flat />
            {sel && <span className="check"><Icon name="check" size={18} /></span>}
          </button>
        );
      })}
    </div>
  );
}

export function PileSheet({ title, cards, run, onClose, sort = true }: { title: string; cards: CardInstance[]; run: RunState; onClose: () => void; sort?: boolean }) {
  const [zoom, setZoom] = useState<CardInstance | null>(null);
  const list = sort
    ? [...cards].sort((a, b) => {
        try {
          const va = cardView(a), vb = cardView(b);
          return (TYPE_ORDER[va.type] - TYPE_ORDER[vb.type]) || va.name.localeCompare(vb.name);
        } catch { return 0; }
      })
    : cards;
  return (
    <Sheet title={`${title} (${cards.length})`} onClose={onClose} tall testid="pile-sheet">
      {cards.length === 0 ? <p className="muted center">Nothing here.</p> : <CardGrid cards={list} run={run} onPick={setZoom} />}
      {zoom && <CardZoom v={cardView(zoom, run)} onClose={() => setZoom(null)} />}
    </Sheet>
  );
}

export function TopBar() {
  const { screenRun: run, fx, dispatch, targeting, setTargeting, busy } = useGame();
  const tip = useTip();
  const [deck, setDeck] = useState(false);
  const [menu, setMenu] = useState(false);
  const [potion, setPotion] = useState<number | null>(null);
  if (!run) return null;
  const combat = run.screen.kind === 'combat' ? run.screen.combat : null;
  const hp = combat ? (fx.ov?.hp.player ?? combat.player.hp) : run.hp;
  const maxHp = combat ? combat.player.maxHp : run.maxHp;
  const inCombat = !!combat;
  const potionId = potion !== null ? run.potions[potion] : null;
  const pdef = potionId ? POTIONS[potionId] : undefined;

  return (
    <header className="topbar" data-testid="topbar">
      <div className="tb-row">
        <div className="tb-stat hp" data-testid="hp"><Icon name="heart" size={22} /><b>{hp}</b><small>/{maxHp}</small></div>
        <div className={`tb-stat gold ${fx.goldFlash ? 'flash' : ''}`} key={`g${fx.goldFlash}`} data-testid="gold"><Icon name="acorn" size={22} /><b>{run.gold}</b></div>
        <div className="tb-act" data-testid="floor">
          <span>Act {run.act}</span>
          <small>Floor {run.floor}</small>
        </div>
        <button className="tb-btn" onClick={() => setDeck(true)} data-testid="deck-btn" aria-label="Deck">
          <Icon name="deck" size={24} /><small>{run.deck.length}</small>
        </button>
        <button className="tb-btn" onClick={() => setMenu(true)} data-testid="menu-btn" aria-label="Menu">
          <Icon name="settings" size={24} />
        </button>
      </div>
      <div className="tb-row second">
        <div className="potions">
          {run.potions.map((p, i) => (
            <button
              key={i}
              className={`potion-slot ${p ? 'full' : ''} ${targeting?.kind === 'potion' && targeting.slot === i ? 'active' : ''}`}
              data-testid={`potion-${i}`}
              disabled={!p || busy}
              onClick={() => (p ? setPotion(i) : undefined)}
              aria-label={p ? POTIONS[p]?.name ?? p : 'Empty brew slot'}
            >
              {p ? <Art k={POTIONS[p]?.icon ?? 'potion-red'} size={30} /> : <Icon name="potion-slot" size={26} />}
            </button>
          ))}
        </div>
        <div className="relics" data-testid="relics">
          {run.relics.map((r) => {
            const d = RELICS[r.id];
            return (
              <button
                key={r.id}
                className={`relic ${fx.relicFlash === r.id ? 'flash' : ''}`}
                data-testid={`relic-${r.id}`}
                onClick={(e) => tip(e.currentTarget, { title: d?.name ?? r.id, body: d?.desc, art: <Art k={d?.icon ?? 'acorn'} size={26} /> })}
                aria-label={d?.name ?? r.id}
              >
                <Art k={d?.icon ?? 'acorn'} size={30} />
                {r.counter > 0 && <i>{r.counter}</i>}
              </button>
            );
          })}
        </div>
      </div>
      {deck && <PileSheet title="Your deck" cards={run.deck} run={run} onClose={() => setDeck(false)} sort={false} />}
      {menu && <SettingsSheet onClose={() => setMenu(false)} inRun />}
      {pdef && potion !== null && (
        <Sheet title={pdef.name} onClose={() => setPotion(null)} testid="potion-sheet">
          <div className="center">
            <Art k={pdef.icon} size={72} />
            <p>{pdef.desc}</p>
            {pdef.target === 'enemy' && <p className="muted">Needs a target.</p>}
            <div className="row gap">
              <Btn
                testid="potion-use"
                disabled={!inCombat && !pdef.outOfCombat}
                onClick={() => {
                  const slot = potion;
                  setPotion(null);
                  const alive = combat ? combat.enemies.filter((e) => e.alive) : [];
                  if (pdef.target === 'enemy' && alive.length === 1) dispatch({ type: 'usePotion', slot, target: alive[0].uid });
                  else if (pdef.target === 'enemy') setTargeting({ kind: 'potion', slot, name: pdef.name });
                  else dispatch({ type: 'usePotion', slot });
                }}
              >
                {inCombat || pdef.outOfCombat ? 'Use' : 'Combat only'}
              </Btn>
              <Btn testid="potion-discard" kind="danger" onClick={() => { dispatch({ type: 'discardPotion', slot: potion }); setPotion(null); }}>Discard</Btn>
            </div>
          </div>
        </Sheet>
      )}
    </header>
  );
}
