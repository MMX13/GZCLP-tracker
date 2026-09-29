// Starter cards, tokens, status cards and curses.
import { PLAYER, type CardDef } from '../engine/types';

export const BASE_CARDS: CardDef[] = [
  {
    id: 'bonk', name: 'Bonk', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy',
    vals: { dmg: 6 }, up: { dmg: 9 }, text: 'Deal {dmg} damage.', art: 'bonk',
    play: (api, v, t) => { api.attack(t!, v.dmg); },
  },
  {
    id: 'cap_up', name: 'Cap Up', type: 'skill', rarity: 'starter', cost: 1, target: 'none',
    vals: { blk: 5 }, up: { blk: 8 }, text: 'Gain {blk} Block.', art: 'cap-shield',
    play: (api, v) => { api.gainBlock(v.blk); },
  },
  {
    id: 'spore_puff', name: 'Spore Puff', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy',
    vals: { dmg: 3, rot: 3 }, up: { dmg: 4, rot: 4 }, text: 'Deal {dmg} damage. Apply {rot} Rot.', art: 'spore-burst',
    play: (api, v, t) => { api.attack(t!, v.dmg); api.apply(t!, 'rot', v.rot); },
  },
  {
    id: 'seedling', name: 'Seedling', type: 'plant', rarity: 'starter', cost: 1, target: 'none',
    vals: { blk: 3, draw: 2 }, up: { blk: 4, draw: 3 },
    text: 'Each turn: gain {blk} Block. Bloom: draw {draw} cards.', art: 'seedling',
    flavor: 'Everyone starts somewhere small.',
    plant: {
      grow: 3,
      onGrow: (api, v) => { api.gainBlock(v.blk); },
      onBloom: (api, v) => { api.draw(v.draw); },
    },
  },

  // ---- token
  {
    id: 'spore', name: 'Spore', type: 'attack', rarity: 'token', cost: 0, target: 'enemy',
    vals: { dmg: 3, rot: 1 }, up: { dmg: 4, rot: 2 }, text: 'Deal {dmg} damage. Apply {rot} Rot.',
    keywords: ['compost'], art: 'spore-cloud',
    play: (api, v, t) => { api.attack(t!, v.dmg); api.apply(t!, 'rot', v.rot); },
  },

  // ---- status cards (added by enemies)
  {
    id: 'mold', name: 'Mold', type: 'status', rarity: 'special', cost: -1, target: 'none', vals: { hp: 2 },
    text: 'At end of turn, if in hand, lose {hp} HP.', keywords: ['unplayable'], art: 'mold',
    onEndTurnInHand: (api, v) => { api.loseHp(PLAYER, v.hp); },
  },
  {
    id: 'slime', name: 'Slime', type: 'status', rarity: 'special', cost: 1, target: 'none', vals: {},
    text: 'Does nothing. Gross.', keywords: ['compost'], art: 'slime',
    play: () => {},
  },
  {
    id: 'burr', name: 'Burr', type: 'status', rarity: 'special', cost: -1, target: 'none', vals: {},
    text: 'It sticks to everything.', keywords: ['unplayable', 'fleeting'], art: 'burr',
  },

  // ---- curses
  {
    id: 'mildew', name: 'Mildew', type: 'curse', rarity: 'special', cost: -1, target: 'none', vals: {},
    text: 'A damp, clingy smell.', keywords: ['unplayable'], art: 'mildew',
  },
  {
    id: 'doubt', name: 'Doubt', type: 'curse', rarity: 'special', cost: -1, target: 'none', vals: { wilt: 1 },
    text: 'At end of turn, if in hand, gain {wilt} Wilted.', keywords: ['unplayable'], art: 'doubt',
    onEndTurnInHand: (api, v) => { api.apply(PLAYER, 'wilted', v.wilt); },
  },
];
