import { useState } from 'react';
import { Art, EnemyArt, Icon, IntentIcon, PlayerArt, audio } from '../art';
import { cardView } from '../engine';
import type { CardView } from '../engine';
import { CARDS, POTIONS, RELICS } from '../content';
import { useGame } from './game';
import { Btn, Sheet } from './kit';
import { CardFace, CardZoom } from './Card';
import { BLIGHT_TEXT } from './store';

function Toggle({ on, onChange, label, testid }: { on: boolean; onChange: (v: boolean) => void; label: string; testid?: string }) {
  return (
    <button className={`toggle ${on ? 'on' : ''}`} onClick={() => { audio.play('click'); onChange(!on); }} role="switch" aria-checked={on} data-testid={testid}>
      <span>{label}</span>
      <i><b /></i>
    </button>
  );
}

export function SettingsSheet({ onClose, inRun }: { onClose: () => void; inRun?: boolean }) {
  const { profile, updateSettings, abandon, toTitle, hasSave } = useGame();
  const [confirm, setConfirm] = useState(false);
  const s = profile.settings;
  return (
    <Sheet title="Settings" onClose={onClose} testid="settings">
      <div className="stack">
        <Toggle on={s.sfx} onChange={(v) => updateSettings({ sfx: v })} label="Sound effects" testid="set-sfx" />
        <Toggle on={s.music} onChange={(v) => updateSettings({ music: v })} label="Music" testid="set-music" />
        <Toggle on={s.reduceMotion} onChange={(v) => updateSettings({ reduceMotion: v })} label="Reduce motion" testid="set-reduce" />
        <div className="seg" role="group" aria-label="Animation speed">
          <span>Animation speed</span>
          <div>
            {(['normal', 'fast'] as const).map((k) => (
              <button key={k} className={s.speed === k ? 'on' : ''} onClick={() => { audio.play('click'); updateSettings({ speed: k }); }} data-testid={`set-speed-${k}`}>
                {k === 'normal' ? 'Normal' : 'Fast'}
              </button>
            ))}
          </div>
        </div>
        {inRun && (
          <Btn kind="secondary" testid="save-quit" onClick={() => { onClose(); toTitle(); }}>Save and quit to title</Btn>
        )}
        {(inRun || hasSave) && !confirm && <Btn kind="danger" testid="abandon" onClick={() => setConfirm(true)}>Abandon run</Btn>}
        {confirm && (
          <div className="confirm">
            <p>Abandon this run? It counts as a loss.</p>
            <div className="row gap">
              <Btn kind="danger" testid="abandon-yes" onClick={() => { onClose(); abandon(); }}>Yes, abandon</Btn>
              <Btn kind="secondary" onClick={() => setConfirm(false)}>Keep going</Btn>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

export function StatsSheet({ onClose }: { onClose: () => void }) {
  const { profile } = useGame();
  const st = profile.stats;
  const rows: [string, string | number][] = [
    ['Runs', st.runs],
    ['Wins', st.wins],
    ['Win rate', st.runs ? `${Math.round((st.wins / st.runs) * 100)}%` : '-'],
    ['Best floor', st.bestFloor],
    ['Enemies squished', st.kills],
    ['Win streak (best)', `${st.streak} (${st.bestStreak})`],
    ['Highest Blight unlocked', profile.unlocked],
  ];
  return (
    <Sheet title="Stats" onClose={onClose} testid="stats">
      <div className="stats-list">
        {rows.map(([k, v]) => (
          <div key={k}><span>{k}</span><b>{v}</b></div>
        ))}
      </div>
    </Sheet>
  );
}

function safeView(id: string): CardView | null {
  try { return cardView({ uid: -1, id, upgraded: false }); } catch { return null; }
}

export function CompendiumSheet({ onClose }: { onClose: () => void }) {
  const { profile } = useGame();
  const [tab, setTab] = useState<'cards' | 'relics' | 'potions'>('cards');
  const [zoom, setZoom] = useState<CardView | null>(null);
  const seen = profile.seen;
  const cards = Object.values(CARDS).filter((c) => c.rarity !== 'token' || seen.cards.includes(c.id));
  const relics = Object.values(RELICS);
  const potions = Object.values(POTIONS);
  const counts = { cards: [cards.filter((c) => seen.cards.includes(c.id)).length, cards.length], relics: [relics.filter((c) => seen.relics.includes(c.id)).length, relics.length], potions: [potions.filter((c) => seen.potions.includes(c.id)).length, potions.length] };
  return (
    <Sheet title="Compendium" onClose={onClose} tall testid="compendium">
      <div className="tabs">
        {(['cards', 'relics', 'potions'] as const).map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)} data-testid={`tab-${t}`}>
            {t === 'cards' ? 'Cards' : t === 'relics' ? 'Keepsakes' : 'Brews'} <small>{counts[t][0]}/{counts[t][1]}</small>
          </button>
        ))}
      </div>
      {tab === 'cards' && (
        <div className="grid" style={{ ['--gw' as string]: '92px' }}>
          {cards.map((c) => {
            const ok = seen.cards.includes(c.id);
            const v = ok ? safeView(c.id) : null;
            return (
              <button key={c.id} className={`grid-card ${ok ? '' : 'unseen'}`} onClick={() => v && setZoom(v)}>
                {v ? <CardFace v={v} w={92} flat /> : <div className="card-unseen" style={{ ['--cw' as string]: '92px' }}>?</div>}
              </button>
            );
          })}
        </div>
      )}
      {tab === 'relics' && (
        <div className="list">
          {relics.map((r) => {
            const ok = seen.relics.includes(r.id);
            return (
              <div key={r.id} className={`list-item ${ok ? '' : 'unseen'}`}>
                {ok ? <Art k={r.icon} size={44} /> : <div className="qmark">?</div>}
                <div><b>{ok ? r.name : '???'}</b><p>{ok ? r.desc : 'Not found yet.'}</p></div>
              </div>
            );
          })}
        </div>
      )}
      {tab === 'potions' && (
        <div className="list">
          {potions.map((r) => {
            const ok = seen.potions.includes(r.id);
            return (
              <div key={r.id} className={`list-item ${ok ? '' : 'unseen'}`}>
                {ok ? <Art k={r.icon} size={44} /> : <div className="qmark">?</div>}
                <div><b>{ok ? r.name : '???'}</b><p>{ok ? r.desc : 'Not found yet.'}</p></div>
              </div>
            );
          })}
        </div>
      )}
      {zoom && <CardZoom v={zoom} onClose={() => setZoom(null)} />}
    </Sheet>
  );
}

