// CORE statuses (DESIGN section 5). The engine reads Might / Sturdy / Prickly / Soggy / Wilted / Brittle / Rot / Armored
// natively (damage formulas, thorns, Rot tick, block reset); Regrow / Shelled / Growing are implemented by the hooks below.
import { S } from '../engine/types';
import type { StatusDef } from '../engine/types';

export const STATUS_LIST: StatusDef[] = [
  {
    id: S.might, name: 'Might', kind: 'buff', decay: 'none', icon: 'st-might',
    desc: (n) => `Attacks deal +${n} damage.`,
  },
  {
    id: S.sturdy, name: 'Sturdy', kind: 'buff', decay: 'none', icon: 'st-sturdy',
    desc: (n) => `Gain +${n} Block from cards.`,
  },
  {
    id: S.prickly, name: 'Prickly', kind: 'buff', decay: 'none', icon: 'st-prickly',
    desc: (n) => `When attacked, deal ${n} damage back.`,
  },
  {
    id: S.regrow, name: 'Regrow', kind: 'buff', decay: 'none', icon: 'st-regrow',
    desc: (n) => `At end of turn, heal ${n} HP, then Regrow drops by 1.`,
    onTurnEnd: (api, n) => {
      api.heal(api.self, n);
      api.apply(api.self, S.regrow, -1);
    },
  },
  {
    id: S.soggy, name: 'Soggy', kind: 'debuff', decay: 'turn', icon: 'st-soggy',
    desc: (n) => `Takes 50% more attack damage. Lasts ${n} more turn${n === 1 ? '' : 's'}.`,
  },
  {
    id: S.wilted, name: 'Wilted', kind: 'debuff', decay: 'turn', icon: 'st-wilted',
    desc: (n) => `Deals 25% less attack damage. Lasts ${n} more turn${n === 1 ? '' : 's'}.`,
  },
  {
    id: S.brittle, name: 'Brittle', kind: 'debuff', decay: 'turn', icon: 'st-brittle',
    desc: (n) => `Gains 25% less Block. Lasts ${n} more turn${n === 1 ? '' : 's'}.`,
  },
  {
    id: S.rot, name: 'Rot', kind: 'debuff', decay: 'none', icon: 'st-rot',
    desc: (n) => `At the start of its turn, lose ${n} HP (ignores Block), then Rot drops by 1.`,
  },
  {
    id: S.shelled, name: 'Shelled', kind: 'buff', decay: 'none', icon: 'st-shelled',
    desc: (n) => `At end of turn, gain ${n} Block.`,
    onTurnEnd: (api, n) => {
      api.gainBlock(n, false);
    },
  },
  {
    id: S.growing, name: 'Growing', kind: 'buff', decay: 'none', icon: 'st-growing',
    desc: (n) => `At end of turn, gain ${n} Might.`,
    onTurnEnd: (api, n) => {
      api.apply(api.self, S.might, n);
    },
  },
  {
    id: S.armored, name: 'Armored', kind: 'buff', decay: 'turn', icon: 'st-armored',
    desc: (n) => `Block is kept between turns for ${n} more turn${n === 1 ? '' : 's'}.`,
  },
];
