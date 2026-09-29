// A dumb random player: picks a legal-looking action for whatever screen the run is on.
// Used by the smoke tests (and reusable by the simulator).
import type { Action, RunState } from './types';
import { cardView, selectableNodes, eventView } from './index';
import { getCard } from './registry';

export function randomAction(run: RunState, rnd: () => number): Action | null {
  const s = run.screen;
  const pick = <T>(a: T[]): T => a[Math.floor(rnd() * a.length)];
  switch (s.kind) {
    case 'victory':
    case 'defeat':
      return null;
    case 'map':
      return { type: 'selectNode', nodeId: pick(selectableNodes(run)) };
    case 'combat': {
      const c = s.combat;
      if (c.pending) {
        const p = c.pending;
        const n = p.min + Math.floor(rnd() * (p.max - p.min + 1));
        const uids = [...p.candidates].sort(() => rnd() - 0.5).slice(0, n);
        return { type: 'choose', uids };
      }
      if (rnd() < 0.08) {
        const slots = run.potions.map((p, i) => (p ? i : -1)).filter((i) => i >= 0);
        if (slots.length) {
          const slot = pick(slots);
          const living = c.enemies.filter((e) => e.alive);
          return { type: 'usePotion', slot, target: living.length ? pick(living).uid : undefined };
        }
      }
      const playable = c.hand.filter((card) => cardView(card, run).playable);
      if (playable.length && rnd() < 0.93) {
        const card = pick(playable);
        const def = getCard(card.id);
        const living = c.enemies.filter((e) => e.alive);
        return { type: 'playCard', uid: card.uid, target: def.target === 'enemy' && living.length ? pick(living).uid : undefined };
      }
      return { type: 'endTurn' };
    }
    case 'reward': {
      const i = s.rewards.findIndex((r) => !r.taken);
      if (i < 0 || rnd() < 0.1) return { type: 'leaveRewards' };
      const r = s.rewards[i];
      if (r.kind === 'card') {
        if (rnd() < 0.3) return { type: 'skipReward', index: i };
        return { type: 'takeReward', index: i, cardIndex: Math.floor(rnd() * r.options.length) };
      }
      if (r.kind === 'potion' && !run.potions.includes(null)) return { type: 'leaveRewards' };
      return { type: 'takeReward', index: i };
    }
    case 'rest':
      if (s.done) return { type: 'proceed' };
      return { type: 'rest', option: rnd() < 0.6 ? 'heal' : 'upgrade' };
    case 'shop': {
      const opts: Action[] = [];
      s.shop.cards.forEach((c, index) => !c.sold && run.gold >= c.price && opts.push({ type: 'shopBuy', kind: 'card', index }));
      s.shop.relics.forEach((c, index) => !c.sold && run.gold >= c.price && opts.push({ type: 'shopBuy', kind: 'relic', index }));
      s.shop.potions.forEach((c, index) => !c.sold && run.gold >= c.price && opts.push({ type: 'shopBuy', kind: 'potion', index }));
      if (!s.shop.removeUsed && run.gold >= s.shop.removePrice) opts.push({ type: 'shopRemove' });
      if (!opts.length || rnd() < 0.3) return { type: 'proceed' };
      return pick(opts);
    }
    case 'event': {
      const v = eventView(run);
      const ok = (v?.choices ?? []).map((c, i) => (c.disabled ? -1 : i)).filter((i) => i >= 0);
      return { type: 'eventChoice', index: ok.length ? pick(ok) : 0 };
    }
    case 'treasure':
      return s.opened ? { type: 'proceed' } : { type: 'openTreasure' };
    case 'bossRelic':
      return { type: 'pickBossRelic', id: rnd() < 0.2 ? null : pick(s.options) };
    case 'cardSelect': {
      const need = Math.min(s.count, s.candidates.length);
      if (s.canSkip && rnd() < 0.2) return { type: 'choose', uids: [] };
      return { type: 'choose', uids: [...s.candidates].sort(() => rnd() - 0.5).slice(0, need) };
    }
  }
}
