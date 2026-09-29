// Card face + zoom sheet with keyword glossary.
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Art, Icon } from '../art';
import { glossary } from '../engine';
import type { CardView } from '../engine';
import { Sheet } from './kit';

const TYPE_LABEL: Record<string, string> = { attack: 'Attack', skill: 'Skill', power: 'Power', plant: 'Plant', status: 'Status', curse: 'Curse' };

export function CardFace({ v, w, dim, selected, className = '', style, testid, showReason, flat }: {
  v: CardView; w: number; dim?: boolean; selected?: boolean; className?: string; style?: CSSProperties; testid?: string; showReason?: boolean; flat?: boolean;
}) {
  const long = v.name.length > 12;
  return (
    <div
      className={`card t-${v.type} r-${v.rarity} ${dim ? 'dim' : ''} ${selected ? 'sel' : ''} ${v.upgraded ? 'upg' : ''} ${flat ? 'flat' : ''} ${className}`}
      style={{ ['--cw' as string]: `${w}px`, ...style }}
      data-testid={testid}
      data-card={v.id}
    >
      <div className="card-inner">
        <div className={`card-name ${long ? 'long' : ''}`}>{v.name}</div>
        <div className="card-art"><Art k={v.art} size={64} /></div>
        <div className="card-text">
          <span>
            {v.segments.map((s, i) => (
              <span key={i} className={s.tone ? `tone-${s.tone}` : undefined}>{s.text}</span>
            ))}
          </span>
        </div>
        <div className="card-type">
          {TYPE_LABEL[v.type] ?? v.type}
          {v.type === 'plant' && v.grow !== undefined && <span> · {v.grow === null ? 'Perennial' : `Bloom ${v.grow}`}</span>}
          {v.upgraded && <span className="upg-star"> ★</span>}
        </div>
      </div>
      {v.cost !== null && (
        <div className={`gem cost ${v.costChanged ? 'changed' : ''}`}>
          <span className="gem-ic"><Icon name="spore" size={40} /></span>
          <b>{v.cost}</b>
        </div>
      )}
      {v.nutrients > 0 && (
        <div className="gem bloom">
          <span className="gem-ic"><Icon name="nutrient" size={40} /></span>
          <b>{v.nutrients}</b>
        </div>
      )}
      {dim && showReason && v.reason && <div className="card-reason">{v.reason}</div>}
    </div>
  );
}

function norm(s: string) { return s.toLowerCase().replace(/[^a-z ]/g, '').trim(); }

export function glossFor(v: CardView): { name: string; text: string }[] {
  let g: Record<string, string> = {};
  try { g = glossary(); } catch { /* engine not ready */ }
  const byNorm: Record<string, [string, string]> = {};
  for (const [k, t] of Object.entries(g)) byNorm[norm(k)] = [k, t];
  const out: { name: string; text: string }[] = [];
  const seen = new Set<string>();
  const add = (raw: string) => {
    const n = norm(raw);
    let hit = byNorm[n];
    if (!hit) {
      const first = n.split(' ')[0];
      hit = byNorm[first];
    }
    if (hit && !seen.has(hit[0])) { seen.add(hit[0]); out.push({ name: hit[0], text: hit[1] }); }
  };
  v.keywords.forEach(add);
  v.segments.forEach((s) => s.tone === 'keyword' && add(s.text));
  if (v.type === 'plant') add('plant');
  if (v.nutrients > 0) add('bloom cost');
  return out;
}

export function CardZoom({ v, onClose, actions }: { v: CardView; onClose: () => void; actions?: React.ReactNode }) {
  const gl = useMemo(() => glossFor(v), [v]);
  return (
    <Sheet onClose={onClose} title="" testid="card-zoom">
      <div className="zoom">
        <CardFace v={v} w={Math.min(230, Math.round(Math.min(window.innerWidth, 480) * 0.58))} flat />
        {v.flavor && <p className="flavor">“{v.flavor}”</p>}
        {!v.playable && v.reason && <p className="reason">{v.reason}</p>}
        <div className="gloss">
          {gl.map((e) => (
            <p key={e.name}><b>{e.name}</b> {e.text}</p>
          ))}
        </div>
        {actions}
      </div>
    </Sheet>
  );
}
