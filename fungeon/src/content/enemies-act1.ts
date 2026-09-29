// Act 1: Mossy Hollow.
import { PLAYER, S } from '../engine/types';
import type { EnemyDef } from '../engine/types';
import { atk, blk, crossed, cyc, fx, isFirstOfKind, summon } from './enemies-util';

export const ACT1_ENEMIES: EnemyDef[] = [
  {
    id: 'slug', name: 'Soggy Slug', act: 1, tier: 'normal', hp: [26, 30], art: 'slug',
    moves: {
      spit: atk('Slime Spit', 5, 1, (a) => a.apply(PLAYER, S.soggy, 2)),
      bump: atk('Slug Bump', 8),
    },
    ai: (c) => cyc(c, ['spit', 'bump', 'bump']),
  },
  {
    id: 'gnat', name: 'Gnat', act: 1, tier: 'normal', hp: [8, 10], art: 'gnat',
    moves: {
      nibble: atk('Nibble', 2, 2),
      sting: atk('Sting', 4, 1, (a) => a.apply(PLAYER, S.wilted, 1)),
    },
    ai: (c) => cyc(c, ['nibble', 'sting', 'nibble']),
  },
  {
    id: 'bark_beetle', name: 'Bark Beetle', act: 1, tier: 'normal', hp: [34, 38], art: 'bark_beetle',
    moves: {
      scratch: atk('Scratch', 5),
      harden: blk('Bark Up', 12),
      ram: atk('Ram', 15),
    },
    ai: (c) => cyc(c, ['scratch', 'harden', 'ram']),
  },
  {
    id: 'snail', name: 'Shellby', act: 1, tier: 'normal', hp: [30, 34], art: 'snail',
    onSpawn: (a, s) => a.apply(s.uid, S.shelled, 2),
    passiveText: 'Shelled 2: gains 2 Block at the end of each of its turns.',
    moves: {
      bump: atk('Shell Bump', 7),
      hide: blk('Hide', 6),
    },
    ai: (c) => cyc(c, ['bump', 'hide', 'bump']),
  },
  {
    id: 'worker_ant', name: 'Worker Ant', act: 1, tier: 'normal', hp: [15, 18], art: 'worker_ant',
    passiveText: 'Ants work in pairs: the first one rallies the colony (+1 Might to allies), the other one bites.',
    moves: {
      rally: fx('Rally', ['buff'], (a) => a.enemies().forEach((e) => a.apply(e.uid, S.might, 1))),
      bite: atk('Bite', 5),
      lunge: atk('Lunge', 8),
    },
    ai: (c) => (isFirstOfKind(c) ? cyc(c, ['rally', 'bite', 'bite']) : cyc(c, ['bite', 'bite', 'lunge'])),
  },
  {
    id: 'toadlet', name: 'Toadlet', act: 1, tier: 'normal', hp: [20, 23], art: 'toadlet',
    moves: {
      hop: atk('Hop', 7),
      lash: atk('Tongue Lash', 5, 1, (a) => a.addCardToPlayer('slime', 'discard', 1)),
    },
    ai: (c) => cyc(c, ['hop', 'lash', 'hop']),
  },

  // ---- elites
  {
    id: 'stag_beetle', name: 'Sir Stagsworth', act: 1, tier: 'elite', hp: [84, 90], art: 'stag_beetle',
    passiveText: 'Armored: keeps its Block between turns. Polishes up (+1 Might), lowers its antlers, then CHARGES.',
    moves: {
      polish: {
        name: 'Polish Armor', intents: ['block', 'buff'],
        run: (a, s) => { a.gainBlock(10, false); a.apply(s.uid, S.might, 1); a.setStatus(s.uid, S.armored, 2); },
      },
      charge: blk('Lower Antlers', 8),
      lance: atk('Antler Charge', 23),
      bash: atk('Shield Bash', 9),
    },
    ai: (c) => cyc(c, ['polish', 'charge', 'lance', 'bash']),
  },
  {
    id: 'mole', name: 'Mole Miner', act: 1, tier: 'elite', hp: [74, 80], art: 'mole',
    onSpawn: (a, s) => a.apply(s.uid, S.growing, 1),
    passiveText: 'Growing 1: gains +1 Might every turn. Digs up Burrs. Burrowing grants Armored.',
    moves: {
      claw: atk('Claw', 8),
      dig: atk('Dig Up', 4, 1, (a) => a.addCardToPlayer('burr', 'draw', 2)),
      burrow: {
        name: 'Burrow', intents: ['block', 'buff'],
        run: (a, s) => { a.gainBlock(10, false); a.setStatus(s.uid, S.armored, 2); },
      },
      maul: atk('Maul', 12),
    },
    ai: (c) => cyc(c, ['claw', 'dig', 'burrow', 'maul']),
  },
  {
    id: 'soldier_ant', name: 'Soldier Ant', act: 1, tier: 'elite', hp: [60, 64], art: 'soldier_ant',
    passiveText: 'Leads the colony: barks orders (+1 Might to allies). Fights alongside 2 Worker Ants.',
    moves: {
      command: {
        name: 'Battle Orders', intents: ['block', 'buff'],
        run: (a) => { a.enemies().forEach((e) => a.apply(e.uid, S.might, 1)); a.gainBlock(6, false); },
      },
      stab: atk('Mandible Stab', 10),
      charge: atk('Charge', 6, 2),
    },
    ai: (c) => cyc(c, ['command', 'stab', 'charge']),
  },

  // ---- bosses
  {
    id: 'gloopius', name: 'Grand Slug Gloopius', act: 1, tier: 'boss', hp: [140, 150], art: 'gloopius', scale: 1.5,
    passiveText: 'At half HP it splits off 2 small Soggy Slugs (losing 20% of its remaining HP), then flails wildly. Slime Wave only makes you Soggy every other time.',
    hooks: {
      onHpLoss: (api) => {
        const s = crossed(api, 'split', 0.5);
        if (!s) return;
        api.say(s.uid, 'Splish-split!');
        s.hp = Math.max(1, Math.ceil(s.hp * 0.8));
        for (let i = 0; i < 2; i++) {
          if (api.enemies().length >= 5) break;
          const slug = api.spawnEnemy('slug', 'right');
          if (slug) { slug.hp = 16; slug.maxHp = 16; }
        }
      },
    },
    moves: {
      wave: atk('Slime Wave', 7, 1, (a, s) => { if (s.history.filter((h) => h === 'wave').length % 2 === 1) a.apply(PLAYER, S.soggy, 2); }),
      glop: atk('Great Glop', 13),
      ooze: blk('Ooze Up', 12),
      flail: atk('Flail', 7, 2),
    },
    ai: (c) => (c.self.mem.split ? cyc(c, ['flail', 'wave', 'glop']) : cyc(c, ['wave', 'glop', 'ooze'])),
  },
  {
    id: 'toad_king', name: 'Old King Warts', act: 1, tier: 'boss', hp: [175, 185], art: 'toad_king', scale: 1.5,
    passiveText: 'At half HP he calls his royal guard: 2 Toadlets. His tongue grabs at your deck and stuffs it with Slime.',
    hooks: {
      onHpLoss: (api) => {
        const s = crossed(api, 'court', 0.5);
        if (!s) return;
        api.say(s.uid, 'To me, my subjects!');
        summon(api, 'toadlet', 2);
      },
    },
    moves: {
      swat: atk('Royal Swat', 9),
      tongue: atk('Tongue Grab', 7, 1, (a) => a.addCardToPlayer('slime', 'discard', 2)),
      gather: {
        name: 'Gather Weight', intents: ['block', 'buff'],
        run: (a, s) => { a.gainBlock(8, false); a.apply(s.uid, S.might, 1); },
      },
      flop: atk('Belly Flop', 21),
    },
    ai: (c) => cyc(c, ['swat', 'tongue', 'gather', 'flop']),
  },
];
