// Heuristic "competent human" bot. Combat: beam search over card sequences using the real engine (act()) on a clone with the
// draw pile re-shuffled (so the bot cannot peek at its true future draws), scored by an evaluation function.
import { act, eventView, intentView, selectableNodes } from '../engine/index';
import type { Action, CardInstance, GameEvent, RunState } from '../engine/types';
import { PLAYER } from '../engine/types';
import { dryBattle, playableReason } from '../engine/combat';
import { cardKeywords } from '../engine/cardutil';
import { findPotion, findRelic, getCard, findStatus } from '../engine/registry';
import { canUpgradeCard } from './util';
import { baseRating, pickRating, pickThreshold, relicRating } from './ratings';

export type PickMode = 'rated' | 'random' | 'none';
export interface BotOptions {
  picks: PickMode;
  beam: number;
  depth: number;
  seed: number;
}

// ---------------------------------------------------------------------------------------------------------------
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NEG_STATUS = new Set(['soggy', 'wilted', 'brittle', 'rot']);
const POWER_VALUE: Record<string, number> = { pw_slow_simmer: 15, pw_spore_heart: 15, pw_growth_spurt: 16, pw_green_thumb: 8, pw_root_network: 7 };

interface Meta {
  drawn: number;
  potions: number;
  potionCost: number;
}

/** Score a combat state right before the enemies act. Higher is better. */
export function evalState(run: RunState, meta: Meta): number {
  const s = run.screen;
  if (s.kind === 'defeat') return -1e6;
  if (s.kind !== 'combat') return 1e6 + run.hp * 10 - meta.potions * 5;
  const c = s.combat;
  if (c.phase === 'lost') return -1e6;
  if (c.phase === 'won') return 1e6 + c.player.hp * 10 - meta.potions * 5;
  const p = c.player;
  let sumEff = 0;
  let threat = 0;
  let incoming = 0;
  let hits = 0;
  for (const e of c.enemies) {
    if (!e.alive) continue;
    const rot = e.statuses.rot ?? 0;
    const rotDmg = Math.min(e.hp, (rot * (rot + 1)) / 2) * 0.85;
    let eff = Math.max(0, e.hp + e.block * 0.7 - rotDmg);
    if ((e.statuses.soggy ?? 0) > 0) eff *= 0.85;
    sumEff += eff;
    let dpt = 0;
    const iv = intentView(run, e.uid);
    if (iv && iv.dmg !== undefined) {
      dpt = iv.dmg * (iv.hits ?? 1);
      hits += iv.hits ?? 1;
    }
    if (iv && iv.intents.some((i) => i === 'debuff' || i === 'summon')) dpt += 2;
    incoming += dpt;
    threat += eff + 2 * dpt;
  }
  const rotSelf = p.statuses.rot ?? 0;
  const hpLoss = Math.max(0, incoming - p.block) + rotSelf;
  if (hpLoss >= p.hp) return -1e5 - hpLoss * 10;
  const frac = (p.hp - hpLoss) / p.maxHp;
  const hpW = 1.6 * (1 + (1 - frac));
  const E = Math.min(6, Math.max(1, sumEff / 15));
  const rf = Math.min(1.3, E / 3.5);
  let v = 0;
  for (const [id, n] of Object.entries(p.statuses)) {
    if (id === 'might') v += 6 * n * rf;
    else if (id === 'sturdy') v += 4 * n * rf;
    else if (id === 'prickly') v += Math.min(1.5 * n, 8) * rf * Math.min(3, hits);
    else if (id === 'regrow') v += 0.6 * ((n * (n + 1)) / 2);
    else if (id === 'armored' || id === 'shelled' || id === 'growing') v += 2 * rf;
    else if (NEG_STATUS.has(id)) v -= id === 'rot' ? 0 : 3.5 * Math.min(n, 3);
    else v += ((POWER_VALUE[id] ?? 9) + 0.5 * (n - 1)) * rf;
  }
  for (const pl of c.garden) {
    if (!pl) continue;
    const def = getCard(pl.card.id);
    v += (6 + (def.plant?.grow ? 1.5 * pl.growth : 0)) * rf;
  }
  v += p.nutrients * 1.2;
  v += meta.drawn * (p.energy > 0 ? 1.2 : 0.4);
  v += 0.1 * Math.max(0, p.block - incoming);
  for (const h of c.hand) {
    const d = getCard(h.id);
    if (d.cost === 0 && d.cost !== -1 && !cardKeywords(h, d).includes('unplayable')) v += 2;
  }
  return v - threat - hpW * hpLoss - meta.potions * meta.potionCost;
}

