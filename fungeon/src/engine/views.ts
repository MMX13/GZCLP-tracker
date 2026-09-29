// View helpers for the UI: card text rendering, intents, statuses, events, glossary.
//
// CARD TEXT CONVENTIONS (content authors read this):
//  * `text` / `upText` use {key} placeholders filled from vals (+ up when upgraded). Keys starting with "dmg" are shown
//    modified by the player's Might / Wilted / relic modifiers (and the target's Soggy when a target is given); keys
//    starting with "blk" by Sturdy / Brittle. Changed numbers get tone 'up' / 'down'. {x} renders as "X" on X-cost cards.
//  * KEYWORDS listed in `keywords` / `upKeywords` (compost, fleeting, keep, innate, unplayable) are appended by the view as
//    a final line ("Fleeting. Compost.") - do NOT write those words as standalone sentences in `text`.
//    (Using the word inside a sentence, e.g. "Compost a card from your hand.", is fine and does not suppress the line.)
//  * Plant cards get "Plant (N)." or "Perennial." appended automatically (before keyword lines) - do not write it.
//  * Bloom (nutrient) cost is shown as a gem by the UI, never in the text.
//  * Known keyword and status names (Compost, Rot, Might, Plant, ...) are returned as segments with tone 'keyword'.
import type { CardView, EventView, IntentView, StatusView } from './index';
import type { CardInstance, EntityId, RunState } from './types';
import { PLAYER, S } from './types';
import type { Keyword } from './types';
import { allStatuses, findEnemy, findStatus, getCard, registryVersion } from './registry';
import { attackDamage, blockAmount, dryBattle, playableReason } from './combat';
import type { Battle } from './combat';
import { cardCost, cardKeywords, cardNutrients, cardVals, isUnplayable, printedCost } from './cardutil';
import { resolvePage } from './events';
import { findEvent } from './registry';

type Seg = { text: string; tone?: 'up' | 'down' | 'keyword' };

export const KEYWORD_LABEL: Record<Keyword, string> = {
  compost: 'Compost',
  fleeting: 'Fleeting',
  keep: 'Keep',
  innate: 'Innate',
  unplayable: 'Unplayable',
};

export const KEYWORD_DESC: Record<string, string> = {
  Compost: 'When played, this card is removed from the fight and you gain 1 Nutrient. Any Composted card gives 1 Nutrient.',
  Fleeting: 'If still in your hand at the end of the turn, this card is Composted.',
  Keep: 'Not discarded at the end of your turn.',
  Innate: 'Starts every fight in your opening hand.',
  Unplayable: 'Cannot be played.',
  Plant: 'Goes into a Garden plot. Grows +1 each of your turns and Blooms when it is fully grown.',
  Perennial: 'A Plant that never Blooms. It acts every turn.',
  Bloom: 'Some cards also cost Nutrients (the leaf gem). Plants Bloom for a big one-shot effect when fully grown.',
  Nutrients: 'Gained by Composting cards. Kept for the whole fight. Spent by Bloom-cost cards.',
  Spores: 'Your energy. Refills each turn; unspent Spores are lost.',
  Block: 'Absorbs attack damage until your next turn.',
  Garden: 'Plants live in Garden plots. You have 3 by default.',
};

let termVersion = -1;
let termRe: RegExp | null = null;
function keywordRegex(): RegExp {
  if (termRe && termVersion === registryVersion) return termRe;
  termVersion = registryVersion;
  const names = new Set<string>([...Object.keys(KEYWORD_DESC).filter((k) => k !== 'Spores' && k !== 'Block' && k !== 'Garden'), ...allStatuses().map((s) => s.name)]);
  const list = [...names].sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  termRe = new RegExp(`\\b(${list.join('|')})\\b`, 'g');
  return termRe;
}

function highlight(text: string, out: Seg[]): void {
  if (!text) return;
  const re = keywordRegex();
  re.lastIndex = 0;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push({ text: m[1], tone: 'keyword' });
    last = m.index + m[1].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
}

function mentioned(text: string, label: string): boolean {
  return new RegExp(`(^|\\n|\\.\\s)${label}\\.`, 'i').test(text);
}

function merge(segs: Seg[]): Seg[] {
  const out: Seg[] = [];
  for (const s of segs) {
    const last = out[out.length - 1];
    if (last && last.tone === s.tone) last.text += s.text;
    else out.push({ ...s });
  }
  return out;
}

