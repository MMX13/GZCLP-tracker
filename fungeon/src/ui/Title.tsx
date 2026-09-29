import { useState } from 'react';
import { Icon, PlayerArt, audio } from '../art';
import { useGame } from './game';
import { Btn } from './kit';
import { CompendiumSheet, HowToPlaySheet, NewRunSheet, SettingsSheet, StatsSheet } from './Menus';

export function Title() {
  const { hasSave, continueRun, profile } = useGame();
  const [sheet, setSheet] = useState<null | 'new' | 'comp' | 'stats' | 'set' | 'how'>(null);
  const close = () => setSheet(null);
  return (
    <div className="title" data-testid="title">
      <div className="title-sky">
        {Array.from({ length: 14 }).map((_, i) => <i key={i} className="mote" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.9}s`, animationDuration: `${7 + (i % 5)}s` }} />)}
      </div>
      <div className="logo">
        <div className="logo-pip"><PlayerArt size={150} /></div>
        <h1>Fungeon</h1>
        <p>a cozy little dungeon crawl</p>
      </div>
      <div className="title-menu">
        {hasSave && <Btn big testid="continue" onClick={continueRun} icon="arrow">Continue</Btn>}
        <Btn big kind={hasSave ? 'secondary' : 'primary'} testid="new-run" onClick={() => { audio.unlock(); setSheet('new'); }} icon="star">New Run</Btn>
        <div className="title-grid">
          <Btn kind="secondary" testid="btn-compendium" onClick={() => setSheet('comp')} icon="deck">Compendium</Btn>
          <Btn kind="secondary" testid="btn-stats" onClick={() => setSheet('stats')} icon="skull">Stats</Btn>
          <Btn kind="secondary" testid="btn-howto" onClick={() => setSheet('how')} icon="event">How to Play</Btn>
          <Btn kind="secondary" testid="btn-settings" onClick={() => setSheet('set')} icon="settings">Settings</Btn>
        </div>
        <small className="muted">Blight unlocked: {profile.unlocked} · Wins: {profile.stats.wins}</small>
      </div>
      {sheet === 'new' && <NewRunSheet onClose={close} />}
      {sheet === 'comp' && <CompendiumSheet onClose={close} />}
      {sheet === 'stats' && <StatsSheet onClose={close} />}
      {sheet === 'set' && <SettingsSheet onClose={close} />}
      {sheet === 'how' && <HowToPlaySheet onClose={close} />}
      <span className="hidden"><Icon name="close" size={1} /></span>
    </div>
  );
}
