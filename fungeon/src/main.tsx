import { createRoot } from 'react-dom/client';
import { App } from './ui/App';

createRoot(document.getElementById('root')!).render(<App />);

// Offline support: register the service worker in production builds only.
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production' && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