// ---------------------------------------------------------------------------------------------------------------
export class Bot {
  rng: () => number;
  plan: Action[] = [];
  constructor(readonly opts: BotOptions) {
    this.rng = mulberry(opts.seed);
  }

  // ------- combat
  private scramble(run: RunState): RunState {
    const s = structuredClone(run);
    if (s.screen.kind === 'combat') {
      const d = s.screen.combat.draw;
      for (let i = d.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [d[i], d[j]] = [d[j], d[i]];
      }
    }
    s.rng.combat = Math.floor(this.rng() * 4294967296) >>> 0;
    return s;
  }

  private legal(run: RunState, allowPotions: boolean): Action[] {
    if (run.screen.kind !== 'combat') return [];
    const c = run.screen.combat;
    if (c.phase !== 'player') return [];
    if (c.pending) return [this.chooseAction(run)];
    const b = dryBattle(run)!;
    const out: Action[] = [];
    const seen = new Set<string>();
    const living = c.enemies.filter((e) => e.alive);
    for (const card of c.hand) {
      const key = `${card.id}|${card.upgraded}|${card.costOverride ?? ''}`;
      if (seen.has(key)) continue;
      const def = getCard(card.id);
      if (playableReason(b, card, def)) continue;
      seen.add(key);
      if (def.target === 'enemy') for (const e of living) out.push({ type: 'playCard', uid: card.uid, target: e.uid });
      else out.push({ type: 'playCard', uid: card.uid });
    }
    if (allowPotions) {
      run.potions.forEach((id, slot) => {
        const pd = id ? findPotion(id) : undefined;
        if (!pd) return;
        if (pd.target === 'enemy') for (const e of living) out.push({ type: 'usePotion', slot, target: e.uid });
        else out.push({ type: 'usePotion', slot });
      });
    }
    return out;
  }

  private sig(run: RunState): string {
    if (run.screen.kind !== 'combat') return run.screen.kind;
    const c = run.screen.combat;
    return [
      c.hand.map((x) => x.id + (x.upgraded ? '+' : '')).sort().join(','),
      c.player.energy, c.player.block, c.player.hp, c.player.nutrients,
      c.enemies.map((e) => `${e.hp}/${e.block}/${JSON.stringify(e.statuses)}`).join(';'),
      c.garden.map((g) => g?.card.id + ':' + g?.growth).join(','),
      JSON.stringify(c.player.statuses),
      c.pending ? 'P' : '',
    ].join('|');
  }

  private planTurn(run: RunState): Action[] {
    const c = run.screen.kind === 'combat' ? run.screen.combat : null;
    if (!c) return [];
    const frac = c.player.hp / c.player.maxHp;
    const potionCost = (c.kind === 'boss' ? 4 : c.kind === 'elite' ? 8 : 18) * (frac < 0.4 ? 0.3 : 1);
    const allowPotions = run.potions.some(Boolean);
    type Node = { run: RunState; actions: Action[]; score: number; drawn: number; potions: number };
    const meta0 = { drawn: 0, potions: 0, potionCost };
    const root: Node = { run, actions: [], score: evalState(run, meta0), drawn: 0, potions: 0 };
    let best = root;
    let beam: Node[] = [root];
    const seen = new Set<string>([this.sig(run)]);
    for (let d = 0; d < this.opts.depth && beam.length; d++) {
      const kids: Node[] = [];
      for (const node of beam) {
        const acts = this.legal(node.run, allowPotions);
        if (!acts.length) continue;
        const base = this.scramble(node.run);
        for (const a of acts) {
          const r = act(base, a);
          if (r.error) continue;
          const drawn = node.drawn + r.events.reduce((n, e) => n + (e.t === 'draw' ? e.uids.length : 0), 0);
          const potions = node.potions + (a.type === 'usePotion' ? 1 : 0);
          const k: Node = { run: r.run, actions: [...node.actions, a], drawn, potions, score: 0 };
          k.score = evalState(r.run, { drawn, potions, potionCost });
          const sg = this.sig(r.run) + '#' + drawn + '#' + potions;
          if (seen.has(sg)) continue;
          seen.add(sg);
          kids.push(k);
        }
      }
      kids.sort((x, y) => y.score - x.score);
      beam = kids.slice(0, this.opts.beam);
      for (const k of beam) {
        const pend = k.run.screen.kind === 'combat' && k.run.screen.combat.pending;
        if (!pend && k.score > best.score + 1e-9) best = k;
      }
    }
    return best.actions;
  }

