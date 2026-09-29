// Keepsakes. Per-combat counters live in api.mem (keys prefixed with the relic id).
import { PLAYER, type RelicDef } from '../engine/types';

export const RELIC_LIST: RelicDef[] = [
  // ---------------- starter
  {
    id: 'lucky_acorn', name: 'Lucky Acorn', rarity: 'starter', icon: 'acorn',
    desc: 'At the end of combat, heal 5 HP.', flavor: 'Found on day one. Never let go.',
    onCombatEnd: (api) => { api.heal(PLAYER, 5); },
  },

  // ---------------- common (9)
  {
    id: 'dewdrop_vial', name: 'Dewdrop Vial', rarity: 'common', icon: 'dew-drop',
    desc: 'On the first turn of each combat, gain 8 Block.',
    onTurnStart: (api) => { if (api.combat.turn === 1) api.gainBlock(8, false); },
  },
  {
    id: 'tiny_lantern', name: 'Tiny Lantern', rarity: 'common', icon: 'lantern',
    desc: 'On the first turn of each combat, gain 1 extra Spore.',
    onTurnStart: (api) => { if (api.combat.turn === 1) api.gainEnergy(1); },
  },
  {
    id: 'downy_feather', name: 'Downy Feather', rarity: 'common', icon: 'feather',
    desc: 'On the first turn of each combat, draw 2 extra cards.',
    onTurnStart: (api) => { if (api.combat.turn === 1) api.draw(2); },
  },
  {
    id: 'brass_button', name: 'Brass Button', rarity: 'common', icon: 'button',
    desc: 'Start each combat with 1 Sturdy.',
    onCombatStart: (api) => { api.apply(PLAYER, 'sturdy', 1); },
  },
  {
    id: 'pinecone', name: 'Pinecone', rarity: 'common', icon: 'pinecone',
    desc: 'Start each combat with 2 Prickly.',
    onCombatStart: (api) => { api.apply(PLAYER, 'prickly', 2); },
  },
  {
    id: 'honey_jar', name: 'Honey Jar', rarity: 'common', icon: 'honey',
    desc: 'Raise your max HP by 7.',
    onPickup: (run) => { run.maxHp += 7; run.hp += 7; },
  },
  {
    id: 'rotten_candle', name: 'Rotten Candle', rarity: 'common', icon: 'candle',
    desc: 'The first time you apply Rot each combat, apply 3 extra.',
    onApplyRot: (api, _n, target) => {
      if (api.mem.rotten_candle) return;
      api.mem.rotten_candle = 1;
      api.flashRelic('rotten_candle');
      api.apply(target, 'rot', 3);
    },
  },
  {
    id: 'thimble', name: 'Thimble', rarity: 'common', icon: 'thimble',
    desc: 'Every 3rd card you Compost each combat, gain 4 Block.',
    onCompost: (api) => {
      const c = (api.mem.thimble ?? 0) + 1;
      api.mem.thimble = c;
      if (c % 3 === 0) { api.flashRelic('thimble'); api.gainBlock(4, false); }
    },
  },
  {
    id: 'smooth_pebble', name: 'Smooth Pebble', rarity: 'common', icon: 'pebble',
    desc: 'The first Attack you play each turn grants 2 Block.',
    onCardPlayed: (api, _n, _c, def) => {
      if (def.type === 'attack' && api.combat.counters.attacksPlayedTurn <= 1) api.gainBlock(2, false);
    },
  },

  // ---------------- uncommon (8)
  {
    id: 'ticking_bell', name: 'Ticking Bell', rarity: 'uncommon', icon: 'bell',
    desc: 'Every 3rd turn, gain 1 extra Spore.',
    onTurnStart: (api) => { if (api.combat.turn % 3 === 0) { api.flashRelic('ticking_bell'); api.gainEnergy(1); } },
  },
  {
    id: 'mossy_bracer', name: 'Mossy Bracer', rarity: 'uncommon', icon: 'snail-shell',
    desc: 'Cards give 1 extra Block.',
    modifyBlock: (_n, base) => base + 1,
  },
  {
    id: 'hand_lens', name: 'Hand Lens', rarity: 'uncommon', icon: 'lens',
    desc: 'Your attacks deal 2 extra damage to enemies with Rot.',
    modifyAttack: (_n, base, api, target) => (api.status(target, 'rot') > 0 ? base + 2 : base),
  },
  {
    id: 'snail_shell', name: 'Snail Shell', rarity: 'uncommon', icon: 'snail-shell',
    desc: 'Start each combat with 3 Armored (Block carries over).',
    onCombatStart: (api) => { api.apply(PLAYER, 'armored', 3); },
  },
  {
    id: 'beetle_horn', name: 'Beetle Horn', rarity: 'uncommon', icon: 'beetle-horn',
    desc: 'Whenever an enemy dies, gain 1 Might.',
    onEnemyDeath: (api) => { api.flashRelic('beetle_horn'); api.apply(PLAYER, 'might', 1); },
  },
  {
    id: 'old_bone', name: 'Old Bone', rarity: 'uncommon', icon: 'bone',
    desc: 'The first card you Compost each turn gives 1 extra Nutrient.',
    onCompost: (api) => {
      if (api.mem.old_bone_turn === api.combat.turn) return;
      api.mem.old_bone_turn = api.combat.turn;
      api.flashRelic('old_bone');
      api.gainNutrients(1);
    },
  },
  {
    id: 'four_leaf_clover', name: 'Four-Leaf Clover', rarity: 'uncommon', icon: 'clover',
    desc: 'Whenever you plant a Plant, gain 3 Block.',
    onPlant: (api) => { api.flashRelic('four_leaf_clover'); api.gainBlock(3, false); },
  },
  {
    id: 'mossy_teacup', name: 'Mossy Teacup', rarity: 'uncommon', icon: 'teacup',
    desc: 'Resting at a Dewdrop Glade heals 15% more.',
    passive: { restHealBonus: 15 },
  },

  // ---------------- rare (6)
  {
    id: 'compass', name: 'Brass Compass', rarity: 'rare', icon: 'compass',
    desc: 'Card rewards offer 1 extra choice.',
    passive: { cardRewardChoices: 1 },
  },
  {
    id: 'moonpetal', name: 'Moonpetal', rarity: 'rare', icon: 'moon',
    desc: 'Whenever a Plant blooms, gain 1 Spore.',
    onBloom: (api) => { api.flashRelic('moonpetal'); api.gainEnergy(1); },
  },
  {
    id: 'spore_locket', name: 'Spore Locket', rarity: 'rare', icon: 'spore-heart',
    desc: 'At the start of each turn, add a Spore to your hand.',
    onTurnStart: (api) => { api.addCard('spore', 'hand', 1); },
  },
  {
    id: 'amber_fossil', name: 'Amber Fossil', rarity: 'rare', icon: 'honey',
    desc: 'Start each combat with 3 Nutrients.',
    onCombatStart: (api) => { api.gainNutrients(3); },
  },
  {
    id: 'sunstone', name: 'Sunstone', rarity: 'rare', icon: 'sun',
    desc: 'At the start of your turn, your Plants grow 1 extra.',
    onTurnStart: (api) => { if (api.plants().length) api.growPlants(1); },
  },
  {
    id: 'grave_blossom', name: 'Grave Blossom', rarity: 'rare', icon: 'flower',
    desc: 'Whenever an enemy dies, apply 4 Rot to ALL enemies.',
    onEnemyDeath: (api) => { api.flashRelic('grave_blossom'); api.applyAll('rot', 4); },
  },

  // ---------------- boss (4): big upside, real downside
  {
    id: 'cap_crown', name: 'Crown of Caps', rarity: 'boss', icon: 'crown',
    desc: 'Gain 1 extra Spore each turn. Start each combat with a Mold in your draw pile.',
    passive: { maxEnergy: 1 },
    onCombatStart: (api) => { api.addCardToPlayer('mold', 'draw', 1); },
  },
  {
    id: 'heart_of_the_grove', name: 'Heart of the Grove', rarity: 'boss', icon: 'spore-heart',
    desc: 'Gain 2 extra Garden plots. Lose 12 max HP.',
    passive: { gardenPlots: 2 },
    onPickup: (run) => { run.maxHp = Math.max(1, run.maxHp - 12); run.hp = Math.min(run.hp, run.maxHp); },
  },
  {
    id: 'ironbark_seed', name: 'Ironbark Seed', rarity: 'boss', icon: 'tree',
    desc: 'Start each combat with 4 Sturdy and 3 Prickly. You no longer heal at Rest.',
    passive: { noHealAtRest: true },
    onCombatStart: (api) => { api.apply(PLAYER, 'sturdy', 4); api.apply(PLAYER, 'prickly', 3); },
  },
  {
    id: 'nightcap', name: 'Nightcap', rarity: 'boss', icon: 'moon',
    desc: 'Draw 2 extra cards each turn. At end of turn, lose 2 HP.',
    passive: { handSize: 2 },
    onTurnEnd: (api) => { api.loseHp(PLAYER, 2); },
  },

  // ---------------- shop (3)
  {
    id: 'coin_purse', name: 'Haggler\'s Purse', rarity: 'shop', icon: 'coin-pouch',
    desc: 'Shop prices are 20% lower.', passive: { shopDiscount: 0.2 },
  },
  {
    id: 'traveling_satchel', name: 'Traveling Satchel', rarity: 'shop', icon: 'thimble',
    desc: 'Gain 1 extra Brew slot.', passive: { potionSlots: 1 },
  },
  {
    id: 'potted_sprout', name: 'Potted Sprout', rarity: 'shop', icon: 'stump',
    desc: 'Gain 1 extra Garden plot.', passive: { gardenPlots: 1 },
  },

  // ---------------- event (2)
  {
    id: 'golden_spore', name: 'Golden Spore', rarity: 'event', icon: 'potion-gold',
    desc: 'Start each combat with 1 Might and 1 Sturdy.', flavor: 'Warm to the touch. Smells like victory.',
    onCombatStart: (api) => { api.apply(PLAYER, 'might', 1); api.apply(PLAYER, 'sturdy', 1); },
  },
  {
    id: 'old_map', name: 'Old Map', rarity: 'event', icon: 'map',
    desc: 'Shops are 15% cheaper. Resting heals 10% more.', flavor: 'Half the paths are just doodles.',
    passive: { shopDiscount: 0.15, restHealBonus: 10 },
  },
];
