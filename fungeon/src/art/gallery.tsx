import { createRoot } from 'react-dom/client';
import { Art, EnemyArt, PlayerArt, IntentIcon, Icon } from './index';
import type { IconName } from './index';
import { ART_KEYS } from '../engine/types';
import type { IntentKind } from '../engine/types';
import { CREATURES } from './creatures';

const ENEMIES = Object.keys(CREATURES).filter((k) => k !== 'pip');
const INTENTS: IntentKind[] = ['attack', 'block', 'buff', 'debuff', 'summon', 'sleep', 'unknown', 'escape'];
const ICONS: IconName[] = ['spore', 'nutrient', 'heart', 'block', 'acorn', 'deck', 'discard', 'compost', 'map', 'settings', 'sound-on', 'sound-off', 'close', 'check', 'arrow', 'fight', 'elite', 'rest', 'shop', 'event', 'treasure', 'boss', 'potion-slot', 'skull', 'star'];
const cell = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 11, color: '#e8c9a0', width: 150, fontFamily: 'sans-serif' } as const;
const row = { display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 } as const;
const h = { color: '#f2c14e', fontFamily: 'sans-serif', margin: '10px 0' } as const;

function App() {
  return (
    <div style={{ background: '#1f1a14', padding: 16, minHeight: '100vh' }}>
      <h3 style={h}>Player</h3>
      <div style={row}>
        <div style={cell}><PlayerArt size={140} /><span>Pip</span></div>
        <div style={cell}><PlayerArt size={70} /><span>Pip 70</span></div>
      </div>
      <h3 style={h}>Enemies ({ENEMIES.length})</h3>
      <div style={row}>{ENEMIES.map((id) => <div key={id} style={cell}><EnemyArt id={id} size={140} /><span>{id}</span></div>)}
        <div style={cell}><EnemyArt id="???" size={140} /><span>fallback</span></div></div>
      <h3 style={h}>Enemies at 56px</h3>
      <div style={row}>{ENEMIES.map((id) => <EnemyArt key={id} id={id} size={56} />)}</div>
      <h3 style={h}>Intents (24px / 48px)</h3>
      <div style={row}>{INTENTS.map((k) => <div key={k} style={{ ...cell, width: 80 }}><IntentIcon kind={k} size={24} /><IntentIcon kind={k} size={48} /><span>{k}</span></div>)}</div>
      <h3 style={h}>UI icons (20px / 40px)</h3>
      <div style={row}>{ICONS.map((k) => <div key={k} style={{ ...cell, width: 80 }}><Icon name={k} size={20} /><Icon name={k} size={40} /><span>{k}</span></div>)}</div>
      <h3 style={h}>Art keys ({ART_KEYS.length}) at 80px</h3>
      <div style={row}>{ART_KEYS.map((k) => <div key={k} style={{ ...cell, width: 90 }}><Art k={k} size={80} /><span>{k}</span></div>)}</div>
      <h3 style={h}>Status icons at 18px on card colours</h3>
      <div style={{ ...row, background: '#3d5a2a', padding: 8 }}>{ART_KEYS.filter((k) => k.startsWith('st-')).map((k) => <Art key={k} k={k} size={18} />)}</div>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