  /** Next action while in combat (one call per real action). */
  private combatAction(run: RunState, events: GameEvent[]): Action {
    const c = run.screen.kind === 'combat' ? run.screen.combat : null;
    if (!c) return { type: 'endTurn' };
    if (c.pending) return this.chooseAction(run);
    if (events.some((e) => e.t === 'draw' || e.t === 'newCard' || e.t === 'shuffle' || e.t === 'spawn')) this.plan = [];
    // validate the next planned action
    while (this.plan.length) {
      const a = this.plan[0];
      if (this.isValid(run, a)) return this.plan.shift()!;
      this.plan = [];
    }
    this.plan = this.planTurn(run);
    if (!this.plan.length) return { type: 'endTurn' };
    return this.plan.shift()!;
  }

  private isValid(run: RunState, a: Action): boolean {
    if (run.screen.kind !== 'combat') return false;
    const c = run.screen.combat;
    if (a.type === 'playCard') {
      const card = c.hand.find((x) => x.uid === a.uid);
      if (!card) return false;
      if (a.target !== undefined && !c.enemies.some((e) => e.uid === a.target && e.alive)) return false;
      return !playableReason(dryBattle(run)!, card, getCard(card.id));
    }
    if (a.type === 'usePotion') return !!run.potions[a.slot];
    return true;
  }

  /** In-combat card keep-value (higher = keep / play it). */
  keepValue(card: CardInstance): number {
    const d = getCard(card.id);
    if (d.type === 'status' || d.type === 'curse') return -5;
    if (cardKeywords(card, d).includes('unplayable')) return -5;
    if (card.id === 'spore') return 2;
    return baseRating(card.id) + (card.upgraded ? 0.5 : 0);
  }

  chooseAction(run: RunState): Action {
    const c = (run.screen as Extract<RunState['screen'], { kind: 'combat' }>).combat;
    const p = c.pending!;
    const pool: CardInstance[] =
      p.from === 'options' ? p.options! : p.from === 'hand' ? c.hand : p.from === 'draw' ? c.draw : p.from === 'discard' ? c.discard : c.compost;
    const cands = p.candidates.map((u) => pool.find((x) => x.uid === u)!).filter(Boolean);
    const worstFirst = p.action === 'compost' || p.action === 'discard';
    cands.sort((a, b) => (worstFirst ? this.keepValue(a) - this.keepValue(b) : this.keepValue(b) - this.keepValue(a)));
    let n = p.min;
    if (worstFirst) {
      // take optional extras only when they are junk
      while (n < p.max && n < cands.length && this.keepValue(cands[n]) < 3.6) n++;
    } else {
      while (n < p.max && n < cands.length && this.keepValue(cands[n]) >= 4.5) n++;
    }
    return { type: 'choose', uids: cands.slice(0, n).map((x) => x.uid) };
  }

  // ------- everything else
  next(run: RunState, events: GameEvent[]): Action | null {
    const s = run.screen;
    switch (s.kind) {
      case 'victory':
      case 'defeat':
        return null;
      case 'combat':
        return this.combatAction(run, events);
      case 'map':
        this.plan = [];
        return { type: 'selectNode', nodeId: this.pickNode(run) };
      case 'reward':
        return this.rewardAction(run);
      case 'rest':
        return this.restAction(run);
      case 'shop':
        return this.shopAction(run);
      case 'event':
        return this.eventAction(run);
      case 'treasure':
        return s.opened ? { type: 'proceed' } : { type: 'openTreasure' };
      case 'bossRelic': {
        const best = [...s.options].sort((a, b) => relicRating(b) - relicRating(a))[0];
        return { type: 'pickBossRelic', id: best ?? null };
      }
      case 'cardSelect':
        return this.selectAction(run);
    }
  }

