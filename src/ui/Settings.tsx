import { useRef, useState } from 'react';
import { addQuote, exportData, importData, removeQuote, toggleQuoteHidden, updateSettings } from '../data/actions';
import { BUILT_IN_QUOTES } from '../data/quotes';
import { useApp } from '../data/store';
import { formatRest, Icon, Sheet, Stepper, Toggle } from './components';
import { daysSince } from './helpers';

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const s = useApp();
  const st = s.settings;
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [quotes, setQuotes] = useState(false);

  const last = st.lastBackup ? daysSince(st.lastBackup) : null;
  const lastLabel = last == null ? 'Never backed up' : last === 0 ? 'Last backup today' : `Last backup ${last} day${last === 1 ? '' : 's'} ago`;

  return (
    <div className="overlay">
      <div className="overlay-inner screen">
        <div className="head" style={{ alignItems: 'center' }}>
          <button className="icon-btn" onClick={onClose} aria-label="Back">
            <Icon name="back" size={22} />
          </button>
          <h1 style={{ fontSize: 30 }}>Settings</h1>
          <span style={{ width: 40 }} />
        </div>

        <div className="sec">Backup</div>
        <div className="group">
          <button
            className="row tap"
            style={{ width: '100%', textAlign: 'left' }}
            onClick={async () => setMessage((await exportData()) ? 'Backup saved.' : "Backup wasn't saved.")}
          >
            <Icon name="download" className="mu" />
            <div className="grow">
              Export data
              <div className="sub">{lastLabel}</div>
            </div>
            <Icon name="right" className="mu" />
          </button>
          <button className="row tap" style={{ width: '100%', textAlign: 'left' }} onClick={() => file.current?.click()}>
            <Icon name="upload" className="mu" />
            <div className="grow">
              Import data
              <div className="sub">Replaces everything on this phone</div>
            </div>
            <Icon name="right" className="mu" />
          </button>
          <div className="row">
            <Icon name="bell" className="mu" />
            <div className="grow">
              Backup reminder
              <div className="sub">Nudge after 7 days</div>
            </div>
            <Toggle label="Backup reminder" on={st.backupReminder} onChange={(v) => updateSettings({ backupReminder: v })} />
          </div>
        </div>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) setPending(f);
          }}
        />
        {message && (
          <div className="banner" style={{ borderColor: 'var(--border-2)', background: 'var(--surface)' }}>
            {message}
          </div>
        )}

        <div className="sec">Workout</div>
        <div className="box">
          <div className="label">Default rest time for new exercises</div>
          <Stepper
            value={st.defaultRest}
            display={formatRest(st.defaultRest)}
            onDec={() => updateSettings({ defaultRest: Math.max(15, st.defaultRest - 15) })}
            onInc={() => updateSettings({ defaultRest: st.defaultRest + 15 })}
          />
        </div>
        <div className="box">
          <div className="label">Deload weight after failing the last stage</div>
          <Stepper
            value={st.deloadPct}
            display={`${st.deloadPct}%`}
            onDec={() => updateSettings({ deloadPct: Math.max(50, st.deloadPct - 5) })}
            onInc={() => updateSettings({ deloadPct: Math.min(95, st.deloadPct + 5) })}
          />
        </div>
        <div className="group">
          <div className="row">
            <Icon name="phone" className="mu" />
            <div className="grow">Keep screen awake during a workout</div>
            <Toggle label="Keep screen awake" on={st.keepAwake} onChange={(v) => updateSettings({ keepAwake: v })} />
          </div>
          <div className="row">
            <Icon name="vibrate" className="mu" />
            <div className="grow">Vibrate when rest ends</div>
            <Toggle label="Vibrate when rest ends" on={st.vibrate} onChange={(v) => updateSettings({ vibrate: v })} />
          </div>
        </div>

        <div className="sec">Quotes</div>
        <div className="group">
          <button className="row tap" style={{ width: '100%', textAlign: 'left' }} onClick={() => setQuotes(true)}>
            <Icon name="quote" className="mu" />
            <div className="grow">
              Manage quotes
              <div className="sub">
                {BUILT_IN_QUOTES.length - st.hiddenQuotes.length} built in · {s.customQuotes.length} of yours
              </div>
            </div>
            <Icon name="right" className="mu" />
          </button>
        </div>
        <div className="list-note">All data is stored on this phone only. Back up regularly - clearing the browser's site data or losing the phone erases it.</div>
      </div>

      {pending && (
        <Sheet onClose={() => setPending(null)}>
          <div style={{ padding: '0 16px 14px' }}>
            <h2>Replace all data?</h2>
            <p className="mu">
              Importing {pending.name} replaces your program, history and settings on this phone. Export first if you want to keep what's here.
            </p>
          </div>
          <div className="pad btn-row">
            <button className="btn big" onClick={() => setPending(null)}>
              Cancel
            </button>
            <button
              className="btn big danger"
              onClick={async () => {
                const f = pending;
                setPending(null);
                const err = await importData(f);
                setMessage(err ?? 'Import complete.');
              }}
            >
              Replace
            </button>
          </div>
        </Sheet>
      )}
      {quotes && <QuoteManager onClose={() => setQuotes(false)} />}
    </div>
  );
}

function QuoteManager({ onClose }: { onClose: () => void }) {
  const s = useApp();
  const hidden = new Set(s.settings.hiddenQuotes);
  const [text, setText] = useState('');
  const [by, setBy] = useState('');
  const [err, setErr] = useState('');
  return (
    <div className="overlay">
      <div className="overlay-inner screen">
        <div className="head" style={{ alignItems: 'center' }}>
          <button className="icon-btn" onClick={onClose} aria-label="Back">
            <Icon name="back" size={22} />
          </button>
          <div className="cd" style={{ fontSize: 22 }}>
            Quotes
          </div>
          <span style={{ width: 40 }} />
        </div>

        <div className="sec">Add your own</div>
        <div className="box">
          <textarea
            className="field"
            rows={2}
            placeholder="Nobody remembers the easy sets."
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setErr('');
            }}
          />
          <input className="field" style={{ marginTop: 8 }} placeholder="Coach" value={by} onChange={(e) => setBy(e.target.value)} />
          {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 6 }}>{err}</div>}
          <button
            className="btn primary block"
            style={{ marginTop: 10 }}
            onClick={() => {
              if (!text.trim()) return setErr('Write a quote first.');
              addQuote(text, by || 'Coach');
              setText('');
              setBy('');
            }}
          >
            Add quote
          </button>
        </div>

        {s.customQuotes.length > 0 && (
          <>
            <div className="sec">Yours</div>
            <div className="group">
              {s.customQuotes.map((q) => (
                <div className="row" key={q.id}>
                  <div className="grow">
                    {q.text}
                    <div className="sub">— {q.by}</div>
                  </div>
                  <button className="icon-btn" aria-label="Delete quote" onClick={() => removeQuote(q.id)}>
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="sec">Built in</div>
        <div className="group">
          {BUILT_IN_QUOTES.map((q) => (
            <div className="row" key={q.id} style={hidden.has(q.id) ? { opacity: 0.45 } : undefined}>
              <div className="grow">
                {q.text}
                <div className="sub">— {q.by}</div>
              </div>
              <button className="icon-btn" aria-label={hidden.has(q.id) ? 'Show quote' : 'Hide quote'} onClick={() => toggleQuoteHidden(q.id)}>
                <Icon name={hidden.has(q.id) ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