export function renderCardText(card: CardInstance, b: Battle | null, target?: EntityId): { text: string; segments: Seg[] } {
  const def = getCard(card.id);
  const vals = cardVals(def, card.upgraded);
  const template = card.upgraded && def.upText ? def.upText : def.text;
  const segs: Seg[] = [];
  const re = /\{(\w+)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template))) {
    if (m.index > last) highlight(template.slice(last, m.index), segs);
    const key = m[1];
    const base = vals[key];
    if (base === undefined) {
      segs.push({ text: key === 'x' ? 'X' : '?' });
    } else {
      let value = base;
      if (b) {
        if (key.startsWith('dmg')) value = attackDamage(b, PLAYER, target, base);
        else if (key.startsWith('blk')) value = blockAmount(b, PLAYER, base);
      }
      segs.push({ text: String(value), tone: value > base ? 'up' : value < base ? 'down' : undefined });
    }
    last = m.index + m[0].length;
  }
  if (last < template.length) highlight(template.slice(last), segs);

  const plain = segs.map((s) => s.text).join('');
  const lines: string[] = [];
  if (def.plant) {
    if (def.plant.grow === null) {
      if (!mentioned(plain, 'Perennial')) lines.push('Perennial.');
    } else if (!/(^|\n|\.\s)Plant \(/i.test(plain)) lines.push(`Plant (${def.plant.grow}).`);
  }
  const kws = cardKeywords(card, def);
  const kwLine: string[] = [];
  for (const k of kws) if (!mentioned(plain, KEYWORD_LABEL[k])) kwLine.push(`${KEYWORD_LABEL[k]}.`);
  if (kwLine.length) lines.push(kwLine.join(' '));
  if (lines.length) {
    segs.push({ text: '\n' });
    highlight(lines.join('\n'), segs);
  }
  const merged = merge(segs);
  return { text: merged.map((s) => s.text).join(''), segments: merged };
}

export function buildCardView(card: CardInstance, run?: RunState, target?: EntityId): CardView {
  const def = getCard(card.id);
  const b = run ? dryBattle(run) : null;
  const { text, segments } = renderCardText(card, b, target);
  const unplayable = isUnplayable(card, def);
  const cost = cardCost(card, def);
  const printed = printedCost(card, def);
  let playable = false;
  let reason: string | undefined;
  if (b) {
    const r = playableReason(b, card, def);
    playable = !r;
    if (r) reason = r;
  }
  return {
    uid: card.uid,
    id: card.id,
    name: card.upgraded ? `${def.name}+` : def.name,
    type: def.type,
    rarity: def.rarity,
    cost: unplayable ? null : cost,
    costChanged: !unplayable && cost !== printed,
    nutrients: cardNutrients(card, def),
    text,
    segments,
    keywords: cardKeywords(card, def),
    art: def.art,
    upgraded: card.upgraded,
    targeted: def.target === 'enemy',
    grow: def.plant ? def.plant.grow : undefined,
    playable,
    reason,
    flavor: def.flavor,
  };
}

export function buildIntentView(run: RunState, uid: EntityId): IntentView | null {
  const b = dryBattle(run);
  if (!b) return null;
  const e = b.c.enemies.find((x) => x.uid === uid);
  if (!e || !e.alive || !e.intent) return null;
  const move = findEnemy(e.id)?.moves[e.intent];
  if (!move) return null;
  const v: IntentView = { name: move.name, intents: move.intents };
  if (move.dmg !== undefined) {
    // The player's turn-decaying debuffs (Soggy) tick down at the end of the player's turn, BEFORE the enemy attacks,
    // so show the damage as it will actually land: evaluate with those stacks reduced by 1.
    const st = b.c.player.statuses;
    const soggy = st[S.soggy];
    if (soggy !== undefined) {
      if (soggy > 1) st[S.soggy] = soggy - 1;
      else delete st[S.soggy];
    }
    try {
      v.dmg = attackDamage(b, e.uid, PLAYER, move.dmg);
    } finally {
      if (soggy !== undefined) st[S.soggy] = soggy;
    }
    v.hits = move.hits ?? 1;
  } else if (move.hits !== undefined) v.hits = move.hits;
  return v;
}

export function buildStatusViews(run: RunState, who: EntityId): StatusView[] {
  if (run.screen.kind !== 'combat') return [];
  const c = run.screen.combat;
  const ent = who === PLAYER ? c.player : c.enemies.find((e) => e.uid === who);
  if (!ent) return [];
  const out: StatusView[] = [];
  for (const [id, n] of Object.entries(ent.statuses)) {
    if (n <= 0) continue;
    const d = findStatus(id);
    let desc = '';
    try {
      desc = d ? d.desc(n) : '';
    } catch {
      desc = '';
    }
    out.push({ id, name: d?.name ?? id, kind: d?.kind ?? 'buff', n, desc, icon: d?.icon ?? 'st-power', showNumber: d?.showNumber ?? true });
  }
  return out;
}

export function buildEventView(run: RunState): EventView | null {
  const s = run.screen;
  if (s.kind !== 'event') return null;
  const def = findEvent(s.event.id);
  if (!def) return null;
  const page = resolvePage(def, run, s.event);
  if (!page) return null;
  return {
    name: def.name,
    art: def.art,
    text: page.text,
    choices: page.choices.map((c) => {
      let disabled: string | null = null;
      try {
        disabled = c.disabled ? c.disabled(run) : null;
      } catch {
        disabled = null;
      }
      return { label: c.label, disabled };
    }),
  };
}

export function buildGlossary(): Record<string, string> {
  const g: Record<string, string> = { ...KEYWORD_DESC };
  for (const s of allStatuses()) {
    try {
      g[s.name] = s.desc(1).replace(/\b1\b/g, 'N');
    } catch {
      g[s.name] = s.name;
    }
  }
  return g;
}
