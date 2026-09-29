// Plays one full run with the bot and returns a compact record for aggregation.
import { act, newRun, engineLog } from '../engine/index';
import type { GameEvent, RunState } from '../engine/types';
import { Bot, type BotOptions, type PickMode } from './bot';
import { findEnemy, getCard } from '../engine/registry';

export interface FightRec {
  enc: string;
  kind: string;
  act: number;
  hpLost: number;
  turns: number;
  won: boolean;
}
export interface RunRec {
  seed: string;
  tag?: string;
  result: 'victory' | 'defeat' | 'stuck';
  act: number;
  floor: number;
  cause: string;
  fights: FightRec[];
  offered: string[][];
  picked: string[];
  bought: string[];
  deck: string[];
  relics: string[];
  gold: number;
  hp: number;
  maxHp: number;
  potionsUsed: number;
  steps: number;
  ms: number;
  errors: string[];
}

export interface PlayOpts {
  blight: number;
  picks: PickMode;
  beam?: number;
  depth?: number;
  verbose?: boolean;
  maxSteps?: number;
  /** extra cards added to the starting deck (used by --card-test) */
  extra?: string[];
}

function describe(run: RunState): string {
  if (run.screen.kind !== 'combat') return run.screen.kind;
  const c = run.screen.combat;
  const en = c.enemies.filter((e) => e.alive).map((e) => `${e.id}:${e.hp}${e.block ? '+' + e.block + 'b' : ''}${Object.keys(e.statuses).length ? JSON.stringify(e.statuses) : ''}[${e.intent}]`).join(' ');
  return `T${c.turn} hp ${c.player.hp}/${c.player.maxHp} blk ${c.player.block} en ${c.player.energy} nut ${c.player.nutrients} ${JSON.stringify(c.player.statuses)} | ${en} | garden ${c.garden.map((g) => (g ? g.card.id + g.growth : '-')).join(',')}`;
}

