// The single place production code reads content definitions from. Tests may add / override / clear definitions.
import type { CardDef, EncounterDef, EnemyDef, EventDef, PotionDef, RelicDef, StatusDef } from './types';
import * as content from '../content';

const cards: Record<string, CardDef> = { ...content.CARDS };
const relics: Record<string, RelicDef> = { ...content.RELICS };
const potions: Record<string, PotionDef> = { ...content.POTIONS };
const statuses: Record<string, StatusDef> = { ...content.STATUSES };
const enemies: Record<string, EnemyDef> = { ...content.ENEMIES };
const encounters: Record<string, EncounterDef> = { ...content.ENCOUNTERS };
const events: Record<string, EventDef> = { ...content.EVENTS };

/** Bumped on every registry mutation so derived caches (pools) can invalidate. */
export let registryVersion = 0;

// ---- lookups -------------------------------------------------------------------------------------------------
const unknownCards: Record<string, CardDef> = {};
/** Never throws: unknown ids yield an inert unplayable placeholder card (keeps old saves from crashing). */
export function getCard(id: string): CardDef {
  const c = cards[id];
  if (c) return c;
  return (unknownCards[id] ??= {
    id,
    name: id,
    type: 'curse',
    rarity: 'special',
    cost: -1,
    target: 'none',
    vals: {},
    text: 'Unknown card.',
    keywords: ['unplayable'],
    art: 'question',
  });
}
export const findCard = (id: string): CardDef | undefined => cards[id];
export const findRelic = (id: string): RelicDef | undefined => relics[id];
export const findPotion = (id: string): PotionDef | undefined => potions[id];
export const findStatus = (id: string): StatusDef | undefined => statuses[id];
export const findEnemy = (id: string): EnemyDef | undefined => enemies[id];
export const findEncounter = (id: string): EncounterDef | undefined => encounters[id];
export const findEvent = (id: string): EventDef | undefined => events[id];

export const allCards = (): CardDef[] => Object.values(cards);
export const allRelics = (): RelicDef[] => Object.values(relics);
export const allPotions = (): PotionDef[] => Object.values(potions);
export const allStatuses = (): StatusDef[] => Object.values(statuses);
export const allEnemies = (): EnemyDef[] => Object.values(enemies);
export const allEncounters = (): EncounterDef[] => Object.values(encounters);
export const allEvents = (): EventDef[] => Object.values(events);

// ---- derived pools (cached per registry version) ---------------------------------------------------------------
let poolVersion = -1;
let pipPools: Record<string, CardDef[]> = {};
function ensurePools(): void {
  if (poolVersion === registryVersion) return;
  poolVersion = registryVersion;
  pipPools = { common: [], uncommon: [], rare: [] };
  for (const c of Object.values(cards)) {
    if (c.type === 'status' || c.type === 'curse') continue;
    if (c.rarity === 'common' || c.rarity === 'uncommon' || c.rarity === 'rare') pipPools[c.rarity].push(c);
  }
}
/** Pip's card reward pool for a rarity (excludes starter/token/special/status/curse). Order is stable (insertion). */
export function pipCards(rarity: 'common' | 'uncommon' | 'rare'): CardDef[] {
  ensurePools();
  return pipPools[rarity];
}

// ---- test hooks ------------------------------------------------------------------------------------------------
const bump = () => {
  registryVersion++;
};
export function registerCard(d: CardDef): void { cards[d.id] = d; delete unknownCards[d.id]; bump(); }
export function registerRelic(d: RelicDef): void { relics[d.id] = d; bump(); }
export function registerPotion(d: PotionDef): void { potions[d.id] = d; bump(); }
export function registerStatus(d: StatusDef): void { statuses[d.id] = d; bump(); }
export function registerEnemy(d: EnemyDef): void { enemies[d.id] = d; bump(); }
export function registerEncounter(d: EncounterDef): void { encounters[d.id] = d; bump(); }
export function registerEvent(d: EventDef): void { events[d.id] = d; bump(); }

/** Remove every definition of the given kinds (default: all except statuses). For test fixtures. */
export function clearRegistry(opts: { statuses?: boolean } = {}): void {
  for (const m of [cards, relics, potions, enemies, encounters, events] as Record<string, unknown>[])
    for (const k of Object.keys(m)) delete m[k];
  if (opts.statuses) for (const k of Object.keys(statuses)) delete statuses[k];
  for (const k of Object.keys(unknownCards)) delete unknownCards[k];
  bump();
}

/** Restore the production content. */
export function resetRegistry(): void {
  const restore = <T>(dst: Record<string, T>, src: Record<string, T>) => {
    for (const k of Object.keys(dst)) delete dst[k];
    Object.assign(dst, src);
  };
  restore(cards, content.CARDS);
  restore(relics, content.RELICS);
  restore(potions, content.POTIONS);
  restore(statuses, content.STATUSES);
  restore(enemies, content.ENEMIES);
  restore(encounters, content.ENCOUNTERS);
  restore(events, content.EVENTS);
  for (const k of Object.keys(unknownCards)) delete unknownCards[k];
  bump();
}
