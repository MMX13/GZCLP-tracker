// 16 rare Pip cards.
import { PLAYER, type CardDef } from '../engine/types';
import { hitRandom } from './cards-util';

export const RARE_CARDS: CardDef[] = [
  // ---------------- Powers (4)
  {
    id: 'spore_heart', name: 'Spore Heart', type: 'power', rarity: 'rare', cost: 1, target: 'none',
    vals: { n: 1 }, up: { n: 2 }, text: 'At the start of your turn, add {n} Spore to your hand.', art: 'spore-heart',
    flavor: 'It beats in threes. Sometimes fours.',
    play: (api, v) => { api.apply(PLAYER, 'pw_spore_heart', v.n); },
  },
  {
    id: 'growth_spurt', name: 'Growth Spurt', type: 'power', rarity: 'rare', cost: 3, upCost: 2, target: 'none',
    vals: { n: 2 }, text: 'At the start of your turn, gain {n} Might.', art: 'crown',
    flavor: 'Nobody told the cap to stop.',
    play: (api, v) => { api.apply(PLAYER, 'pw_growth_spurt', v.n); },
  },
  {
    id: 'rot_wave', name: 'Rot Wave', type: 'power', rarity: 'rare', cost: 1, upCost: 0, target: 'none',
    vals: { n: 1 }, text: "Whenever an enemy dies, spread its Rot to ALL enemies.", art: 'mycelium-web',
    flavor: 'Nothing goes to waste.',
    play: (api, v) => { api.apply(PLAYER, 'pw_rot_wave', v.n); },
  },
  {
    id: 'venom_cap', name: 'Venom Cap', type: 'power', rarity: 'rare', cost: 1, target: 'none',
    vals: { n: 2 }, up: { n: 3 }, text: 'Whenever you are attacked, apply {n} Rot to the attacker.', art: 'fang',
    flavor: 'Bite me. Really. Please.',
    play: (api, v) => { api.apply(PLAYER, 'pw_venom_cap', v.n); },
  },

  // ---------------- Plants (2)
  {
    id: 'doomcap', name: 'Doomcap', type: 'plant', rarity: 'rare', cost: 2, target: 'none',
    vals: { dmg: 10, rot: 10 }, up: { dmg: 14, rot: 14 }, text: 'Bloom: deal {dmg} damage and apply {rot} Rot to ALL enemies.',
    art: 'puffball-plant', flavor: 'Adorable. Do not eat.',
    plant: { grow: 3, onBloom: (api, v) => { api.attackAll(v.dmg); api.applyAll('rot', v.rot); } },
  },
  {
    id: 'ancient_oak', name: 'Ancient Oak', type: 'plant', rarity: 'rare', cost: 3, target: 'none',
    vals: { blk: 5, dmg: 5 }, up: { blk: 7, dmg: 7 }, text: 'Each turn: gain {blk} Block and hit a random enemy for {dmg}.',
    art: 'tree', flavor: 'It has seen things. Mostly squirrels.',
    plant: { grow: null, onGrow: (api, v) => { api.gainBlock(v.blk); hitRandom(api, v.dmg); } },
  },

  // ---------------- Garden glue
  {
    id: 'bumper_crop', name: 'Bumper Crop', type: 'skill', rarity: 'rare', cost: 1, target: 'none',
    vals: { n: 2 }, up: { n: 3 }, text: 'Grow all Plants by {n}. Draw a card for each Bloom.', art: 'flower',
    play: (api, v) => {
      const before = api.combat.counters.bloomsCombat;
      api.growPlants(v.n);
      const d = api.combat.counters.bloomsCombat - before;
      if (d > 0) api.draw(d);
    },
  },
  {
    id: 'harvest_time', name: 'Harvest Time', type: 'skill', rarity: 'rare', cost: 2, upCost: 1, target: 'none',
    vals: {}, text: 'Grow all Plants until they Bloom.', art: 'root-network',
    flavor: 'Ready or not.',
    play: (api) => { api.growPlants(99); },
  },

  // ---------------- Nutrients
  {
    id: 'mushroom_cloud', name: 'Mushroom Cloud', type: 'attack', rarity: 'rare', cost: 2, nutrients: 4, upNutrients: 3, target: 'none',
    vals: { dmg: 18 }, up: { dmg: 22 }, text: 'Deal {dmg} damage to ALL enemies.', art: 'puffball-pop',
    flavor: 'A very, very big puff.',
    play: (api, v) => { api.attackAll(v.dmg); },
  },
  {
    id: 'circle_of_life', name: 'Circle of Life', type: 'skill', rarity: 'rare', cost: 1, nutrients: 3, upNutrients: 2, target: 'none',
    vals: {}, text: 'Return a card from your Compost pile to your hand.', art: 'mirror',
    flavor: 'What rots, returns.',
    play: (api) => { api.choose({ prompt: 'Return a card to your hand', from: 'compost', min: 1, max: 1, action: 'toHand' }); },
  },
  {
    id: 'second_spring', name: 'Second Spring', type: 'skill', rarity: 'rare', cost: 1, nutrients: 2, target: 'none',
    vals: { heal: 6, regrow: 3 }, up: { heal: 9, regrow: 4 }, text: 'Heal {heal} HP. Gain {regrow} Regrow.', keywords: ['compost'], art: 'dew-drop',
    play: (api, v) => { api.heal(PLAYER, v.heal); api.apply(PLAYER, 'regrow', v.regrow); },
  },

  // ---------------- Energy / tokens / debuffs
  {
    id: 'truffle_shuffle', name: 'Truffle Shuffle', type: 'skill', rarity: 'rare', cost: 0, target: 'none',
    vals: { energy: 1, draw: 2 }, up: { draw: 3 }, text: 'Gain {energy} Spore. Draw {draw} cards.', keywords: ['compost'], art: 'acorn',
    flavor: 'Snuffle. Shuffle. Repeat.',
    play: (api, v) => { api.gainEnergy(v.energy); api.draw(v.draw); },
  },
  {
    id: 'death_cap', name: 'Death Cap', type: 'attack', rarity: 'rare', cost: 2, target: 'enemy',
    vals: { dmg: 10, rot: 8 }, up: { dmg: 13, rot: 11 }, text: 'Deal {dmg} damage. Apply {rot} Rot.', keywords: ['compost'], art: 'skull',
    flavor: 'Lovely with butter. (Not really.)',
    play: (api, v, t) => { api.attack(t!, v.dmg); api.apply(t!, 'rot', v.rot); },
  },
  {
    id: 'mother_of_spores', name: 'Mother of Spores', type: 'skill', rarity: 'rare', cost: 2, target: 'none',
    vals: { spores: 4 }, up: { spores: 5 }, text: 'Add {spores} Spore+ to your hand.', keywords: ['compost'], art: 'spore-heart',
    flavor: 'She has so many children.',
    play: (api, v) => { api.addCard('spore', 'hand', v.spores, true); },
  },
  {
    id: 'downpour', name: 'Downpour', type: 'skill', rarity: 'rare', cost: 1, upCost: 0, target: 'none',
    vals: { soggy: 2, wilted: 2 }, text: 'Apply {soggy} Soggy and {wilted} Wilted to ALL enemies.', keywords: ['compost'], art: 'rain',
    flavor: 'Bring an umbrella. Or a cap.',
    play: (api, v) => { api.applyAll('soggy', v.soggy); api.applyAll('wilted', v.wilted); },
  },
  {
    id: 'sporefall', name: 'Sporefall', type: 'skill', rarity: 'rare', cost: 'X', target: 'none',
    vals: { plus: 1 }, up: { plus: 2 }, text: 'Add X+{plus} Spores to your hand.', art: 'spore-cloud',
    flavor: 'It is snowing. Sort of.',
    play: (api, v) => { api.addCard('spore', 'hand', Math.max(0, v.x + v.plus)); },
  },
];