export function playRun(seed: string, o: PlayOpts): RunRec {
  const t0 = Date.now();
  const botOpts: BotOptions = { picks: o.picks, beam: o.beam ?? 4, depth: o.depth ?? 8, seed: seed.split('').reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) };
  const bot = new Bot(botOpts);
  let run = newRun({ seed, ascension: o.blight, now: 0 });
  for (const id of o.extra ?? []) run.deck.push({ uid: run.nextUid++, id, upgraded: false });
  const rec: RunRec = { seed, result: 'stuck', act: 1, floor: 0, cause: '', fights: [], offered: [], picked: [], bought: [], deck: [], relics: [], gold: 0, hp: 0, maxHp: 0, potionsUsed: 0, steps: 0, ms: 0, errors: [] };
  let events: GameEvent[] = [];
  let fightStart: { enc: string; kind: string; act: number; dmg: number } | null = null;
  let lastCombatTurn = 1;
  let lastEnc = '';
  const log = (s: string) => o.verbose && console.log(s);
  const errBefore = engineLog.errors.length;
  for (let i = 0; i < (o.maxSteps ?? 8000); i++) {
    const a = bot.next(run, events);
    if (!a) break;
    const prev = run;
    // bookkeeping that needs the pre-state
    if (a.type === 'takeReward' && prev.screen.kind === 'reward') {
      const r = prev.screen.rewards[a.index];
      if (r?.kind === 'card' && a.cardIndex !== undefined) rec.picked.push(r.options[a.cardIndex].id);
    }
    if (a.type === 'shopBuy' && prev.screen.kind === 'shop' && a.kind === 'card') rec.bought.push(prev.screen.shop.cards[a.index].card.id);
    if (a.type === 'usePotion') rec.potionsUsed++;
    if (prev.screen.kind === 'reward') {
      for (const r of prev.screen.rewards) if (r.kind === 'card' && !r.taken && !rec.offered.some((x) => x === (r as never))) { /* recorded below */ }
    }
    const res = act(run, a);
    rec.steps++;
    if (res.error) {
      log(`  !! rejected ${JSON.stringify(a)}: ${res.error}`);
      // avoid infinite loops on a rejected bot action
      bot.plan = [];
      events = [];
      if (++rec.errors.length > 30) break;
      // fall back to something that always progresses
      const fb = fallback(run);
      if (!fb) break;
      const r2 = act(run, fb);
      if (r2.error) break;
      run = r2.run;
      events = r2.events;
      continue;
    }
    run = res.run;
    events = res.events;
    if (o.verbose) {
      if (a.type === 'playCard' && prev.screen.kind === 'combat') {
        const card = prev.screen.combat.hand.find((c) => c.uid === a.uid)!;
        log(`  play ${getCard(card.id).name}${card.upgraded ? '+' : ''}${a.target ? ' -> ' + a.target : ''}`);
      } else if (a.type === 'endTurn') log(`END TURN -> ${describe(run)}`);
      else if (a.type !== 'playCard') log(`${a.type} ${JSON.stringify(a)} -> ${run.screen.kind}`);
    }
    // reward offers
    if (prev.screen.kind !== 'reward' && run.screen.kind === 'reward') {
      for (const r of run.screen.rewards) if (r.kind === 'card') rec.offered.push(r.options.map((x) => x.id));
    }
    // fight bookkeeping
    if (prev.screen.kind !== 'combat' && run.screen.kind === 'combat') {
      fightStart = { enc: run.screen.combat.encounterId, kind: run.screen.combat.kind, act: run.act, dmg: prev.stats.damageTaken };
      lastEnc = fightStart.enc;
      log(`=== FIGHT ${fightStart.enc} (${fightStart.kind}) act ${run.act} floor ${run.floor}: ${describe(run)}`);
    }
    if (prev.screen.kind === 'combat') lastCombatTurn = prev.screen.combat.turn;
    if (run.screen.kind === 'combat' && run.screen.combat.turn > 100) break; // stalled fight (counted as 'stuck')
    if (prev.screen.kind === 'combat' && run.screen.kind !== 'combat' && fightStart) {
      rec.fights.push({ enc: fightStart.enc, kind: fightStart.kind, act: fightStart.act, hpLost: run.stats.damageTaken - fightStart.dmg, turns: lastCombatTurn, won: run.screen.kind !== 'defeat' });
      log(`=== END ${fightStart.enc}: ${run.screen.kind}, hp ${run.hp}/${run.maxHp}, lost ${run.stats.damageTaken - fightStart.dmg} in ${lastCombatTurn} turns`);
      fightStart = null;
    }
    if (run.screen.kind === 'victory' || run.screen.kind === 'defeat') break;
  }
  rec.result = run.screen.kind === 'victory' ? 'victory' : run.screen.kind === 'defeat' ? 'defeat' : 'stuck';
  rec.act = run.act;
  rec.floor = run.floor;
  if (run.screen.kind === 'defeat') rec.cause = lastEnc && rec.fights.length && !rec.fights[rec.fights.length - 1].won ? lastEnc : 'event:' + run.screen.cause;
  rec.deck = run.deck.map((c) => c.id + (c.upgraded ? '+' : ''));
  rec.relics = run.relics.map((r) => r.id);
  rec.gold = run.gold;
  rec.hp = run.hp;
  rec.maxHp = run.maxHp;
  rec.errors = engineLog.errors.slice(errBefore).map((e) => e.split('\n')[0]);
  rec.ms = Date.now() - t0;
  void findEnemy;
  return rec;
}

/** Always-legal-ish action used only when the bot's own choice is rejected. */
function fallback(run: RunState) {
  switch (run.screen.kind) {
    case 'combat': return run.screen.combat.pending ? { type: 'choose' as const, uids: run.screen.combat.pending.candidates.slice(0, run.screen.combat.pending.min) } : { type: 'endTurn' as const };
    case 'reward': return { type: 'leaveRewards' as const };
    case 'shop': case 'rest': case 'treasure': return { type: 'proceed' as const };
    case 'bossRelic': return { type: 'pickBossRelic' as const, id: null };
    case 'event': return { type: 'eventChoice' as const, index: run.screen.event.page ? 0 : 0 };
    case 'cardSelect': return { type: 'choose' as const, uids: run.screen.canSkip ? [] : run.screen.candidates.slice(0, run.screen.count) };
    default: return null;
  }
}
