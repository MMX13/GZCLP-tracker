// EventCtx implementation + event page helpers.
import type { CardInstance, CardSelectPurpose, EventCtx, EventDef, EventPage, EventState, GameEvent, Rarity, RelicRarity, Reward, RunState } from './types';
import { findCard, findEncounter, getCard } from './registry';
import { stream } from './rng';
import { startCombat } from './combat';
import { finishCombat, grantPotion, grantRelic, randomCardId, randomPotionId, randomRelicId } from './rewards';
import { canUpgrade } from './cardutil';

/** Resolve a (possibly dynamic) page definition. */
export function resolvePage(def: EventDef, run: RunState, ev: EventState): EventPage | undefined {
  const p = def.pages[ev.page];
  if (!p) return undefined;
  return typeof p === 'function' ? p(run, ev.mem) : p;
}

export function startPageId(def: EventDef): string {
  return def.pages.start ? 'start' : Object.keys(def.pages)[0];
}

export function makeEventCtx(run: RunState, events: GameEvent[], mem: EventState['mem']): EventCtx {
  const rng = stream(run, 'events');
  const ctx: EventCtx = {
    run,
    mem,
    rng,
    heal(n) {
      if (n <= 0) return;
      const a = Math.min(Math.floor(n), run.maxHp - run.hp);
      if (a <= 0) return;
      run.hp += a;
      events.push({ t: 'heal', target: 'player', amount: a, hpAfter: run.hp });
    },
    damage(n) {
      if (n <= 0) return;
      const a = Math.min(Math.floor(n), run.hp);
      run.hp -= a;
      run.stats.damageTaken += a;
      events.push({ t: 'damage', target: 'player', amount: a, blocked: 0, hpAfter: run.hp, blockAfter: 0, kind: 'hp' });
    },
    gainMaxHp(n) {
      run.maxHp += n;
      run.hp += n;
    },
    loseMaxHp(n) {
      run.maxHp = Math.max(1, run.maxHp - n);
      run.hp = Math.min(run.hp, run.maxHp);
    },
    gainGold(n) {
      if (n <= 0) return;
      run.gold += n;
      run.stats.goldEarned += n;
      events.push({ t: 'gold', delta: n, after: run.gold });
    },
    loseGold(n) {
      const a = Math.min(Math.max(0, n), run.gold);
      if (a <= 0) return;
      run.gold -= a;
      events.push({ t: 'gold', delta: -a, after: run.gold });
    },
    addCard(id, upgraded = false) {
      run.deck.push({ uid: run.nextUid++, id, upgraded });
    },
    addRelic(id) {
      grantRelic(run, id, events);
    },
    randomRelicId: (rarity?: RelicRarity) => randomRelicId(run, rng, rarity),
    addPotion(id) {
      return grantPotion(run, id, events);
    },
    randomPotionId: () => randomPotionId(rng),
    randomCardId: (rarity?: Rarity) => randomCardId(rng, rarity),
    selectCards(purpose: CardSelectPurpose, prompt, count, filter, canSkip = false) {
      const candidates = run.deck
        .filter((c) => (purpose !== 'upgrade' || canUpgrade(c, getCard(c.id))) && (!filter || filter(c)))
        .map((c) => c.uid);
      if (!candidates.length) return;
      const cur = run.screen;
      run.screen = {
        kind: 'cardSelect',
        purpose,
        prompt,
        count,
        candidates,
        canSkip,
        returnTo: cur,
        eventId: cur.kind === 'event' ? cur.event.id : undefined,
      };
    },
    startFight(encounterId, kind) {
      const enc = findEncounter(encounterId);
      if (!enc) return;
      const b = startCombat(run, enc.enemies, kind, enc.id, events);
      if (b.c.phase !== 'player') finishCombat(run, b, events);
    },
    giveRewards(rewards: Reward[]) {
      run.screen = { kind: 'reward', rewards, title: 'Reward' };
    },
    upgradeRandom(count) {
      for (let i = 0; i < count; i++) {
        const cands = run.deck.filter((c) => canUpgrade(c, getCard(c.id)));
        if (!cands.length) return;
        cands[Math.floor(rng() * cands.length)].upgraded = true;
      }
    },
  };
  return ctx;
}

/** Random Pip card (any rarity, different from `notId`) for the transform purpose. */
export function transformCard(run: RunState, c: CardInstance, rng: () => number): CardInstance {
  let id = '';
  for (let i = 0; i < 6; i++) {
    id = randomCardId(rng, undefined, [c.id]);
    if (id && findCard(id)) break;
  }
  return { uid: run.nextUid++, id: id || c.id, upgraded: false };
}
