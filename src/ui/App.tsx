import { useCallback, useEffect, useState } from 'react';
import { nextQuote } from '../data/actions';
import { getState, useApp } from '../data/store';
import { ChalkFilter, Icon } from './components';
import { Finish } from './Finish';
import { History } from './History';
import { Program } from './Program';
import { Progress } from './Progress';
import { SettingsScreen } from './Settings';
import { Today } from './Today';
import { Workout } from './Workout';

function safeHistory(fn: () => void) {
  try {
    fn();
  } catch {
    /* history is unavailable in some embedded views */
  }
}

type Route = { name: string; arg?: string };
const TABS = [
  { name: 'today', label: 'Today', icon: 'barbell' },
  { name: 'history', label: 'History', icon: 'history' },
  { name: 'progress', label: 'Progress', icon: 'chart' },
  { name: 'program', label: 'Program', icon: 'list' },
];

export function App({ updateReady, onUpdate }: { updateReady: boolean; onUpdate: () => void }) {
  const s = useApp();
  const [route, setRoute] = useState<Route>(() => (getState().active ? { name: 'workout' } : { name: 'today' }));

  const go = useCallback((name: string, arg?: string) => {
    setRoute((cur) => {
      if (name === 'today' && cur.name !== 'today') nextQuote();
      return { name, arg };
    });
    if (name !== 'today') safeHistory(() => history.pushState({ name, arg }, ''));
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    safeHistory(() => history.replaceState({ name: 'root' }, ''));
    const onPop = () => {
      setRoute((cur) => {
        if (cur.name === 'settings') return { name: 'program' };
        if (cur.name !== 'today') nextQuote();
        return { name: 'today' };
      });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const inWorkout = route.name === 'workout' && s.active;
  const tab = TABS.some((t) => t.name === route.name) ? route.name : route.name === 'settings' ? 'program' : null;

  return (
    <>
      <ChalkFilter />
      {route.name === 'today' && <Today go={go} />}
      {route.name === 'history' && <History />}
      {route.name === 'progress' && <Progress />}
      {(route.name === 'program' || route.name === 'settings') && <Program go={go} />}
      {route.name === 'settings' && <SettingsScreen onClose={() => go('program')} />}
      {route.name === 'workout' && <Workout go={go} />}
      {route.name === 'finish' && route.arg && <Finish sessionId={route.arg} go={go} />}

      {!inWorkout && route.name !== 'finish' && (
        <nav className="nav">
          <div className="nav-inner">
            {TABS.map((t) => (
              <button key={t.name} className={tab === t.name ? 'on' : ''} onClick={() => go(t.name)}>
                <Icon name={t.icon} size={24} />
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      {updateReady && (
        <div className="toast" style={inWorkout ? undefined : { bottom: 'calc(84px + var(--safe-b))' }}>
          A new version is ready.
          <button className="btn primary" onClick={onUpdate}>
            Reload
          </button>
        </div>
      )}
    </>
  );
}
