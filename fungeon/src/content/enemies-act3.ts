// Act 3: The Blight.
import { PLAYER, S } from '../engine/types';
import type { EnemyDef } from '../engine/types';
import { atk, blk, crossed, cyc, fx, summon } from './enemies-util';

export const ACT3_ENEMIES: EnemyDef[] = [
  {
    id: 'mold_puff', name: 'Mold Puff', act: 3, tier: 'normal', hp: [44, 50], art: 'mold_puff',
    passiveText: 'When killed, it explodes: 5 damage to you and a Mold in your discard.',
    hooks: {
      onEnemyDeath: (api, _n, enemy) => {
        if (enemy !== api.self) return;
        api.attack(PLAYER, 5);
        api.addCardToPlayer('mold', 'discard', 1);
      },
    },
    moves: {
      puff: atk('Mold Puff', 8, 1, (a) => a.addCardToPlayer('mold', 'discard', 1)),
      bud: fx('Sporulate', ['summon'], (a) => summon(a, 'mold_bud', 1)),
      cough: atk('Spore Cough', 12),
    },
    ai: (c) => cyc(c, ['puff', 'bud', 'cough']),
  },
  {
    id: 'rot_rat', name: 'Rot Rat', act: 3, tier: 'normal', hp: [46, 52], art: 'rot_rat',
    moves: {
      plague: atk('Plague Bite', 9, 1, (a) => a.apply(PLAYER, S.rot, 2)),
      skitter: atk('Skitter', 5, 3),
    },
    ai: (c) => cyc(c, ['plague', 'skitter', 'skitter']),
  },
  {
    id: 'blighted_sprout', name: 'Blighted Sprout', act: 3, tier: 'normal', hp: [58, 66], art: 'blighted_sprout',
    onSpawn: (a, s) => a.apply(s.uid, S.growing, 1),
    passiveText: 'Growing 1: gains +1 Might every turn. Do not let it sit.',
    moves: {
      thrash: atk('Thrash', 8),
      lash: atk('Twig Lash', 5, 2),
    },
    ai: (c) => cyc(c, ['thrash', 'lash', 'thrash']),
  },
  {
    id: 'carrion_fly', name: 'Carrion Fly', act: 3, tier: 'normal', hp: [22, 26], art: 'carrion_fly',
    moves: {
      bite: atk('Rot Bite', 4, 1, (a) => a.apply(PLAYER, S.rot, 1)),
      buzz: atk('Buzz', 3, 2),
    },
    ai: (c) => cyc(c, ['bite', 'buzz', 'bite']),
  },
  {
    id: 'zombie_snail', name: 'Zombie Snail', act: 3, tier: 'normal', hp: [68, 74], art: 'zombie_snail',
    onSpawn: (a, s) => a.apply(s.uid, S.shelled, 3),
    passiveText: 'Shelled 3. Rises again once, at half HP, when first killed.',
    hooks: {
      onEnemyDeath: (api, _n, enemy) => {
        if (enemy !== api.self) return;
        const dead = api.enemy(enemy);
        if (!dead || dead.mem.revived) return;
        const s = api.spawnEnemy('zombie_snail', 'right');
        if (!s) return;
        s.mem.revived = 1;
        s.hp = Math.max(1, Math.floor(s.maxHp / 2));
        api.say(s.uid, 'Un-dead!');
      },
    },
    moves: {
      gnaw: atk('Gnaw', 12),
      hunker: blk('Hunker', 10),
      slime: atk('Rotten Slime', 7, 1, (a) => a.apply(PLAYER, S.soggy, 2)),
    },
    ai: (c) => cyc(c, ['gnaw', 'hunker', 'slime']),
  },
  {
    id: 'cultist_cap', name: 'Death Cap Cultist', act: 3, tier: 'normal', hp: [62, 68], art: 'cultist_cap',
    passiveText: 'Chants for +2 Might every third turn. The strikes get scarier.',
    moves: {
      chant: fx('Chant', ['buff'], (a, s) => a.apply(s.uid, S.might, 2)),
      strike: atk('Heavy Strike', 13),
    },
    ai: (c) => cyc(c, ['chant', 'strike', 'strike']),
  },

  // ---- elites
  {
    id: 'cordyceps_knight', name: 'Cordyceps Knight', act: 3, tier: 'elite', hp: [188, 198], art: 'cordyceps_knight', scale: 1.3,
    onSpawn: (a, s) => a.apply(s.uid, S.prickly, 3),
    passiveText: 'Prickly 3: hitting it hurts. Spore casting spawns Sporelings and adds Prickly.',
    moves: {
      cast: {
        name: 'Spore Cast', intents: ['summon', 'buff'],
        run: (a, s) => { summon(a, 'sporeling', 1); a.apply(s.uid, S.prickly, 1); },
      },
      lance: atk('Fungal Lance', 20),
      swipe: atk('Swipe', 11, 1, (a) => a.apply(PLAYER, S.wilted, 1)),
    },
    ai: (c) => cyc(c, ['cast', 'lance', 'swipe']),
  },
  {
    id: 'morel', name: 'Morel the Rival', act: 3, tier: 'elite', hp: [178, 188], art: 'morel', scale: 1.2,
    passiveText: 'Copies your tricks: Rot, Block and Plants (Regrow). Then chops.',
    moves: {
      mimic_rot: atk('Copycat Rot', 6, 1, (a) => a.apply(PLAYER, S.rot, 4)),
      mimic_block: blk('Copycat Guard', 14, (a, s) => a.apply(s.uid, S.might, 1)),
      mimic_plant: { name: 'Copycat Plant', intents: ['buff', 'block'], run: (a, s) => { a.gainBlock(6, false); a.apply(s.uid, S.regrow, 5); } },
      chop: atk('Forager Chop', 18),
    },
    ai: (c) => cyc(c, ['mimic_rot', 'mimic_block', 'chop', 'mimic_plant', 'chop']),
  },
  {
    id: 'mold_hydra', name: 'Mold Hydra', act: 3, tier: 'elite', hp: [92, 100], art: 'mold_hydra', scale: 1.4,
    passiveText: 'The middle head. Each fallen head makes it +2 Might. Roars give every head Regrow 5.',
    hooks: {
      onEnemyDeath: (api, _n, enemy) => {
        if (enemy === api.self) return;
        const dead = api.combat.enemies.find((e) => e.uid === enemy);
        if (!dead || dead.id !== 'hydra_head') return;
        api.say(api.self, 'Heads up!');
        api.apply(api.self, S.might, 2);
      },
    },
    moves: {
      spit: atk('Spit Mold', 7, 1, (a) => a.addCardToPlayer('mold', 'discard', 1)),
      bite: atk('Chomp', 14),
      roar: { name: 'Hydra Roar', intents: ['block', 'buff'], run: (a) => { a.gainBlock(10, false); a.enemies().forEach((e) => a.apply(e.uid, S.regrow, 5)); } },
    },
    ai: (c) => cyc(c, ['spit', 'roar', 'bite']),
  },

  // ---- bosses
  {
    id: 'amanita_queen', name: 'Queen Amanita', act: 3, tier: 'boss', hp: [395, 405], art: 'amanita_queen', scale: 1.6,
    passiveText: 'Phase 1: holds court (Sporelings). At half HP she Blooms: Growing 1, Block, and vicious barrages.',
    hooks: {
      onHpLoss: (api) => {
        const s = crossed(api, 'bloom', 0.5);
        if (!s) return;
        api.say(s.uid, 'Behold my BLOOM!');
        api.apply(s.uid, S.growing, 1);
        api.giveBlock(s.uid, 25);
      },
    },
    moves: {
      decree: { name: 'Royal Decree', intents: ['summon', 'block'], run: (a) => { a.gainBlock(12, false); summon(a, 'sporeling', 2); } },
      scepter: atk('Scepter Strike', 16),
      storm: atk('Spore Storm', 8, 1, (a) => { a.apply(PLAYER, S.wilted, 1); a.apply(PLAYER, S.rot, 2); }),
      crown: { name: 'Coronation', intents: ['buff', 'summon'], run: (a, s) => { a.apply(s.uid, S.might, 2); summon(a, 'sporeling', 1); } },
      barrage: atk('Bloom Barrage', 9, 3),
      kiss: atk('Poison Kiss', 26),
    },
    ai: (c) => (c.self.mem.bloom ? cyc(c, ['crown', 'barrage', 'kiss', 'storm']) : cyc(c, ['decree', 'scepter', 'storm', 'scepter'])),
  },
  {
    id: 'blight_heart', name: 'The Blight Heart', act: 3, tier: 'boss', hp: [425, 435], art: 'blight_heart', scale: 1.7,
    onSpawn: (a, s) => a.apply(s.uid, S.shelled, 3),
    passiveText: 'Shelled 3. Every third turn: a Rot Wave (gathering shows as a buff). At half HP it spawns Mold Buds and its waves double down.',
    hooks: {
      onHpLoss: (api) => {
        const s = crossed(api, 'corrupt', 0.5);
        if (!s) return;
        api.say(s.uid, 'THUMP-THUMP');
        api.apply(s.uid, S.growing, 1);
      },
    },
    moves: {
      pulse: atk('Pulse', 11, 1, (a) => a.addCardToPlayer('mold', 'discard', 1)),
      gather: { name: 'Gather Blight', intents: ['block', 'buff'], run: (a, s) => { a.gainBlock(15, false); a.apply(s.uid, S.might, 1); } },
      wave: atk('Rot Wave', 8, 1, (a) => a.apply(PLAYER, S.rot, 5)),
      pulse2: atk('Hard Pulse', 15, 1, (a) => a.addCardToPlayer('mold', 'discard', 1)),
      gather2: { name: 'Spawn Buds', intents: ['summon', 'block'], run: (a) => { a.gainBlock(15, false); summon(a, 'mold_bud', 2); } },
      wave2: atk('Rot Tsunami', 10, 1, (a) => a.apply(PLAYER, S.rot, 7)),
    },
    ai: (c) => (c.self.mem.corrupt ? cyc(c, ['pulse2', 'gather2', 'wave2']) : cyc(c, ['pulse', 'gather', 'wave'])),
  },

  // ---- minions
  {
    id: 'sporeling', name: 'Sporeling', act: 3, tier: 'minion', hp: [10, 12], art: 'sporeling',
    moves: {
      puff: atk('Spore Puff', 5),
      fume: atk('Fume', 3, 1, (a) => a.apply(PLAYER, S.wilted, 1)),
    },
    ai: (c) => cyc(c, ['puff', 'fume']),
  },
  {
    id: 'hydra_head', name: 'Hydra Head', act: 3, tier: 'minion', hp: [50, 56], art: 'hydra_head',
    onSpawn: (a, s) => a.apply(s.uid, S.regrow, 2),
    passiveText: 'Regrows. Part of the Mold Hydra.',
    moves: {
      snap: atk('Snap', 9),
      spit: atk('Spit', 5, 1, (a) => a.addCardToPlayer('mold', 'discard', 1)),
    },
    ai: (c) => cyc(c, ['snap', 'spit', 'snap']),
  },
  {
    id: 'mold_bud', name: 'Mold Bud', act: 3, tier: 'minion', hp: [8, 10], art: 'mold_bud',
    moves: {
      nibble: atk('Nibble', 4),
      fester: atk('Fester', 3, 1, (a) => a.apply(PLAYER, S.rot, 1)),
    },
    ai: (c) => cyc(c, ['nibble', 'fester']),
  },
];