  private typeScore(run: RunState, type: string): number {
    const f = run.hp / run.maxHp;
    switch (type) {
      case 'fight': return f < 0.4 ? -0.5 : 1.2;
      case 'elite': return f > 0.75 ? 2.4 : f > 0.55 ? 0 : -4;
      case 'rest': return f < 0.6 ? 4.5 : f < 0.85 ? 2 : 0.8;
      case 'shop': return run.gold >= 150 ? 3 : run.gold >= 75 ? 1.5 : 0.3;
      case 'event': return 1;
      case 'treasure': return 3.5;
      default: return 0;
    }
  }
  private pathScore(run: RunState, id: string, depth: number): number {
    const n = run.map.nodes[id];
    if (!n) return 0;
    let s = this.typeScore(run, n.type);
    if (depth > 0 && n.next.length) s += 0.7 * Math.max(...n.next.map((x) => this.pathScore(run, x, depth - 1)));
    return s;
  }
  private pickNode(run: RunState): string {
    const opts = selectableNodes(run);
    return [...opts].sort((a, b) => this.pathScore(run, b, 3) - this.pathScore(run, a, 3) || (this.rng() < 0.5 ? -1 : 1))[0];
  }

  private cardAdjusted(run: RunState, card: CardInstance): number {
    return pickRating(card.id, run.deck, card.upgraded);
  }

  private rewardAction(run: RunState): Action {
    const s = run.screen as Extract<RunState['screen'], { kind: 'reward' }>;
    for (let i = 0; i < s.rewards.length; i++) {
      const r = s.rewards[i];
      if (r.taken) continue;
      if (r.kind === 'gold' || r.kind === 'relic') return { type: 'takeReward', index: i };
      if (r.kind === 'potion') {
        if (run.potions.includes(null)) return { type: 'takeReward', index: i };
        continue;
      }
      if (r.kind === 'card') {
        if (this.opts.picks === 'none') return { type: 'skipReward', index: i };
        if (this.opts.picks === 'random') {
          if (this.rng() < 0.25) return { type: 'skipReward', index: i };
          return { type: 'takeReward', index: i, cardIndex: Math.floor(this.rng() * r.options.length) };
        }
        let bi = -1;
        let bv = -Infinity;
        r.options.forEach((o, k) => {
          const v = this.cardAdjusted(run, o);
          if (v > bv) { bv = v; bi = k; }
        });
        if (bv >= pickThreshold(run.deck)) return { type: 'takeReward', index: i, cardIndex: bi };
        return { type: 'skipReward', index: i };
      }
    }
    return { type: 'leaveRewards' };
  }

  private restAction(run: RunState): Action {
    const s = run.screen as Extract<RunState['screen'], { kind: 'rest' }>;
    if (s.done) return { type: 'proceed' };
    const f = run.hp / run.maxHp;
    const beforeBoss = run.floor >= 10;
    const canUp = run.deck.some((c) => canUpgradeCard(c));
    const noHeal = run.relics.some((r) => findRelic(r.id)?.passive?.noHealAtRest);
    if (noHeal) return canUp ? { type: 'rest', option: 'upgrade' } : { type: 'proceed' };
    if (f < (beforeBoss ? 0.8 : 0.55) || !canUp) return { type: 'rest', option: 'heal' };
    return { type: 'rest', option: 'upgrade' };
  }

  private removalValue(card: CardInstance): number {
    const d = getCard(card.id);
    if (d.type === 'curse' || d.type === 'status') return 9;
    if (card.id === 'bonk' || card.id === 'cap_up') return 7 - (card.upgraded ? 2 : 0);
    return 0;
  }

  private shopAction(run: RunState): Action {
    const s = run.screen as Extract<RunState['screen'], { kind: 'shop' }>;
    type Opt = { a: Action; net: number };
    const opts: Opt[] = [];
    const thr = pickThreshold(run.deck);
    if (this.opts.picks !== 'none') {
      if (!s.shop.removeUsed && run.gold >= s.shop.removePrice && run.deck.some((c) => this.removalValue(c) > 0)) {
        const best = Math.max(...run.deck.map((c) => this.removalValue(c)));
        opts.push({ a: { type: 'shopRemove' }, net: best + 5 - s.shop.removePrice / 15 });
      }
      s.shop.cards.forEach((c, index) => {
        if (c.sold || run.gold < c.price) return;
        const r = this.cardAdjusted(run, c.card);
        if (this.opts.picks === 'random') return;
        opts.push({ a: { type: 'shopBuy', kind: 'card', index }, net: (r - thr + 1.5) * 2 - c.price / 15 });
      });
    }
    s.shop.relics.forEach((r, index) => {
      if (r.sold || run.gold < r.price) return;
      opts.push({ a: { type: 'shopBuy', kind: 'relic', index }, net: relicRating(r.id) * 2 + 2 - r.price / 15 });
    });
    if (run.potions.includes(null)) {
      s.shop.potions.forEach((p, index) => {
        if (p.sold || run.gold < p.price) return;
        opts.push({ a: { type: 'shopBuy', kind: 'potion', index }, net: 5 - p.price / 15 });
      });
    }
    opts.sort((x, y) => y.net - x.net);
    if (opts.length && opts[0].net > 0.5) return opts[0].a;
    return { type: 'proceed' };
  }

