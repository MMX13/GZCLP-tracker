// Act 2: Glowcap Caverns.
import { PLAYER, S } from '../engine/types';
import type { EnemyDef } from '../engine/types';
import { atk, blk, crossed, cyc, fx, summon } from './enemies-util';

export const ACT2_ENEMIES: EnemyDef[] = [
  {
    id: 'moth', name: 'Dusty Moth', act: 2, tier: 'normal', hp: [32, 37], art: 'moth',
    moves: {
      dust: atk('Wing Dust', 6, 1, (a) => a.apply(PLAYER, S.wilted, 2)),
      flutter: atk('Flutter Slam', 12),
    },
    ai: (c) => cyc(c, ['dust', 'dust', 'flutter']),
  },
  {
    id: 'cave_cricket', name: 'Cave Cricket', act: 2, tier: 'normal', hp: [35, 40], art: 'cave_cricket',
    moves: {
      brace: blk('Brace', 8),
      hop: atk('Big Hop', 14),
    },
    ai: (c) => cyc(c, ['brace', 'hop']),
  },
  {
    id: 'slime_mold', name: 'Slime Mold', act: 2, tier: 'normal', hp: [40, 45], art: 'slime_mold',
    passiveText: 'When killed, splits into 2 Slimelets.',
    hooks: {
      onEnemyDeath: (api, _n, enemy) => {
        if (enemy !== api.self) return;
        summon(api, 'slimelet', 2);
      },
    },
    moves: {
      smother: atk('Smother', 8, 1, (a) => a.apply(PLAYER, S.soggy, 2)),
      glob: atk('Glob', 10),
      ooze: blk('Ooze', 7),
    },
    ai: (c) => cyc(c, ['smother', 'glob', 'ooze']),
  },
  {
    id: 'glow_worm', name: 'Glow Worm', act: 2, tier: 'normal', hp: [29, 32], art: 'glow_worm',
    passiveText: 'Its glow gives every enemy +1 Might.',
    moves: {
      glow: fx('Glow', ['buff'], (a) => a.enemies().forEach((e) => a.apply(e.uid, S.might, 1))),
      bite: atk('Nibble', 5),
    },
    ai: (c) => cyc(c, ['glow', 'bite', 'bite']),
  },
  {
    id: 'bat', name: 'Pipistrelle', act: 2, tier: 'normal', hp: [34, 37], art: 'bat',
    passiveText: 'Drain heals it for the HP it takes from you.',
    moves: {
      flurry: atk('Flurry', 3, 3),
      drain: {
        name: 'Drain', intents: ['attack', 'buff'], dmg: 6, hits: 1,
        run: (a, s) => { const d = a.attack(PLAYER, 6); if (d > 0) a.heal(s.uid, d); },
      },
    },
    ai: (c) => cyc(c, ['flurry', 'drain', 'flurry']),
  },
  {
    id: 'centipede', name: 'Centipede', act: 2, tier: 'normal', hp: [45, 50], art: 'centipede',
    onSpawn: (a, s) => a.apply(s.uid, S.prickly, 2),
    passiveText: 'Prickly 2: hitting it hurts you back for 2.',
    moves: {
      skitter: atk('Skitter', 3, 4),
      coil: { name: 'Coil', intents: ['block', 'buff'], run: (a, s) => { a.gainBlock(8, false); a.apply(s.uid, S.prickly, 1); } },
      sting: atk('Sting', 7, 1, (a) => a.apply(PLAYER, S.wilted, 1)),
    },
    ai: (c) => cyc(c, ['sting', 'skitter', 'coil']),
  },

  // ---- elites
  {
    id: 'spider', name: 'Webweaver', act: 2, tier: 'elite', hp: [128, 138], art: 'spider',
    passiveText: 'Webs make you Brittle and clog your deck with Burrs. Venom bite inflicts Rot.',
    moves: {
      web: fx('Spin Web', ['debuff'], (a) => { a.apply(PLAYER, S.brittle, 2); a.addCardToPlayer('burr', 'draw', 2); }),
      venom: atk('Venom Bite', 10, 1, (a) => a.apply(PLAYER, S.rot, 3)),
      pounce: atk('Pounce', 16),
    },
    ai: (c) => cyc(c, ['web', 'venom', 'pounce']),
  },
  {
    id: 'crystal_crab', name: 'Quartz Crab', act: 2, tier: 'elite', hp: [148, 158], art: 'crystal_crab', scale: 1.2,
    onSpawn: (a, s) => a.apply(s.uid, S.shelled, 5),
    passiveText: 'Shelled 5: gains 5 Block each turn. Pinches are slow, but heavy.',
    moves: {
      raise: blk('Raise Claws', 10, (a, s) => a.apply(s.uid, S.shelled, 2)),
      crush: atk('Crushing Pinch', 24),
      snip: atk('Snip', 10),
    },
    ai: (c) => cyc(c, ['raise', 'crush', 'snip']),
  },
  {
    id: 'echo_bat', name: 'Echo Bat', act: 2, tier: 'elite', hp: [124, 134], art: 'echo_bat',
    passiveText: 'Screech makes you Soggy and Wilted, then its echoes hit harder and harder.',
    moves: {
      screech: fx('Screech', ['debuff'], (a) => { a.apply(PLAYER, S.soggy, 2); a.apply(PLAYER, S.wilted, 1); }),
      echo1: atk('Echo', 5, 2),
      echo2: atk('Echo Echo', 7, 2),
      echo3: atk('Echo Echo Echo', 9, 2),
      echo4: atk('ECHO!', 12, 2),
    },
    ai: (c) => cyc(c, ['screech', 'echo1', 'echo2', 'echo3', 'echo4']),
  },

  // ---- bosses
  {
    id: 'mothmother', name: 'Mothmother', act: 2, tier: 'boss', hp: [250, 260], art: 'mothmother', scale: 1.5,
    passiveText: 'Calls Mothlings. At half HP she is drawn to the lamp: Growing 1 and a frenzy of wing-beats.',
    hooks: {
      onHpLoss: (api) => {
        const s = crossed(api, 'frenzy', 0.5);
        if (!s) return;
        api.say(s.uid, 'The LAMP! THE LAMP!');
        api.apply(s.uid, S.growing, 1);
      },
    },
    moves: {
      call: { name: 'Lullaby Call', intents: ['summon', 'block'], run: (a) => { a.gainBlock(10, false); summon(a, 'mothling', 2); } },
      storm: atk('Dust Storm', 8, 1, (a) => { a.apply(PLAYER, S.wilted, 2); a.apply(PLAYER, S.brittle, 2); }),
      swoop: atk('Swoop', 17),
      frenzy: atk('Lamp Frenzy', 6, 4),
    },
    ai: (c) => (c.self.mem.frenzy ? cyc(c, ['frenzy', 'storm', 'call', 'swoop']) : cyc(c, ['call', 'storm', 'swoop', 'storm'])),
  },
  {
    id: 'slime_colossus', name: 'Ooze Colossus', act: 2, tier: 'boss', hp: [320, 330], art: 'slime_colossus', scale: 1.6,
    passiveText: 'Absorbs Slimelets: each one gives it 8 Block and 1 Might. Kill them first! Enrages at half HP (+2 Might).',
    hooks: {
      onHpLoss: (api) => {
        const s = crossed(api, 'rage', 0.5);
        if (!s) return;
        api.say(s.uid, 'GLORP!');
        api.apply(s.uid, S.might, 2);
      },
    },
    moves: {
      spawn: fx('Ooze Out', ['summon'], (a) => summon(a, 'slimelet', 2)),
      slam: atk('Colossal Slam', 16),
      absorb: {
        name: 'Absorb', intents: ['block', 'buff'],
        run: (a, s) => {
          for (const e of a.enemies()) {
            if (e.id !== 'slimelet') continue;
            a.loseHp(e.uid, 999);
            a.giveBlock(s.uid, 8);
            a.apply(s.uid, S.might, 1);
          }
        },
      },
      wobble: atk('Wobble', 10, 1, (a) => a.apply(PLAYER, S.soggy, 2)),
    },
    ai: (c) => cyc(c, ['spawn', 'slam', 'absorb', 'wobble']),
  },

  // ---- minions
  {
    id: 'slimelet', name: 'Slimelet', act: 2, tier: 'minion', hp: [6, 8], art: 'slimelet',
    moves: { dribble: atk('Dribble', 3), splat: atk('Splat', 5) },
    ai: (c) => cyc(c, ['dribble', 'splat']),
  },
  {
    id: 'mothling', name: 'Mothling', act: 2, tier: 'minion', hp: [12, 14], art: 'mothling',
    moves: {
      flutter: atk('Flutter', 5),
      dust: atk('Dust Puff', 3, 1, (a) => a.apply(PLAYER, S.wilted, 1)),
    },
    ai: (c) => cyc(c, ['flutter', 'dust']),
  },
];
