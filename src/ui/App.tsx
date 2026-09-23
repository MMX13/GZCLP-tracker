import { useCallback, useEffect, useState } from 'react';
import { getState, useApp } from '../data/store';
import { ChalkFilter, formatRest, Icon } from './components';
import { Finish } from './Finish';
import { History } from './History';
import { Program } from './Program';
import { Progress } from './Progress';
import { SettingsScreen } from './Settings';
import { Today } from './Today';
import { Workout } from './Workout';
import { remaining, useRestTimer } from './restTimer';

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
    setRoute({ name, arg });
    if (name !== 'today') safeHistory(() => history.pushState({ name, arg }, ''));
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    safeHistory(() => history.replaceState({ name: 'root' }, ''));
    const onPop = () => {
      setRoute((cur) => (cur.name === 'settings' ? { name: 'program' } : { name: 'today' }));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const inWorkout = route.name === 'workout' && s.active;
  const sessionBar = !!s.active && !inWorkout && route.name !== 'finish';

  useEffect(() => {
    document.body.classList.toggle('in-session', sessionBar);
  }, [sessionBar]);
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
          {sessionBar && s.active && <SessionBar variant={s.active.variant} onResume={() => go('workout')} />}
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
        <div className="toast" style={inWorkout ? undefined : { bottom: `calc(${sessionBar ? 136 : 84}px + var(--safe-b))` }}>
          A new version is ready.
          <button className="btn primary" onClick={onUpdate}>
            Reload
          </button>
        </div>
      )}
    </>
  );
}

/** Shown above the tabs while a session is running, so the lifter can browse and jump back. */
function SessionBar({ variant, onResume }: { variant: string; onResume: () => void }) {
  const t = useRestTimer();
  const rest = t.finished ? 'Rest over' : t.endAt != null ? `Rest ${formatRest(remaining(t))}` : null;
  return (
    <button className="session-bar" onClick={onResume}>
      <span className="grow">
        Day {variant} in progress
        {rest && <span className={t.finished ? 'accent' : 'mu'}> · {rest}</span>}
      </span>
      <span className="btn primary">Resume</span>
    </button>
  );
}
