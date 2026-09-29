// Non-combat screens: rewards, rest, shop, event, treasure, boss relic, card select, victory, defeat.
import { useMemo, useState } from 'react';
import { Art, Icon, PlayerArt, audio } from '../art';
import { cardView, eventView, restInfo, upgradedView } from '../engine';
import type { RestInfo } from '../engine';
import type { CardInstance, CardView, RunState, Screen } from '../engine';
import { POTIONS, RELICS } from '../content';
import { useGame } from './game';
import { Btn, Loot, Sheet } from './kit';
import { CardFace, CardZoom, gridCardW } from './Card';
import { CardGrid } from './TopBar';
import { ACT_NAMES } from './store';

type Of<K extends Screen['kind']> = Extract<Screen, { kind: K }>;

function safeView(c: CardInstance, run?: RunState): CardView | null {
  try { return cardView(c, run); } catch { return null; }
}

// ------------------------------------------------------------------ rewards
export function RewardScreen({ run }: { run: RunState }) {
  const s = run.screen as Of<'reward'>;
  const { dispatch } = useGame();
  const [pick, setPick] = useState<number | null>(null); // reward index of the open card reward
  const [cardSel, setCardSel] = useState<number | null>(null);
  const open = pick !== null ? s.rewards[pick] : null;
  const left = s.rewards.filter((r) => !r.taken).length;
  return (
    <div className="screen reward" data-testid="reward">
      <h1>{s.title || 'Rewards'}</h1>
      <div className="reward-list">
        {s.rewards.map((r, i) => {
          if (r.taken) return null;
          if (r.kind === 'gold') return <Loot key={i} testid={`reward-${i}`} art={<Icon name="acorn" size={44} />} title={`${r.amount} Acorns`} onClick={() => dispatch({ type: 'takeReward', index: i })} />;
          if (r.kind === 'card') return <Loot key={i} testid={`reward-${i}`} art={<Icon name="deck" size={44} />} title="Add a card" sub="Choose 1 of the options" onClick={() => { setPick(i); setCardSel(null); }} />;
          if (r.kind === 'relic') {
            const d = RELICS[r.id];
            return <Loot key={i} testid={`reward-${i}`} art={<Art k={d?.icon ?? 'acorn'} size={48} />} title={d?.name ?? r.id} sub={d?.desc} onClick={() => dispatch({ type: 'takeReward', index: i })} />;
          }
          const d = POTIONS[r.id];
          return <Loot key={i} testid={`reward-${i}`} art={<Art k={d?.icon ?? 'potion-red'} size={48} />} title={d?.name ?? r.id} sub={d?.desc} onClick={() => dispatch({ type: 'takeReward', index: i })} />;
        })}
        {left === 0 && <p className="muted center">All tidy!</p>}
      </div>
      <div className="screen-foot"><Btn big testid="proceed" onClick={() => dispatch({ type: 'leaveRewards' })} icon="arrow">Proceed</Btn></div>
      {open && open.kind === 'card' && pick !== null && (
        <Sheet title="Choose a card" onClose={() => setPick(null)} testid="card-reward">
          <div className="choice-row">
            {open.options.map((c, ci) => {
              const v = safeView(c, run);
              if (!v) return null;
              return (
                <button key={c.uid} className={`choice ${cardSel === ci ? 'picked' : ''}`} onClick={() => { audio.play('select'); setCardSel(ci); }} data-testid={`reward-card-${ci}`}>
                  <CardFace v={v} w={gridCardW()} selected={cardSel === ci} flat />
                </button>
              );
            })}
          </div>
          {cardSel !== null && safeView(open.options[cardSel], run) && (
            <div className="sel-detail">
              <b>{safeView(open.options[cardSel], run)!.name}</b>
              <p>{safeView(open.options[cardSel], run)!.text}</p>
            </div>
          )}
          <div className="row gap">
            <Btn testid="card-take" disabled={cardSel === null} onClick={() => { dispatch({ type: 'takeReward', index: pick, cardIndex: cardSel! }); setPick(null); }}>Add to deck</Btn>
            <Btn testid="card-skip" kind="secondary" onClick={() => { dispatch({ type: 'skipReward', index: pick }); setPick(null); }}>Skip</Btn>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ rest
export function RestScreen({ run }: { run: RunState }) {
  const s = run.screen as Of<'rest'>;
  const { dispatch } = useGame();
  let info: RestInfo | null = null;
  try { info = restInfo(run); } catch { /* ignore */ }
  const noHeal = info ? !info.canHeal : false;
  const pct = info?.healPercent ?? 30;
  const heal = info?.healAmount ?? 0;
  return (
    <div className="screen rest" data-testid="rest">
      <h1>Dewdrop Glade</h1>
      <div className="rest-art"><Art k="campfire" size={150} /><div className="rest-pip"><PlayerArt size={84} /></div></div>
      {!s.done ? (
        <div className="rest-choices">
          <button className="big-choice" disabled={noHeal} onClick={() => dispatch({ type: 'rest', option: 'heal' })} data-testid="rest-heal">
            <Icon name="heart" size={40} />
            <b>Rest</b>
            <span>{noHeal ? 'Cannot heal here.' : `Heal ${heal} HP (${pct}%)`}</span>
          </button>
          <button className="big-choice" disabled={info ? !info.canUpgrade : false} onClick={() => dispatch({ type: 'rest', option: 'upgrade' })} data-testid="rest-upgrade">
            <Icon name="star" size={40} />
            <b>Nurture</b>
            <span>Upgrade a card</span>
          </button>
        </div>
      ) : <p className="center big-text">Snug and refreshed!</p>}
      <div className="screen-foot">
        <Btn big testid="proceed" kind={s.done ? 'primary' : 'secondary'} onClick={() => dispatch({ type: 'proceed' })}>{s.done ? 'Onward' : 'Skip'}</Btn>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ shop
type ShopPick = { kind: 'card' | 'relic' | 'potion'; index: number };
export function ShopScreen({ run }: { run: RunState }) {
  const s = run.screen as Of<'shop'>;
  const { dispatch } = useGame();
  const [pick, setPick] = useState<ShopPick | null>(null);
  const shop = s.shop;
  const gold = run.gold;
  let title = '', body: React.ReactNode = null, price = 0, sold = false;
  if (pick) {
    if (pick.kind === 'card') {
      const it = shop.cards[pick.index];
      const v = it && safeView(it.card, run);
      if (it && v) { price = it.price; sold = it.sold; title = v.name; body = <CardFace v={v} w={170} flat />; }
    } else if (pick.kind === 'relic') {
      const it = shop.relics[pick.index]; const d = it && RELICS[it.id];
      if (it) { price = it.price; sold = it.sold; title = d?.name ?? it.id; body = <div className="center"><Art k={d?.icon ?? 'acorn'} size={84} /><p>{d?.desc}</p></div>; }
    } else {
      const it = shop.potions[pick.index]; const d = it && POTIONS[it.id];
      if (it) { price = it.price; sold = it.sold; title = d?.name ?? it.id; body = <div className="center"><Art k={d?.icon ?? 'potion-red'} size={84} /><p>{d?.desc}</p></div>; }
    }
  }
  return (
    <div className="screen shop" data-testid="shop">
      <div className="shop-head">
        <div className="merchant"><Art k="merchant" size={92} /></div>
        <div className="speech"><b>Bartholomew the Beetle</b><span>“Fresh spores, fair prices!”</span></div>
      </div>
      <h3>Cards</h3>
      <div className="shop-cards">
        {shop.cards.map((it, i) => {
          const v = safeView(it.card, run);
          if (!v) return null;
          return (
            <button key={it.card.uid} className={`shop-card ${it.sold ? 'sold' : ''}`} onClick={() => setPick({ kind: 'card', index: i })} data-testid={`shop-card-${i}`} disabled={it.sold}>
              <CardFace v={v} w={gridCardW(28)} flat dim={it.sold} />
              {it.sold ? <span className="sold-tag">SOLD</span> : <span className={`price ${gold < it.price ? 'poor' : ''}`}><Icon name="acorn" size={16} />{it.price}</span>}
            </button>
          );
        })}
      </div>
      <h3>Keepsakes</h3>
      <div className="loot-list">
        {shop.relics.map((it, i) => {
          const d = RELICS[it.id];
          return <Loot key={it.id} testid={`shop-relic-${i}`} art={<Art k={d?.icon ?? 'acorn'} size={40} />} title={d?.name ?? it.id} sub={d?.desc} price={it.price} sold={it.sold} disabled={gold < it.price} onClick={() => !it.sold && setPick({ kind: 'relic', index: i })} />;
        })}
      </div>
      <h3>Brews</h3>
      <div className="loot-list">
        {shop.potions.map((it, i) => {
          const d = POTIONS[it.id];
          return <Loot key={i} testid={`shop-potion-${i}`} art={<Art k={d?.icon ?? 'potion-red'} size={40} />} title={d?.name ?? it.id} sub={d?.desc} price={it.price} sold={it.sold} disabled={gold < it.price} onClick={() => !it.sold && setPick({ kind: 'potion', index: i })} />;
        })}
      </div>
      <h3>Services</h3>
      <div className="loot-list">
        <Loot testid="shop-remove" art={<Icon name="skull" size={38} />} title="Compost a card" sub={shop.removeUsed ? 'Already used this visit' : 'Remove a card from your deck'} price={shop.removePrice} sold={shop.removeUsed} disabled={gold < shop.removePrice} onClick={() => !shop.removeUsed && (gold >= shop.removePrice ? dispatch({ type: 'shopRemove' }) : audio.play('error'))} />
      </div>
      <div className="screen-foot sticky"><Btn big testid="proceed" onClick={() => dispatch({ type: 'proceed' })} icon="arrow">Leave shop</Btn></div>
      {pick && body && (
        <Sheet title={title} onClose={() => setPick(null)} testid="shop-sheet">
          <div className="center stack">
            {body}
            <Btn testid="shop-buy" disabled={sold || gold < price} onClick={() => { dispatch({ type: 'shopBuy', kind: pick.kind, index: pick.index }); setPick(null); }} icon="acorn">
              {sold ? 'Sold' : gold < price ? `Need ${price - gold} more` : `Buy for ${price}`}
            </Btn>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ event
export function EventScreen({ run }: { run: RunState }) {
  const { dispatch } = useGame();
  const view = useMemo(() => { try { return eventView(run); } catch { return null; } }, [run]);
  if (!view) return <div className="screen"><p className="center">Something rustles in the leaves...</p><Btn testid="proceed" onClick={() => dispatch({ type: 'proceed' })}>Continue</Btn></div>;
  return (
    <div className="screen event" data-testid="event">
      <h1>{view.name}</h1>
      <div className="event-art"><Art k={view.art} size={132} /></div>
      <p className="event-text">{view.text}</p>
      <div className="event-choices">
        {view.choices.map((c, i) => (
          <button key={i} className="event-choice" disabled={!!c.disabled} onClick={() => dispatch({ type: 'eventChoice', index: i })} data-testid={`event-choice-${i}`}>
            <span>{c.label}</span>
            {c.disabled && <small>{c.disabled}</small>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ treasure
export function TreasureScreen({ run }: { run: RunState }) {
  const s = run.screen as Of<'treasure'>;
  const { dispatch } = useGame();
  const d = RELICS[s.relicId];
  return (
    <div className="screen treasure" data-testid="treasure">
      <h1>Treasure!</h1>
      <button className={`chest ${s.opened ? 'open' : ''}`} disabled={s.opened} onClick={() => dispatch({ type: 'openTreasure' })} data-testid="treasure-chest" aria-label="Open chest">
        <Art k="chest" size={170} />
      </button>
      {!s.opened && <p className="center muted">Tap the chest to open it.</p>}
      {s.opened && (
        <div className="found">
          <Art k={d?.icon ?? 'acorn'} size={72} />
          <b>{d?.name ?? s.relicId}</b>
          <p>{d?.desc}</p>
        </div>
      )}
      <div className="screen-foot"><Btn big testid="proceed" kind={s.opened ? 'primary' : 'secondary'} onClick={() => dispatch({ type: 'proceed' })}>{s.opened ? 'Onward' : 'Leave it'}</Btn></div>
    </div>
  );
}

// ------------------------------------------------------------------ boss relic
export function BossRelicScreen({ run }: { run: RunState }) {
  const s = run.screen as Of<'bossRelic'>;
  const { dispatch } = useGame();
  const [sel, setSel] = useState<string | null>(null);
  return (
    <div className="screen bossrelic" data-testid="boss-relic">
      <h1>Boss keepsake</h1>
      <p className="center muted">The boss dropped something shiny. Pick one.</p>
      <div className="reward-list">
        {s.options.map((id) => {
          const d = RELICS[id];
          return (
            <button key={id} className={`loot boss ${sel === id ? 'picked' : ''}`} onClick={() => { audio.play('select'); setSel(id); }} data-testid={`boss-relic-${id}`}>
              <div className="loot-art"><Art k={d?.icon ?? 'crown'} size={54} /></div>
              <div className="loot-text"><b>{d?.name ?? id}</b><small>{d?.desc}</small></div>
            </button>
          );
        })}
      </div>
      <div className="screen-foot row gap">
        <Btn big testid="boss-relic-take" disabled={!sel} onClick={() => dispatch({ type: 'pickBossRelic', id: sel })}>Take it</Btn>
        <Btn big kind="secondary" testid="boss-relic-skip" onClick={() => dispatch({ type: 'pickBossRelic', id: null })}>Skip</Btn>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ card select
const PURPOSE_BTN: Record<string, string> = { upgrade: 'Upgrade', remove: 'Compost', transform: 'Transform', duplicate: 'Duplicate', eventCustom: 'Confirm' };
export function CardSelectScreen({ run }: { run: RunState }) {
  const s = run.screen as Of<'cardSelect'>;
  const { dispatch } = useGame();
  const [sel, setSel] = useState<number[]>([]);
  const cards = s.candidates.map((u) => run.deck.find((c) => c.uid === u)).filter((c): c is CardInstance => !!c);
  const toggle = (c: CardInstance) => {
    audio.play('select');
    setSel((cur) => {
      if (cur.includes(c.uid)) return cur.filter((x) => x !== c.uid);
      if (s.count === 1) return [c.uid];
      if (cur.length >= s.count) return [...cur.slice(1), c.uid];
      return [...cur, c.uid];
    });
  };
  const first = sel.length ? cards.find((c) => c.uid === sel[0]) : null;
  let cur: CardView | null = null, up: CardView | null = null;
  if (first && s.purpose === 'upgrade') {
    cur = safeView(first, run);
    try { up = upgradedView(first); } catch { up = null; }
  }
  return (
    <div className="screen cardselect" data-testid="card-select">
      <h1>{s.prompt}</h1>
      {s.count > 1 && <p className="center muted">{sel.length}/{s.count} chosen</p>}
      <div className="cs-grid">
        <CardGrid cards={cards} run={run} onPick={toggle} selected={sel} prefix="cs" />
      </div>
      <div className="cs-foot">
        {cur && up && (
          <div className="preview" data-testid="upgrade-preview">
            <CardFace v={cur} w={104} flat />
            <Icon name="arrow" size={30} />
            <CardFace v={up} w={104} flat />
          </div>
        )}
        <div className="row gap">
          <Btn big testid="select-confirm" disabled={sel.length !== Math.min(s.count, cards.length) && !(sel.length > 0 && sel.length <= s.count && cards.length < s.count)} onClick={() => dispatch({ type: 'choose', uids: sel })}>{PURPOSE_BTN[s.purpose] ?? 'Confirm'}</Btn>
          {s.canSkip && <Btn big kind="secondary" testid="select-skip" onClick={() => dispatch({ type: 'choose', uids: [] })}>Skip</Btn>}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ end screens
function StatsList({ run }: { run: RunState }) {
  const st = run.stats;
  const rows: [string, number | string][] = [
    ['Floors climbed', st.floorsClimbed], ['Enemies squished', st.enemiesKilled], ['Elites', st.elitesKilled], ['Bosses', st.bossesKilled],
    ['Damage dealt', st.damageDealt], ['Damage taken', st.damageTaken], ['Biggest hit', st.maxDamageHit], ['Cards played', st.cardsPlayed], ['Acorns earned', st.goldEarned],
  ];
  return <div className="stats-list">{rows.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}</div>;
}

export function VictoryScreen({ run }: { run: RunState }) {
  const { toTitle, profile } = useGame();
  const next = Math.min(10, run.ascension + 1);
  const newly = profile.unlocked >= next && run.ascension < 10;
  return (
    <div className="screen end victory" data-testid="victory">
      <div className="confetti">{Array.from({ length: 24 }).map((_, i) => <i key={i} style={{ left: `${(i * 41) % 100}%`, animationDelay: `${(i % 8) * 0.25}s`, background: ['#f2c14e', '#4fd1c5', '#d9534f', '#6b8f47'][i % 4] }} />)}</div>
      <PlayerArt size={130} />
      <h1>The Blight is lifted!</h1>
      <p className="center">Pip saved the grove and is very proud.</p>
      {newly && <div className="unlock">Blight level {next} unlocked!</div>}
      <StatsList run={run} />
      <div className="screen-foot"><Btn big testid="to-title" onClick={toTitle}>Back to title</Btn></div>
    </div>
  );
}

export function DefeatScreen({ run }: { run: RunState }) {
  const s = run.screen as Of<'defeat'>;
  const { toTitle } = useGame();
  return (
    <div className="screen end defeat" data-testid="defeat">
      <div className="ghost-pip"><PlayerArt size={120} /></div>
      <h1>You have been composted.</h1>
      <p className="center cause">{s.cause || 'Felled by the forest.'}</p>
      <p className="center muted">Reached Act {run.act} ({ACT_NAMES[run.act]}), floor {run.floor}.</p>
      <StatsList run={run} />
      <div className="screen-foot"><Btn big testid="to-title" onClick={toTitle}>Back to title</Btn></div>
    </div>
  );
}

// re-export used by other modules
export { CardZoom };