  private eventAction(run: RunState): Action {
    const v = eventView(run);
    if (!v) return { type: 'eventChoice', index: 0 };
    const f = run.hp / run.maxHp;
    let bi = 0;
    let bv = -Infinity;
    v.choices.forEach((c, i) => {
      if (c.disabled) return;
      const val = this.labelValue(c.label, run, f) + this.rng() * 0.01;
      if (val > bv) { bv = val; bi = i; }
    });
    return { type: 'eventChoice', index: bi };
  }

  /** Crude reading of an event choice label. */
  labelValue(label: string, run: RunState, f: number): number {
    const t = label.toLowerCase();
    let v = 0;
    const num = (re: RegExp) => {
      const m = t.match(re);
      return m ? Number(m[1]) : 0;
    };
    const lowHp = f < 0.5 ? 2 : 1;
    v -= num(/(?:lose|take|pay)s? (\d+) hp/) * 0.3 * lowHp;
    v -= num(/lose (\d+) max hp/) * 0.9;
    v += num(/(?:gain|\+) ?(\d+) max hp/) * 0.9;
    v += num(/max hp (?:\+|by )(\d+)/) * 0.9;
    v += num(/heal (\d+)/) * 0.2 * (f < 0.6 ? 2 : 0.7);
    v -= num(/pay (\d+) acorns/) * 0.03;
    v -= num(/lose (\d+) acorns/) * 0.03;
    v += num(/gain (\d+) acorns/) * 0.03;
    if (/keepsake|relic/.test(t)) v += /pay|65%|%/.test(t) ? 2.5 : 4;
    if (/upgrade/.test(t)) v += /2 random|two/.test(t) ? 5 : 3;
    if (/remove|compost|toss/.test(t)) v += 3;
    if (/transform/.test(t)) v += 1.5;
    if (/brew/.test(t)) v += 1.2;
    if (/rare|card/.test(t) && /gain|add|choose|receive/.test(t)) v += 2;
    if (/mildew|doubt|curse|slime|burr|mold/.test(t)) v -= 3.5;
    if (/elite|fight|ambush|battle/.test(t)) v += f > 0.75 ? 1.5 : -3;
    if (/leave|decline|walk away|ignore/.test(t) && v === 0) v = 0.2;
    return v;
  }

  private selectAction(run: RunState): Action {
    const s = run.screen as Extract<RunState['screen'], { kind: 'cardSelect' }>;
    const cards = s.candidates.map((u) => run.deck.find((c) => c.uid === u)!).filter(Boolean);
    const need = Math.min(s.count, cards.length);
    let sorted: CardInstance[];
    switch (s.purpose) {
      case 'upgrade':
      case 'duplicate':
        sorted = cards.sort((a, b) => this.upgradeValue(b) - this.upgradeValue(a));
        break;
      default:
        // remove / transform / custom trade: worst card first
        sorted = cards.sort((a, b) => -this.removalValue(a) - -this.removalValue(b) || baseRating(a.id) - baseRating(b.id));
        sorted = cards.sort((a, b) => this.removalValue(b) - this.removalValue(a) || baseRating(a.id) - baseRating(b.id));
    }
    if (s.purpose === 'remove' && this.opts.picks === 'none') return { type: 'choose', uids: [] };
    return { type: 'choose', uids: sorted.slice(0, need).map((c) => c.uid) };
  }

  private upgradeValue(c: CardInstance): number {
    const d = getCard(c.id);
    let v = baseRating(c.id);
    if (d.cost === 2 && d.upCost === 1) v += 2;
    if (d.up) v += 0.5;
    if (!d.up && !d.upCost && !d.upKeywords) v -= 4;
    if (c.id === 'bonk' || c.id === 'cap_up') v += 0.5;
    return v;
  }
}

export { PLAYER, findStatus };
