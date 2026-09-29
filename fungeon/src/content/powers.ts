// Statuses created by Power cards. Stacks = magnitude of the effect.
import { PLAYER, type StatusDef } from '../engine/types';

export const POWER_STATUS_LIST: StatusDef[] = [
  {
    id: 'pw_fairy_ring', name: 'Fairy Ring', kind: 'buff', decay: 'none', icon: 'st-power',
    desc: (n) => `Whenever a plant blooms, apply ${n} Rot to ALL enemies.`,
    onBloom: (api, n) => { api.applyAll('rot', n); },
  },
  {
    id: 'pw_decomposer', name: 'Decomposer', kind: 'buff', decay: 'none', icon: 'st-power',
    desc: (n) => `Whenever a card is Composted, deal ${n} damage to a random enemy.`,
    onCompost: (api, n) => { const e = api.randomEnemy(); if (e) api.attack(e.uid, n); },
  },
  {
    id: 'pw_slow_simmer', name: 'Slow Simmer', kind: 'buff', decay: 'none', icon: 'st-power',
    desc: (n) => `At the start of your turn, apply ${n} Rot to ALL enemies.`,
    onTurnStart: (api, n) => { api.applyAll('rot', n); },
  },
  {
    id: 'pw_root_network', name: 'Root Network', kind: 'buff', decay: 'none', icon: 'st-power',
    desc: (n) => `At end of turn, gain ${n} Block for each Plant in your Garden.`,
    onTurnEnd: (api, n) => { const p = api.plants().length; if (p > 0) api.gainBlock(n * p); },
  },
  {
    id: 'pw_green_thumb', name: 'Green Thumb', kind: 'buff', decay: 'none', icon: 'st-power',
    desc: (n) => `At the start of your turn, your Plants grow ${n} extra.`,
    onTurnStart: (api, n) => { if (api.plants().length) api.growPlants(n); },
  },
  {
    id: 'pw_spore_heart', name: 'Spore Heart', kind: 'buff', decay: 'none', icon: 'st-power',
    desc: (n) => `At the start of your turn, add ${n} Spore${n === 1 ? '' : 's'} to your hand.`,
    onTurnStart: (api, n) => { api.addCard('spore', 'hand', n); },
  },
  {
    id: 'pw_growth_spurt', name: 'Growth Spurt', kind: 'buff', decay: 'none', icon: 'st-might',
    desc: (n) => `At the start of your turn, gain ${n} Might.`,
    onTurnStart: (api, n) => { api.apply(PLAYER, 'might', n); },
  },
  {
    id: 'pw_rot_wave', name: 'Rot Wave', kind: 'buff', decay: 'none', icon: 'st-rot',
    desc: (n) => `Whenever an enemy dies, apply ${n === 1 ? '' : n + 'x '}its Rot to ALL enemies.`,
    onEnemyDeath: (api, n, enemy) => {
      const r = api.enemy(enemy)?.statuses['rot'] ?? 0;
      if (r > 0) api.applyAll('rot', r * n);
    },
  },
  {
    id: 'pw_venom_cap', name: 'Venom Cap', kind: 'buff', decay: 'none', icon: 'st-rot',
    desc: (n) => `Whenever you are attacked, apply ${n} Rot to the attacker.`,
    onAttacked: (api, n, attacker) => { if (attacker !== PLAYER) api.apply(attacker, 'rot', n); },
  },
];
