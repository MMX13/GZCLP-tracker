import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { loadState } from './data/store';
import { App } from './ui/App';

function Root() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    let reloading = false;
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // The very first install takes control without needing a reload.
      if (reloading || !hadController) return;
      reloading = true;
      location.reload();
    });
    navigator.serviceWorker
      .register('./sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        const watch = (w: ServiceWorker | null) => {
          if (!w) return;
          w.addEventListener('statechange', () => {
            if (w.state === 'installed' && navigator.serviceWorker.controller) setWaiting(w);
          });
        };
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
        watch(reg.installing);
        reg.addEventListener('updatefound', () => watch(reg.installing));
        // Check for a new version whenever the app comes back to the foreground.
        document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void reg.update());
      })
      .catch(() => undefined);
  }, []);

  return <App updateReady={!!waiting} onUpdate={() => waiting?.postMessage('skipWaiting')} />;
}

loadState().then(() => {
  createRoot(document.getElementById('root')!).render(<Root />);
});
