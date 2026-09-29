// Hand-made card / relic ratings used by the heuristic bot (0..10, "how happy would a competent player be to pick this").
import { getCard } from '../engine/registry';
import type { CardInstance } from '../engine/types';

export const CARD_RATING: Record<string, number> = {
  // starters / tokens
  bonk: 3, cap_up: 3, spore_puff: 4.5, seedling: 4, spore: 3,
  // commons
  fungi_fisticuffs: 5.5, enoki_needles: 4.5, spore_spray: 5.5, root_whip: 5, puffball_pop: 5, gill_slice: 6,
  portobello_punch: 4.5, cap_slam: 4.5, bark_armor: 4.5, mulch: 5.5, shiitake_shuffle: 4, forage: 5.5,
  toxic_drip: 6, fester_cloud: 5.5, drizzle: 5.5, bramble_coat: 4.5, dewdrop_sip: 4, sow_spores: 4.5,
  snappy_sprout: 6, fern_ando: 5, puffball: 6, bramble_patch: 4.5,
  // uncommons
  touch_of_rot: 6, stinkhorn: 6.5, putrefy: 6.5, contagion: 5, fairy_ring: 5.5, decomposer: 5, slow_simmer: 8,
  root_network: 5, green_thumb: 6, glowcap: 6.5, thorny_vine: 7, sunflower: 7, fertilize: 5, mycelium_lash: 6.5,
  rootbound: 5, harvest_moon: 6, spore_surge: 5.5, grave_soil: 5.5, prune: 6, hibernate: 5, puff_up: 7,
  toughen_up: 6, spore_whirl: 7, foragers_pick: 5, spore_sack: 5.5, sporadic_fire: 5.5,
  // rares
  spore_heart: 8, growth_spurt: 8, rot_wave: 6, venom_cap: 6, doomcap: 7, ancient_oak: 8, bumper_crop: 5,
  harvest_time: 5.5, mushroom_cloud: 7, circle_of_life: 5, second_spring: 5, truffle_shuffle: 7, death_cap: 8,
  mother_of_spores: 6.5, downpour: 6.5, sporefall: 6,
};

type Tag = 'rot' | 'garden' | 'compost' | 'spore';
const T = (tag: Tag, ids: string): [string, Tag][] => ids.split(' ').map((i) => [i, tag]);
export const TAGS: Record<string, Tag[]> = {};
for (const [id, tag] of [
  ...T('rot', 'spore_puff spore gill_slice toxic_drip fester_cloud touch_of_rot stinkhorn putrefy contagion fairy_ring slow_simmer grave_soil rot_wave venom_cap doomcap death_cap snappy_sprout'),
  ...T('garden', 'seedling snappy_sprout fern_ando puffball bramble_patch glowcap thorny_vine sunflower fertilize root_network green_thumb fairy_ring root_whip doomcap ancient_oak bumper_crop harvest_time'),
  ...T('compost', 'mulch decomposer prune circle_of_life mycelium_lash rootbound harvest_moon grave_soil mushroom_cloud spore'),
  ...T('spore', 'puffball_pop sow_spores spore_surge spore_sack spore_heart mother_of_spores sporefall spore_whirl sporadic_fire'),
]) (TAGS[id] ??= []).push(tag);

/** Payoff cards that do nothing without their enabler. */
const NEEDS_ROT = new Set(['touch_of_rot', 'putrefy', 'contagion', 'rot_wave', 'fairy_ring']);
const NEEDS_GARDEN = new Set(['fertilize', 'bumper_crop', 'harvest_time', 'green_thumb', 'root_network', 'root_whip', 'fairy_ring']);
const NEEDS_COMPOST = new Set(['decomposer', 'circle_of_life']);

export function deckTagCounts(deck: CardInstance[]): Record<Tag, number> {
  const c: Record<Tag, number> = { rot: 0, garden: 0, compost: 0, spore: 0 };
  for (const card of deck) for (const t of TAGS[card.id] ?? []) c[t]++;
  return c;
}

export function baseRating(id: string): number {
  const d = getCard(id);
  if (d.type === 'status' || d.type === 'curse') return -5;
  return CARD_RATING[id] ?? 4.5;
}

/** Rating of adding `id` to `deck` (synergy aware). */
export function pickRating(id: string, deck: CardInstance[], upgraded = false): number {
  let r = baseRating(id) + (upgraded ? 1 : 0);
  const counts = deckTagCounts(deck);
  const tags = TAGS[id] ?? [];
  for (const t of tags) r += Math.min(1.6, 0.35 * Math.max(0, counts[t] - (t === 'rot' || t === 'garden' ? 1 : 0)));
  if (NEEDS_ROT.has(id) && counts.rot < 3) r -= 2.5 - counts.rot * 0.6;
  if (NEEDS_GARDEN.has(id) && counts.garden < 3) r -= 2;
  if (NEEDS_COMPOST.has(id) && counts.compost < 3) r -= 1.5;
  // too many plants clog the garden
  const plants = deck.filter((c) => getCard(c.id).plant).length;
  if (getCard(id).plant && plants >= 5) r -= 1.5 * (plants - 4);
  // 3+ copies of the same card are worth less
  const copies = deck.filter((c) => c.id === id).length;
  if (copies >= 2 && getCard(id).type !== 'attack') r -= 1.2 * (copies - 1);
  return r;
}

/** Minimum adjusted rating to take a card (deck dilution). */
export function pickThreshold(deck: CardInstance[]): number {
  return 4.6 + 0.16 * Math.max(0, deck.length - 12);
}

export const RELIC_RATING: Record<string, number> = {
  lucky_acorn: 4, dewdrop_vial: 4, tiny_lantern: 5, downy_feather: 4.5, brass_button: 5, pinecone: 4, honey_jar: 5,
  rotten_candle: 5, thimble: 4, smooth_pebble: 4, ticking_bell: 6, mossy_bracer: 6.5, hand_lens: 5, snail_shell: 6,
  beetle_horn: 6, old_bone: 5, four_leaf_clover: 4, mossy_teacup: 4, compass: 5, moonpetal: 5, spore_locket: 8,
  amber_fossil: 5, sunstone: 6, grave_blossom: 7, cap_crown: 7.5, heart_of_the_grove: 3.5, ironbark_seed: 5,
  nightcap: 6, coin_purse: 4, traveling_satchel: 4, potted_sprout: 5, golden_spore: 6, old_map: 4,
};
export const relicRating = (id: string): number => RELIC_RATING[id] ?? 5;
