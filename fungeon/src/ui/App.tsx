import { Component, useEffect } from 'react';
import type { ReactNode } from 'react';
import { audio } from '../art';
import { GameProvider, useGame } from './game';
import { TipProvider } from './kit';
import { Title } from './Title';
import { TopBar } from './TopBar';
import { MapScreen } from './MapScreen';
import { Combat } from './Combat';
import { BossRelicScreen, CardSelectScreen, DefeatScreen, EventScreen, RestScreen, RewardScreen, ShopScreen, TreasureScreen, VictoryScreen } from './Screens';

function Screen() {
  const { screenRun: run } = useGame();
  if (!run) return null;
  const k = run.screen.kind;
  switch (k) {
    case 'map': return <MapScreen />;
    case 'combat': return <Combat />;
    case 'reward': return <RewardScreen run={run} />;
    case 'rest': return <RestScreen run={run} />;
    case 'shop': return <ShopScreen run={run} />;
    case 'event': return <EventScreen run={run} />;
    case 'treasure': return <TreasureScreen run={run} />;
    case 'bossRelic': return <BossRelicScreen run={run} />;
    case 'cardSelect': return <CardSelectScreen run={run} />;
    case 'victory': return <VictoryScreen run={run} />;
    case 'defeat': return <DefeatScreen run={run} />;
  }
}

function Shell() {
  const { screenRun: run, inGame, toast } = useGame();
  const kind = inGame && run ? run.screen.kind : 'title';
  const boss = run && run.screen.kind === 'combat' && run.screen.combat.kind === 'boss';
  useEffect(() => {
    const mood = kind === 'title' ? 'menu' : kind === 'combat' ? (boss ? 'boss' : 'combat') : kind === 'victory' || kind === 'defeat' ? 'none' : 'map';
    audio.music(mood);
  }, [kind, boss]);
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', block);
    document.addEventListener('contextmenu', block);
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => {
      document.removeEventListener('gesturestart', block);
      document.removeEventListener('contextmenu', block);
    };
  }, []);
  const showBar = inGame && run && kind !== 'title' && kind !== 'victory' && kind !== 'defeat';
  return (
    <div className={`app k-${kind}`} data-screen={kind}>
      {inGame && run ? (
        <>
          {showBar && <TopBar />}
          <main className="main"><Screen /></main>
        </>
      ) : <Title />}
      {toast && <div className="toast" role="status" data-testid="toast">{toast}</div>}
    </div>
  );
}

class Boundary extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: unknown) { return { err: String((e as Error)?.message ?? e) }; }
  render() {
    if (this.state.err) {
      return (
        <div className="app crash" data-testid="crash">
          <h2>Oh no, a mushroom tripped!</h2>
          <p>{this.state.err}</p>
          <button className="btn primary" onClick={() => location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  return (
    <Boundary>
      <GameProvider>
        <TipProvider>
          <Shell />
        </TipProvider>
      </GameProvider>
    </Boundary>
  );
}
