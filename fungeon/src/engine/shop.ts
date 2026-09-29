// Shop generation and purchases (DESIGN section 7).
import type { CardInstance, GameEvent, RelicDef, RunState, ShopState } from './types';
import { allPotions, allRelics, findPotion, findRelic, pipCards } from './registry';
import { randInt, stream } from './rng';
import { passiveSum } from './combat';
import { grantPotion, grantRelic, randomPotionId, relicRarityRoll } from './rewards';

const REMOVAL_KEY = '#removals=';

/** Number of card removals bought so far this run (stored in run.seenEvents as "#removals=N"; see notes/engine.md). */
export function removalsUsed(run: RunState): number {
  const e = run.seenEvents.find((s) => s.startsWith(REMOVAL_KEY));
  return e ? Number(e.slice(REMOVAL_KEY.length)) || 0 : 0;
}
export function setRemovalsUsed(run: RunState, n: number): void {
  run.seenEvents = run.seenEvents.filter((s) => !s.startsWith(REMOVAL_KEY));
  run.seenEvents.push(REMOVAL_KEY + n);
}

function discounted(run: RunState, price: number): number {
  const d = Math.min(0.9, Math.max(0, passiveSum(run, 'shopDiscount')));
  return Math.max(1, Math.floor(price * (1 - d)));
}

export function relicPrice(d: RelicDef, rng: () => number): number {
  switch (d.rarity) {
    case 'common': return randInt(rng, 140, 160);
    case 'uncommon': return randInt(rng, 220, 260);
    case 'rare': return randInt(rng, 280, 320);
    case 'shop': return 150;
    default: return randInt(rng, 250, 300);
  }
}

export function generateShop(run: RunState): ShopState {
  const rng = stream(run, 'shop');
  const cards: ShopState['cards'] = [];
  const used: string[] = [];
  const slots: ('common' | 'uncommon' | 'rare')[] = ['common', 'common', 'uncommon', 'uncommon', 'rare'];
  for (const rarity of slots) {
    let pool = pipCards(rarity).filter((d) => !used.includes(d.id));
    if (!pool.length) pool = pipCards(rarity);
    if (!pool.length) continue;
    const def = pool[Math.floor(rng() * pool.length)];
    used.push(def.id);
    const base = rarity === 'common' ? randInt(rng, 45, 55) : rarity === 'uncommon' ? randInt(rng, 68, 82) : randInt(rng, 135, 165);
    const card: CardInstance = { uid: run.nextUid++, id: def.id, upgraded: false };
    cards.push({ card, price: base, sold: false });
  }
  if (cards.length) {
    const sale = cards[Math.floor(rng() * cards.length)];
    sale.price = Math.floor(sale.price / 2);
  }
  for (const c of cards) c.price = discounted(run, c.price);

  const relics: ShopState['relics'] = [];
  const owned = new Set(run.relics.map((r) => r.id));
  for (let i = 0; i < 3; i++) {
    const free = (d: RelicDef) => !owned.has(d.id) && !relics.some((r) => r.id === d.id);
    const rarity = i === 2 ? 'shop' : relicRarityRoll(rng);
    let pool = allRelics().filter((d) => free(d) && d.rarity === rarity);
    if (!pool.length) pool = allRelics().filter((d) => free(d) && (d.rarity === 'common' || d.rarity === 'uncommon' || d.rarity === 'rare' || d.rarity === 'shop'));
    if (!pool.length) break;
    const d = pool[Math.floor(rng() * pool.length)];
    relics.push({ id: d.id, price: discounted(run, relicPrice(d, rng)), sold: false });
  }

  const potions: ShopState['potions'] = [];
  const all = allPotions();
  for (let i = 0; i < 3 && all.length; i++) {
    let id = randomPotionId(rng);
    for (let t = 0; t < 5 && potions.some((p) => p.id === id); t++) id = randomPotionId(rng);
    const d = findPotion(id);
    if (!d) continue;
    const price = d.rarity === 'common' ? randInt(rng, 48, 58) : d.rarity === 'uncommon' ? randInt(rng, 59, 67) : randInt(rng, 68, 75);
    potions.push({ id, price: discounted(run, price), sold: false });
  }
  return { cards, relics, potions, removePrice: 75 + 25 * removalsUsed(run), removeUsed: false };
}

function pay(run: RunState, price: number, ev: GameEvent[]): void {
  run.gold -= price;
  ev.push({ t: 'gold', delta: -price, after: run.gold });
}

/** Returns an error string or null. */
export function shopBuy(run: RunState, kind: 'card' | 'relic' | 'potion', index: number, ev: GameEvent[]): string | null {
  if (run.screen.kind !== 'shop') return 'You are not in a shop.';
  const shop = run.screen.shop;
  if (kind === 'card') {
    const item = shop.cards[index];
    if (!item) return 'No such item.';
    if (item.sold) return 'Already sold.';
    if (run.gold < item.price) return 'Not enough Acorns.';
    pay(run, item.price, ev);
    item.sold = true;
    run.deck.push({ uid: run.nextUid++, id: item.card.id, upgraded: item.card.upgraded });
    return null;
  }
  if (kind === 'relic') {
    const item = shop.relics[index];
    if (!item) return 'No such item.';
    if (item.sold) return 'Already sold.';
    if (run.gold < item.price) return 'Not enough Acorns.';
    if (!findRelic(item.id)) return 'Unknown keepsake.';
    pay(run, item.price, ev);
    item.sold = true;
    grantRelic(run, item.id, ev);
    return null;
  }
  const item = shop.potions[index];
  if (!item) return 'No such item.';
  if (item.sold) return 'Already sold.';
  if (run.gold < item.price) return 'Not enough Acorns.';
  if (!run.potions.includes(null)) return 'No free Brew slot.';
  pay(run, item.price, ev);
  item.sold = true;
  grantPotion(run, item.id, ev);
  return null;
}
