// 22 common Pip cards.
import { PLAYER, type CardDef } from '../engine/types';
import { hitRandom } from './cards-util';

export const COMMON_CARDS: CardDef[] = [
  // ---------------- attacks (8)
  {
    id: 'fungi_fisticuffs', name: 'Fun-guy Fisticuffs', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    vals: { dmg: 4, hits: 2 }, up: { dmg: 5 }, text: 'Deal {dmg} damage {hits} times.', art: 'twin-caps',
    play: (api, v, t) => { for (let i = 0; i < v.hits; i++) api.attack(t!, v.dmg); },
  },
  {
    id: 'enoki_needles', name: 'Enoki Needles', type: 'attack', rarity: 'common', cost: 1, target: 'none',
    vals: { dmg: 4, hits: 3 }, up: { dmg: 5 }, text: 'Deal {dmg} damage to a random enemy {hits} times.', art: 'thorn-jab',
    play: (api, v) => { hitRandom(api, v.dmg, v.hits); },
  },
  {
    id: 'spore_spray', name: 'Spore Spray', type: 'attack', rarity: 'common', cost: 1, target: 'none',
    vals: { dmg: 5 }, up: { dmg: 7 }, text: 'Deal {dmg} damage to ALL enemies.', art: 'spore-cloud',
    play: (api, v) => { api.attackAll(v.dmg); },
  },
  {
    id: 'root_whip', name: 'Root Whip', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    vals: { dmg: 5, bonus: 4 }, up: { dmg: 6, bonus: 5 }, text: 'Deal {dmg} damage. +{bonus} if you have a Plant.', art: 'root-whip',
    play: (api, v, t) => { api.attack(t!, v.dmg + (api.plants().length > 0 ? v.bonus : 0)); },
  },
  {
    id: 'puffball_pop', name: 'Puffball Pop', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    vals: { dmg: 5, spores: 1, sup: 0 }, up: { dmg: 7, sup: 1 },
    text: 'Deal {dmg} damage. Add a Spore to your hand.', upText: 'Deal {dmg} damage. Add a Spore+ to your hand.', art: 'puffball-pop',
    play: (api, v, t) => { api.attack(t!, v.dmg); api.addCard('spore', 'hand', v.spores, v.sup === 1); },
  },
  {
    id: 'gill_slice', name: 'Gill Slice', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    vals: { dmg: 5, rot: 2 }, up: { dmg: 6, rot: 3 }, text: 'Deal {dmg} damage. Apply {rot} Rot.', art: 'gill-slice',
    play: (api, v, t) => { api.attack(t!, v.dmg); api.apply(t!, 'rot', v.rot); },
  },
  {
    id: 'portobello_punch', name: 'Portobello Punch', type: 'attack', rarity: 'common', cost: 2, target: 'enemy',
    vals: { dmg: 15 }, up: { dmg: 20 }, text: 'Deal {dmg} damage.', art: 'cap-slam',
    play: (api, v, t) => { api.attack(t!, v.dmg); },
  },
  {
    id: 'cap_slam', name: 'Cap Slam', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    vals: { dmg: 8 }, up: { dmg: 11 }, text: 'Deal {dmg} damage. Put a discarded card on top of your draw pile.', art: 'headbutt',
    play: (api, v, t) => {
      api.attack(t!, v.dmg);
      api.choose({ prompt: 'Put a card on top of your draw pile', from: 'discard', min: 0, max: 1, action: 'topdeck' });
    },
  },

  // ---------------- skills (10)
  {
    id: 'bark_armor', name: 'Bark Armor', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    vals: { blk: 6 }, up: { blk: 9 }, text: 'Gain {blk} Block.', keywords: ['keep'], art: 'bark-armor',
    play: (api, v) => { api.gainBlock(v.blk); },
  },
  {
    id: 'mulch', name: 'Mulch', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    vals: { blk: 6 }, up: { blk: 8 }, text: 'Gain {blk} Block. Compost a card from your hand.', art: 'mulch',
    play: (api, v) => {
      api.gainBlock(v.blk);
      api.choose({ prompt: 'Compost a card', from: 'hand', min: 1, max: 1, action: 'compost' });
    },
  },
  {
    id: 'shiitake_shuffle', name: 'Shiitake Shuffle', type: 'skill', rarity: 'common', cost: 0, target: 'none',
    vals: { draw: 2 }, up: { draw: 3 }, text: 'Draw {draw} cards. Discard a card.', art: 'shake-off',
    play: (api, v) => {
      api.draw(v.draw);
      api.choose({ prompt: 'Discard a card', from: 'hand', min: 1, max: 1, action: 'discard' });
    },
  },
  {
    id: 'forage', name: 'Forage', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    vals: { blk: 4, draw: 1 }, up: { blk: 6 }, text: 'Gain {blk} Block. Draw {draw} card.', art: 'forage',
    play: (api, v) => { api.gainBlock(v.blk); api.draw(v.draw); },
  },
  {
    id: 'toxic_drip', name: 'Toxic Drip', type: 'skill', rarity: 'common', cost: 1, target: 'enemy',
    vals: { rot: 5 }, up: { rot: 7 }, text: 'Apply {rot} Rot.', art: 'toxic-drip',
    play: (api, v, t) => { api.apply(t!, 'rot', v.rot); },
  },
  {
    id: 'fester_cloud', name: 'Fester Cloud', type: 'skill', rarity: 'common', cost: 2, target: 'none',
    vals: { rot: 4 }, up: { rot: 6 }, text: 'Apply {rot} Rot to ALL enemies.', art: 'fester',
    play: (api, v) => { api.applyAll('rot', v.rot); },
  },
  {
    id: 'drizzle', name: 'Drizzle', type: 'skill', rarity: 'common', cost: 1, target: 'enemy',
    vals: { soggy: 2, draw: 1, blk: 3 }, up: { soggy: 3, blk: 4 }, text: 'Apply {soggy} Soggy. Gain {blk} Block. Draw {draw} card.', art: 'rain',
    play: (api, v, t) => { api.apply(t!, 'soggy', v.soggy); api.gainBlock(v.blk); api.draw(v.draw); },
  },
  {
    id: 'bramble_coat', name: 'Bramble Coat', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    vals: { blk: 6, prickly: 1 }, up: { blk: 7, prickly: 2 }, text: 'Gain {blk} Block. Gain {prickly} Prickly.', art: 'hide-leaf',
    play: (api, v) => { api.gainBlock(v.blk); api.apply(PLAYER, 'prickly', v.prickly); },
  },
  {
    id: 'dewdrop_sip', name: 'Dewdrop Sip', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    vals: { blk: 3, regrow: 2 }, up: { blk: 5, regrow: 3 }, text: 'Gain {blk} Block. Gain {regrow} Regrow.', art: 'dew-drop',
    play: (api, v) => { api.gainBlock(v.blk); api.apply(PLAYER, 'regrow', v.regrow); },
  },
  {
    id: 'sow_spores', name: 'Sow Spores', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    vals: { spores: 2, draw: 1 }, up: { spores: 3 }, text: 'Add {spores} Spores to your hand. Draw {draw} card.', art: 'spore-burst',
    play: (api, v) => { api.addCard('spore', 'hand', v.spores); api.draw(v.draw); },
  },

  // ---------------- plants (4)
  {
    id: 'snappy_sprout', name: 'Snappy Sprout', type: 'plant', rarity: 'common', cost: 1, target: 'none',
    vals: { dmg: 3, rot: 3 }, up: { dmg: 4, rot: 4 },
    text: 'Each turn: hit a random enemy for {dmg}. Bloom: {rot} Rot to ALL.', art: 'sprout',
    plant: {
      grow: 2,
      onGrow: (api, v) => { hitRandom(api, v.dmg); },
      onBloom: (api, v) => { api.applyAll('rot', v.rot); },
    },
  },
  {
    id: 'fern_ando', name: 'Fern-ando', type: 'plant', rarity: 'common', cost: 1, target: 'none',
    vals: { blk: 4 }, up: { blk: 5 }, text: 'Each turn: gain {blk} Block.', art: 'fern',
    flavor: 'Stays green. Stays cool.',
    plant: { grow: null, onGrow: (api, v) => { api.gainBlock(v.blk); } },
  },
  {
    id: 'puffball', name: 'Puffball', type: 'plant', rarity: 'common', cost: 1, target: 'none',
    vals: { dmg: 10 }, up: { dmg: 14 }, text: 'Bloom: deal {dmg} damage to ALL enemies.', art: 'puffball-plant',
    plant: { grow: 2, onBloom: (api, v) => { api.attackAll(v.dmg); } },
  },
  {
    id: 'bramble_patch', name: 'Bramble Patch', type: 'plant', rarity: 'common', cost: 1, target: 'none',
    vals: { blk: 2, prickly: 3 }, up: { blk: 3, prickly: 4 }, text: 'Each turn: gain {blk} Block. Bloom: gain {prickly} Prickly.', art: 'bramble',
    plant: {
      grow: 3,
      onGrow: (api, v) => { api.gainBlock(v.blk); },
      onBloom: (api, v) => { api.apply(PLAYER, 'prickly', v.prickly); },
    },
  },
];
