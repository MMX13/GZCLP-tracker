// 26 uncommon Pip cards.
import { PLAYER, type CardDef, type CardInstance } from '../engine/types';
import { pickN } from './cards-util';

const FORAGE_POOL = ['bonk', 'cap_up', 'spore_puff', 'gill_slice', 'root_whip', 'forage', 'seedling', 'puffball_pop', 'fungi_fisticuffs', 'toxic_drip'];

export const UNCOMMON_CARDS: CardDef[] = [
  // ---------------- Rot
  {
    id: 'touch_of_rot', name: 'Touch of Rot', type: 'skill', rarity: 'uncommon', cost: 1, target: 'enemy',
    vals: { times: 2 }, up: { times: 3 }, text: "Multiply the target's Rot by {times}.", keywords: ['compost'], art: 'rot-touch',
    play: (api, v, t) => { const r = api.status(t!, 'rot'); if (r > 0) api.apply(t!, 'rot', r * (v.times - 1)); },
  },
  {
    id: 'stinkhorn', name: 'Stinkhorn', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy',
    vals: { dmg: 8, rot: 4 }, up: { dmg: 11, rot: 6 }, text: 'Deal {dmg} damage. Apply {rot} Rot.', art: 'stinkhorn',
    play: (api, v, t) => { api.attack(t!, v.dmg); api.apply(t!, 'rot', v.rot); },
  },
  {
    id: 'putrefy', name: 'Putrefy', type: 'skill', rarity: 'uncommon', cost: 1, upCost: 0, target: 'enemy',
    vals: {}, text: 'The target loses HP equal to its Rot.', art: 'decay',
    play: (api, _v, t) => { const r = api.status(t!, 'rot'); if (r > 0) api.loseHp(t!, r); },
  },
  {
    id: 'contagion', name: 'Contagion', type: 'skill', rarity: 'uncommon', cost: 1, upCost: 0, target: 'enemy',
    vals: {}, text: "Copy the target's Rot to all other enemies.", art: 'fester',
    play: (api, _v, t) => {
      const r = api.status(t!, 'rot');
      if (r <= 0) return;
      for (const e of api.enemies()) if (e.uid !== t) api.apply(e.uid, 'rot', r);
    },
  },

  // ---------------- Powers
  {
    id: 'fairy_ring', name: 'Fairy Ring', type: 'power', rarity: 'uncommon', cost: 1, target: 'none',
    vals: { n: 2 }, up: { n: 3 }, text: 'Whenever a plant blooms, apply {n} Rot to ALL enemies.', art: 'fairy-ring',
    play: (api, v) => { api.apply(PLAYER, 'pw_fairy_ring', v.n); },
  },
  {
    id: 'decomposer', name: 'Decomposer', type: 'power', rarity: 'uncommon', cost: 1, target: 'none',
    vals: { n: 3 }, up: { n: 4 }, text: 'Whenever you Compost a card, hit a random enemy for {n}.', art: 'mycelium-web',
    play: (api, v) => { api.apply(PLAYER, 'pw_decomposer', v.n); },
  },
  {
    id: 'slow_simmer', name: 'Slow Simmer', type: 'power', rarity: 'uncommon', cost: 3, target: 'none',
    vals: { n: 2 }, up: { n: 3 }, text: 'At the start of your turn, apply {n} Rot to ALL enemies.', art: 'toxic-drip',
    play: (api, v) => { api.apply(PLAYER, 'pw_slow_simmer', v.n); },
  },
  {
    id: 'root_network', name: 'Root Network', type: 'power', rarity: 'uncommon', cost: 1, target: 'none',
    vals: { n: 2 }, up: { n: 3 }, text: 'At end of turn, gain {n} Block per Plant.', art: 'root-network',
    play: (api, v) => { api.apply(PLAYER, 'pw_root_network', v.n); },
  },
  {
    id: 'green_thumb', name: 'Green Thumb', type: 'power', rarity: 'uncommon', cost: 1, target: 'none',
    vals: { n: 1 }, text: 'At the start of your turn, your Plants grow {n} extra.', keywords: [], upKeywords: ['innate'], art: 'sun',
    play: (api, v) => { api.apply(PLAYER, 'pw_green_thumb', v.n); },
  },

  // ---------------- Plants
  {
    id: 'glowcap', name: 'Glowcap', type: 'plant', rarity: 'uncommon', cost: 1, target: 'none',
    vals: { energy: 2, draw: 2 }, up: { draw: 3 }, text: 'Bloom: gain {energy} Spores and draw {draw} cards.', art: 'glowcap-plant',
    plant: { grow: 2, onBloom: (api, v) => { api.gainEnergy(v.energy); api.draw(v.draw); } },
  },
  {
    id: 'thorny_vine', name: 'Thorny Vine', type: 'plant', rarity: 'uncommon', cost: 2, target: 'none',
    vals: { dmg: 3 }, up: { dmg: 4 }, text: 'Each turn: deal {dmg} damage to ALL enemies.', art: 'vine',
    plant: { grow: null, onGrow: (api, v) => { api.attackAll(v.dmg); } },
  },
  {
    id: 'sunflower', name: 'Sunflower', type: 'plant', rarity: 'uncommon', cost: 2, upCost: 1, target: 'none',
    vals: { might: 1, sturdy: 2 }, text: 'Each turn: gain {might} Might. Bloom: gain {sturdy} Sturdy.', art: 'flower',
    plant: {
      grow: 3,
      onGrow: (api, v) => { api.apply(PLAYER, 'might', v.might); },
      onBloom: (api, v) => { api.apply(PLAYER, 'sturdy', v.sturdy); },
    },
  },
  {
    id: 'fertilize', name: 'Fertilize', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none',
    vals: { n: 1, blk: 4 }, up: { n: 2, blk: 5 }, text: 'Grow all Plants by {n}. Gain {blk} Block.', art: 'compost-heap',
    play: (api, v) => { api.growPlants(v.n); api.gainBlock(v.blk); },
  },

  // ---------------- Bloom cost (Nutrients)
  {
    id: 'mycelium_lash', name: 'Mycelium Lash', type: 'attack', rarity: 'uncommon', cost: 1, nutrients: 2, target: 'enemy',
    vals: { dmg: 14 }, up: { dmg: 19 }, text: 'Deal {dmg} damage.', art: 'mycelium-lash',
    play: (api, v, t) => { api.attack(t!, v.dmg); },
  },
  {
    id: 'rootbound', name: 'Rootbound', type: 'skill', rarity: 'uncommon', cost: 1, nutrients: 2, target: 'none',
    vals: { blk: 14 }, up: { blk: 19 }, text: 'Gain {blk} Block.', art: 'mossy-wall',
    play: (api, v) => { api.gainBlock(v.blk); },
  },
  {
    id: 'harvest_moon', name: 'Harvest Moon', type: 'skill', rarity: 'uncommon', cost: 0, nutrients: 3, upNutrients: 2, target: 'none',
    vals: { energy: 2, draw: 2 }, text: 'Gain {energy} Spores. Draw {draw} cards.', art: 'moon',
    play: (api, v) => { api.gainEnergy(v.energy); api.draw(v.draw); },
  },
  {
    id: 'spore_surge', name: 'Spore Surge', type: 'skill', rarity: 'uncommon', cost: 1, nutrients: 2, target: 'none',
    vals: { spores: 3 }, up: { spores: 4 }, text: 'Add {spores} Spores to your hand.', keywords: ['compost'], art: 'spore-burst',
    play: (api, v) => { api.addCard('spore', 'hand', v.spores); },
  },
  {
    id: 'grave_soil', name: 'Grave Soil', type: 'skill', rarity: 'uncommon', cost: 1, nutrients: 1, target: 'enemy',
    vals: { rot: 7 }, up: { rot: 10 }, text: 'Apply {rot} Rot.', art: 'decay',
    play: (api, v, t) => { api.apply(t!, 'rot', v.rot); },
  },

  // ---------------- Compost / Keep / generic
  {
    id: 'prune', name: 'Prune', type: 'skill', rarity: 'uncommon', cost: 1, upCost: 0, target: 'none',
    vals: {}, text: 'Compost up to 2 cards from your hand. Draw that many.', art: 'shake-off',
    play: (api) => { api.choose({ prompt: 'Compost up to 2 cards', from: 'hand', min: 0, max: 2, action: 'compost' }); },
    afterChoice: (api, _v, chosen) => { if (chosen.length) api.draw(chosen.length); },
  },
  {
    id: 'hibernate', name: 'Hibernate', type: 'skill', rarity: 'uncommon', cost: 2, target: 'none',
    vals: { blk: 12 }, up: { blk: 16 }, text: 'Gain {blk} Block.', keywords: ['keep'], art: 'hunker',
    play: (api, v) => { api.gainBlock(v.blk); },
  },
  {
    id: 'puff_up', name: 'Puff Up', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none',
    vals: { might: 2 }, up: { might: 3 }, text: 'Gain {might} Might.', art: 'glow',
    play: (api, v) => { api.apply(PLAYER, 'might', v.might); },
  },
  {
    id: 'toughen_up', name: 'Toughen Up', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none',
    vals: { sturdy: 2 }, up: { sturdy: 3 }, text: 'Gain {sturdy} Sturdy.', art: 'st-sturdy',
    play: (api, v) => { api.apply(PLAYER, 'sturdy', v.sturdy); },
  },
  {
    id: 'spore_whirl', name: 'Spore Whirl', type: 'attack', rarity: 'uncommon', cost: 'X', target: 'none',
    vals: { dmg: 4 }, up: { dmg: 5 }, text: 'Deal {dmg} damage to ALL enemies X times.', art: 'spore-cloud',
    play: (api, v) => { for (let i = 0; i < v.x; i++) api.attackAll(v.dmg); },
  },
  {
    id: 'foragers_pick', name: "Forager's Pick", type: 'skill', rarity: 'uncommon', cost: 0, target: 'none',
    vals: { up: 0 }, up: { up: 1 },
    text: 'Choose 1 of 3 random cards. It costs 0 this turn.', upText: 'Choose 1 of 3 random upgraded cards. It costs 0 this turn.',
    keywords: ['compost'], art: 'forage',
    play: (api, v) => {
      const ids = pickN(FORAGE_POOL, 3, api.rng);
      const options: CardInstance[] = ids.map((id) => api.makeCard(id, v.up === 1));
      api.choose({ prompt: 'Choose a card', from: 'options', min: 1, max: 1, action: 'toHand', options });
    },
    afterChoice: (api, _v, chosen) => { for (const c of chosen) api.setCost(c.uid, 0, true); },
  },
  {
    id: 'spore_sack', name: 'Spore Sack', type: 'skill', rarity: 'uncommon', cost: 2, target: 'none',
    vals: { spores: 4 }, up: { spores: 5 }, text: 'Add {spores} Spores to your hand.', keywords: ['innate', 'compost'], art: 'acorn-toss',
    play: (api, v) => { api.addCard('spore', 'hand', v.spores); },
  },
  {
    id: 'sporadic_fire', name: 'Spore-adic Fire', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy',
    vals: { dmg: 2 }, up: { dmg: 3 }, text: 'Deal {dmg} damage for each card played this turn.', art: 'spore-burst',
    play: (api, v, t) => {
      const n = Math.min(20, Math.max(1, api.combat.counters.cardsPlayedTurn));
      for (let i = 0; i < n; i++) api.attack(t!, v.dmg);
    },
  },
];
