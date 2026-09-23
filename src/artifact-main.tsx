/** Entry point for the Claude artifact build - saves to the artifact's database instead of the browser. */
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { cloudBackend, type Db } from './data/cloud';
import { browserBackend, loadState, setExporter } from './data/store';
import { App } from './ui/App';

type Use = (name: string) => Promise<unknown>;
const use: Use = (name) => {
  const c = (window as unknown as { claude?: { use?: Use } }).claude;
  return c?.use ? c.use(name).catch(() => null) : Promise.resolve(null);
};

let notify: (msg: string) => void = () => undefined;

function Notice() {
  const [msg, setMsg] = useState('');
  useEffect(() => {
    notify = (m) => setMsg(m);
  }, []);
  if (!msg) return null;
  return (
    <div className="toast" role="status" style={{ bottom: 'calc(96px + var(--safe-b))' }}>
      {msg}
      <button className="btn" onClick={() => setMsg('')}>
        OK
      </button>
    </div>
  );
}

async function start() {
  const root = createRoot(document.getElementById('root')!);
  (window as unknown as { __booted?: boolean }).__booted = true;
  root.render(
    <div className="empty" style={{ marginTop: '30vh' }}>
      <h3>Loading your log…</h3>
    </div>,
  );

  const [db, downloads] = (await Promise.all([use('db'), use('downloads')])) as [
    Db | null,
    { save(r: { filename: string; data: string }): Promise<unknown> } | null,
  ];

  setExporter(async (filename, json) => {
    if (!downloads) {
      notify("Backups can't be saved from this view.");
      return false;
    }
    try {
      await downloads.save({ filename, data: json });
      return true;
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code !== 'declined') notify("Backup wasn't saved. Try again in a moment.");
      return false;
    }
  });

  let localOnly = !db;
  try {
    await loadState(db ? cloudBackend(db, (m) => notify(m)) : browserBackend);
  } catch {
    localOnly = true;
    await loadState(browserBackend);
  }

  root.render(
    <>
      <App updateReady={false} onUpdate={() => undefined} />
      <Notice />
    </>,
  );
  if (localOnly) setTimeout(() => notify('Saving in this browser only - your log will not follow you to other devices.'), 300);
}

start().catch((e) => {
  (window as unknown as { __booted?: boolean }).__booted = false;
  window.dispatchEvent(new ErrorEvent('error', { message: String((e as Error)?.message ?? e) }));
});