const PAGES: { title: string; art: React.ReactNode; text: string[] }[] = [
  {
    title: 'Spores & cards',
    art: (
      <div className="hp-art"><PlayerArt size={96} /><div className="orb-demo"><Icon name="spore" size={44} /><b>3</b></div></div>
    ),
    text: ['Each turn you get 3 Spores and draw 5 cards.', 'Cards cost Spores. Unspent Spores are lost, so spend them! Tap a card to lift it, tap again (or drag it up) to play.'],
  },
  {
    title: 'Intents & Block',
    art: (
      <div className="hp-art"><EnemyArt id="slug" size={90} /><div className="intent-demo"><IntentIcon kind="attack" size={40} /><b>9</b></div><div className="orb-demo"><Icon name="block" size={40} /><b>6</b></div></div>
    ),
    text: ['Enemies show what they will do next. The number is the exact damage.', 'Block absorbs attack damage this turn, then fades. Plan how much to block and how much to bonk.'],
  },
  {
    title: 'Rot',
    art: <div className="hp-art"><Art k="st-rot" size={72} /><Art k="rot-touch" size={72} /></div>,
    text: ['Rot is poison. At the start of its turn a rotting enemy loses HP equal to its Rot, then Rot drops by 1.', 'Rot ignores Block. Stack it high and let time do the work.'],
  },
  {
    title: 'The Garden',
    art: <div className="hp-art"><Art k="seedling" size={60} /><Icon name="arrow" size={28} /><Art k="sprout" size={64} /><Icon name="arrow" size={28} /><Art k="flower" size={72} /></div>,
    text: ['Plant cards are sown in a Garden plot instead of being discarded.', 'Each turn they grow by 1 and do something small. At full growth they Bloom for a big effect, then return to your discard pile. Perennials never bloom but work every turn.'],
  },
  {
    title: 'Compost & Nutrients',
    art: <div className="hp-art"><Icon name="compost" size={60} /><Icon name="arrow" size={28} /><Icon name="nutrient" size={60} /></div>,
    text: ['Composted cards are removed from combat and give +1 Nutrient. Nutrients last for the whole fight.', 'Green-gem Bloom cost cards spend Nutrients on top of Spores, and they are powerful. Fleeting cards Compost themselves if left in hand.'],
  },
];

export function HowToPlaySheet({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const p = PAGES[i];
  return (
    <Sheet title="How to play" onClose={onClose} testid="howto">
      <div className="howto">
        <div className="howto-art">{p.art}</div>
        <h3>{p.title}</h3>
        {p.text.map((t, k) => <p key={k}>{t}</p>)}
        <div className="dots">{PAGES.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
        <div className="row gap">
          <Btn kind="secondary" disabled={i === 0} onClick={() => setI(i - 1)} testid="howto-prev">Back</Btn>
          {i < PAGES.length - 1 ? <Btn onClick={() => setI(i + 1)} testid="howto-next">Next</Btn> : <Btn onClick={onClose} testid="howto-done">Got it!</Btn>}
        </div>
      </div>
    </Sheet>
  );
}

export function NewRunSheet({ onClose }: { onClose: () => void }) {
  const { profile, startRun } = useGame();
  const [lvl, setLvl] = useState(Math.min(profile.unlocked, 10));
  return (
    <Sheet title="New run" onClose={onClose} testid="new-run-sheet">
      <div className="center stack">
        <p className="muted">Blight level</p>
        <div className="blight-pick">
          <button className="icon-btn" disabled={lvl <= 0} onClick={() => setLvl(lvl - 1)} aria-label="Lower" data-testid="blight-down"><Icon name="arrow" size={24} /></button>
          <div className="blight-num" data-testid="blight-level">{lvl}</div>
          <button className="icon-btn flip" disabled={lvl >= profile.unlocked} onClick={() => setLvl(lvl + 1)} aria-label="Higher" data-testid="blight-up"><Icon name="arrow" size={24} /></button>
        </div>
        <p className="blight-text">{lvl === 0 ? BLIGHT_TEXT[0] : `+ ${BLIGHT_TEXT[lvl]} (and all lower levels)`}</p>
        <p className="muted small">Unlocked up to {profile.unlocked}. Win to unlock the next!</p>
        <Btn big testid="start-run" onClick={() => { onClose(); startRun(lvl); }}>Begin the hike</Btn>
      </div>
    </Sheet>
  );
}
