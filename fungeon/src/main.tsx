import { createRoot } from 'react-dom/client';
import { App } from './ui/App';

createRoot(document.getElementById('root')!).render(<App />);

// Offline support: register the service worker in production builds only. Sandboxed frames may refuse or throw.
window.addEventListener('load', () => {
  try {
    if (process.env.NODE_ENV === 'production' && location.protocol.startsWith('http') && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  } catch {
    /* no offline cache here */
  }
});
