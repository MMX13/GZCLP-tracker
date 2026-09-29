// Small pure helpers about card instances / definitions shared by combat and views.
import type { CardDef, CardInstance, Keyword, Vals } from './types';

export function cardVals(def: CardDef, upgraded: boolean): Vals {
  return upgraded && def.up ? { ...def.vals, ...def.up } : { ...def.vals };
}

/** Printed cost for the card's upgrade state (ignores overrides). */
export function printedCost(card: CardInstance, def: CardDef): number | 'X' {
  return card.upgraded && def.upCost !== undefined ? def.upCost : def.cost;
}

/** Current cost including temporary overrides. 'X' cards ignore overrides. */
export function cardCost(card: CardInstance, def: CardDef): number | 'X' {
  const p = printedCost(card, def);
  if (p === 'X') return 'X';
  return card.costOverride !== undefined ? card.costOverride : p;
}

export function cardKeywords(card: CardInstance, def: CardDef): Keyword[] {
  return (card.upgraded && def.upKeywords ? def.upKeywords : def.keywords) ?? [];
}

export function cardNutrients(card: CardInstance, def: CardDef): number {
  return (card.upgraded && def.upNutrients !== undefined ? def.upNutrients : def.nutrients) ?? 0;
}

export function isUnplayable(card: CardInstance, def: CardDef): boolean {
  return def.cost === -1 || cardKeywords(card, def).includes('unplayable');
}

/** Can this card be upgraded (not already, and a normal card)? */
export function canUpgrade(card: CardInstance, def: CardDef): boolean {
  if (card.upgraded) return false;
  if (def.type === 'status' || def.type === 'curse') return false;
  return true;
}
