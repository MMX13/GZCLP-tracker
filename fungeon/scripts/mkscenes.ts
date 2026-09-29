// Builds saved runs for specific screens (run with: npx tsx scripts/mkscenes.ts > /tmp/claude-0/scenes.json)
import { act, newRun, selectableNodes, serialize } from '../src/engine';
import { generateShop } from '../src/engine/shop';
import { EVENTS, POTIONS } from '../src/content';

const out: Record<string, string> = {};
function base() { const r = newRun({ seed: 'scene', ascension: 0 }); r.gold = 260; return r; }
{ const r = base(); r.screen = { kind: 'shop', shop: generateShop(r) }; out.shop = serialize(r); }
{ const r = base(); r.hp = 40; r.screen = { kind: 'rest', done: false }; out.rest = serialize(r); }
{ const r = base(); r.screen = { kind: 'treasure', opened: false, relicId: 'lucky_acorn' }; out.treasure = serialize(r); }
{ const r = base(); r.screen = { kind: 'victory' }; out.victory = serialize(r); }
{ const r = base(); r.screen = { kind: 'defeat', cause: 'Squished by a Soggy Slug' }; out.defeat = serialize(r); }
{
  const r = base();
  const id = Object.keys(EVENTS)[0];
  r.screen = { kind: 'event', event: { id, page: 'start', mem: {} } };
  out.event = serialize(r);
}
{
  const r = base();
  r.screen = { kind: 'cardSelect', purpose: 'upgrade', prompt: 'Nurture a card', count: 1, candidates: r.deck.map((c) => c.uid), canSkip: true, returnTo: { kind: 'map' } };
  out.upgrade = serialize(r);
}
{
  let r = base();
  const targeted = Object.values(POTIONS).find((p) => p.target === 'enemy');
  const plain = Object.values(POTIONS).find((p) => p.target !== 'enemy');
  r.potions = [targeted?.id ?? null, plain?.id ?? null, null];
  r = act(r, { type: 'selectNode', nodeId: selectableNodes(r)[0] }).run;
  out.potion = serialize(r);
}
console.log(JSON.stringify(out));
