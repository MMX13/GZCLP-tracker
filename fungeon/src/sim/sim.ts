// Balance simulator. Usage: npm run sim -- [--runs 200] [--blight 0] [--seed-prefix SIM] [--picks rated|random|none]
//   [--compare] [--verbose] [--jobs N] [--beam 4] [--depth 8] [--json /path.json]
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { engineLog } from '../engine/index';
import { playRun, type RunRec } from './play';
import { getCard } from '../engine/registry';
import type { PickMode } from './bot';
import { findEnemy } from '../engine/registry';
import { allCards } from '../engine/registry';

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? process.argv[i + 1] : def;
}
const flag = (name: string) => process.argv.includes('--' + name);

const runs = Number(arg('runs', '200'));
const blight = Number(arg('blight', '0'));
const prefix = arg('seed-prefix', 'SIM')!;
const picks = arg('picks', 'rated') as PickMode;
const beam = Number(arg('beam', '4'));
const depth = Number(arg('depth', '8'));
const jobs = Number(arg('jobs', String(Math.max(1, os.cpus().length))));
const jsonPath = arg('json', '/tmp/claude-0/sim-report.json')!;

// ---------------------------------------------------------------------------------------------------------------
// child mode: play a share of the seeds, stream records as JSON lines
const cardTestIds = (): string[] => allCards().filter((c) => (c.rarity === 'common' || c.rarity === 'uncommon' || c.rarity === 'rare') && c.type !== 'status' && c.type !== 'curse').map((c) => c.id);
if (flag('child') && flag('cardtest')) {
  const k = Number(arg('k'));
  const n = Number(arg('n'));
  const per = Number(arg('per', '30'));
  const copies = Number(arg('copies', '2'));
  engineLog.quiet = true;
  const ids = cardTestIds();
  const tasks: { id: string; i: number }[] = [];
  for (const id of ['(baseline)', ...ids]) for (let i = 0; i < per; i++) tasks.push({ id, i });
  for (let t = k; t < tasks.length; t += n) {
    const { id, i } = tasks[t];
    const rec = playRun(`${prefix}${i}`, { blight, picks: 'none', beam, depth, extra: id === '(baseline)' ? [] : Array(copies).fill(id) });
    rec.tag = id;
    process.stdout.write(JSON.stringify(rec) + '\n');
  }
  process.exit(0);
}
if (flag('child')) {
  const k = Number(arg('k'));
  const n = Number(arg('n'));
  engineLog.quiet = true;
  for (let i = k; i < runs; i += n) {
    const rec = playRun(`${prefix}${i}`, { blight, picks, beam, depth });
    process.stdout.write(JSON.stringify(rec) + '\n');
  }
  process.exit(0);
}

// ---------------------------------------------------------------------------------------------------------------
async function runBatch(pk: PickMode, count: number): Promise<RunRec[]> {
  const self = fileURLToPath(import.meta.url);
  const recs: RunRec[] = [];
  const n = Math.min(jobs, count);
  let done = 0;
  await Promise.all(
    Array.from({ length: n }, (_, k) =>
      new Promise<void>((resolve, reject) => {
        const args = [...process.execArgv, self, '--child', '--k', String(k), '--n', String(n), '--runs', String(count), '--blight', String(blight), '--seed-prefix', prefix, '--picks', pk, '--beam', String(beam), '--depth', String(depth)];
        const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'inherit'] });
        let buf = '';
        child.stdout.on('data', (d) => {
          buf += d.toString();
          let i;
          while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i);
            buf = buf.slice(i + 1);
            if (line.trim()) {
              recs.push(JSON.parse(line));
              done++;
              if (done % 10 === 0) process.stderr.write(`  [${pk}] ${done}/${count}\r`);
            }
          }
        });
        child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('child exited ' + code))));
      }),
    ),
  );
  process.stderr.write('\n');
  return recs.sort((a, b) => a.seed.localeCompare(b.seed, undefined, { numeric: true }));
}

const pct = (x: number) => (100 * x).toFixed(1) + '%';
const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

function analyse(recs: RunRec[]) {
  const wins = recs.filter((r) => r.result === 'victory');
  const winRate = wins.length / recs.length;
  // deaths
  const deathsByAct: Record<string, number> = {};
  const deathsByEnc: Record<string, number> = {};
  for (const r of recs) {
    if (r.result === 'victory') continue;
    const key = `act${r.act} floor${String(r.floor).padStart(2)}`;
    deathsByAct[key] = (deathsByAct[key] ?? 0) + 1;
    deathsByEnc[r.cause || r.result] = (deathsByEnc[r.cause || r.result] ?? 0) + 1;
  }
  // fights
  const enc: Record<string, { kind: string; act: number; n: number; lost: number[]; turns: number[]; deaths: number }> = {};
  for (const r of recs)
    for (const f of r.fights) {
      const e = (enc[f.enc] ??= { kind: f.kind, act: f.act, n: 0, lost: [], turns: [], deaths: 0 });
      e.n++;
      e.lost.push(f.hpLost);
      e.turns.push(f.turns);
      if (!f.won) e.deaths++;
    }
  // cards
  const cards: Record<string, { offered: number; picked: number; bought: number; inDeck: number; wins: number; avgCopies: number }> = {};
  const c = (id: string) => (cards[id] ??= { offered: 0, picked: 0, bought: 0, inDeck: 0, wins: 0, avgCopies: 0 });
  for (const r of recs) {
    for (const o of r.offered) for (const id of o) c(id).offered++;
    for (const id of r.picked) c(id).picked++;
    for (const id of r.bought) c(id).bought++;
    const ids = new Set(r.deck.map((d) => d.replace('+', '')));
    for (const id of ids) {
      const x = c(id);
      x.inDeck++;
      if (r.result === 'victory') x.wins++;
    }
  }
  const relics: Record<string, { n: number; wins: number }> = {};
  for (const r of recs)
    for (const id of new Set(r.relics)) {
      const x = (relics[id] ??= { n: 0, wins: 0 });
      x.n++;
      if (r.result === 'victory') x.wins++;
    }
  const errs: Record<string, number> = {};
  for (const r of recs) for (const e of r.errors) errs[e] = (errs[e] ?? 0) + 1;
  return {
    runs: recs.length, wins: wins.length, winRate,
    stuck: recs.filter((r) => r.result === 'stuck').length,
    deathsByAct, deathsByEnc, enc, cards, relics, errs,
    avgDeck: avg(recs.map((r) => r.deck.length)),
    avgGold: avg(recs.map((r) => r.gold)),
    avgFloors: avg(recs.map((r) => (r.act - 1) * 11 + r.floor)),
    avgMs: avg(recs.map((r) => r.ms)),
    potionsUsed: avg(recs.map((r) => r.potionsUsed)),
  };
}

function printReport(title: string, recs: RunRec[], a: ReturnType<typeof analyse>): void {
  const L = console.log;
  L(`\n==================== ${title} ====================`);
  L(`runs ${a.runs}  wins ${a.wins}  WIN RATE ${pct(a.winRate)}  stuck ${a.stuck}  avg progress ${a.avgFloors.toFixed(1)} floors  avg run time ${(a.avgMs / 1000).toFixed(1)}s`);
  L(`avg final deck ${a.avgDeck.toFixed(1)} cards, avg gold left ${a.avgGold.toFixed(0)}, avg brews used ${a.potionsUsed.toFixed(1)}`);
  const byAct = [1, 2, 3].map((k) => recs.filter((r) => r.result !== 'victory' && r.act === k).length);
  L(`deaths by act: act1 ${byAct[0]}  act2 ${byAct[1]}  act3 ${byAct[2]}   (victories ${a.wins})`);
  L('\n-- death histogram by act/floor');
  for (const [k, v] of Object.entries(a.deathsByAct).sort()) L(`  ${k}  ${'#'.repeat(Math.min(60, v))} ${v}`);
  L('\n-- deaths by encounter');
  for (const [k, v] of Object.entries(a.deathsByEnc).sort((x, y) => y[1] - x[1]).slice(0, 15)) L(`  ${k.padEnd(20)} ${v}`);
  L('\n-- encounters: count, avg HP lost, avg turns, death rate  (sorted by act, kind, HP lost)');
  const rows = Object.entries(a.enc).map(([id, e]) => ({ id, ...e, avgLost: avg(e.lost), avgTurns: avg(e.turns) }));
  const order = { normal: 0, elite: 1, boss: 2 } as Record<string, number>;
  rows.sort((x, y) => x.act - y.act || order[x.kind] - order[y.kind] || y.avgLost - x.avgLost);
  for (const r of rows) L(`  A${r.act} ${r.kind.padEnd(6)} ${r.id.padEnd(16)} n=${String(r.n).padStart(4)}  hpLost ${r.avgLost.toFixed(1).padStart(5)}  turns ${r.avgTurns.toFixed(1).padStart(4)}  deaths ${r.deaths} (${pct(r.deaths / r.n)})`);
  const perKind = (k: string) => {
    const l = rows.filter((r) => r.kind === k);
    const n = l.reduce((s, r) => s + r.n, 0);
    return { hp: l.reduce((s, r) => s + r.avgLost * r.n, 0) / Math.max(1, n), turns: l.reduce((s, r) => s + r.avgTurns * r.n, 0) / Math.max(1, n) };
  };
  for (const k of ['normal', 'elite', 'boss']) L(`  overall ${k}: avg HP lost ${perKind(k).hp.toFixed(1)}, avg turns ${perKind(k).turns.toFixed(1)}`);
  L('\n-- cards (offered / picked-from-rewards / bought / runs with card in final deck / win rate with card; overall ' + pct(a.winRate) + ')');
  const cr = Object.entries(a.cards).filter(([, x]) => x.offered + x.inDeck >= 6).sort((x, y) => y[1].inDeck ? (y[1].wins / y[1].inDeck) - (x[1].inDeck ? x[1].wins / x[1].inDeck : 0) : -1);
  for (const [id, x] of cr) L(`  ${id.padEnd(18)} off ${String(x.offered).padStart(4)} pick ${String(x.picked).padStart(3)} (${x.offered ? pct(x.picked / x.offered) : '  - '}) buy ${String(x.bought).padStart(2)}  deck ${String(x.inDeck).padStart(4)}  win ${x.inDeck ? pct(x.wins / x.inDeck) : '-'}`);
  L('\n-- relics (runs holding it, win rate, delta vs overall)');
  for (const [id, x] of Object.entries(a.relics).filter(([, x]) => x.n >= 5).sort((p, q) => q[1].wins / q[1].n - p[1].wins / p[1].n)) L(`  ${id.padEnd(20)} n=${String(x.n).padStart(4)}  win ${pct(x.wins / x.n).padStart(6)}  delta ${((x.wins / x.n - a.winRate) * 100).toFixed(1).padStart(6)}pp`);
  L('\n-- engine/hook errors: ' + (Object.keys(a.errs).length ? '' : 'none'));
  for (const [k, v] of Object.entries(a.errs).slice(0, 10)) L(`  ${v}x ${k}`);
}

async function cardTest() {
  const per = Number(arg('per', '30'));
  const copies = Number(arg('copies', '2'));
  const self = fileURLToPath(import.meta.url);
  const recs: RunRec[] = [];
  const n = jobs;
  let done = 0;
  const total = (cardTestIds().length + 1) * per;
  await Promise.all(
    Array.from({ length: n }, (_, k) =>
      new Promise<void>((resolve, reject) => {
        const args = [...process.execArgv, self, '--child', '--cardtest', '--k', String(k), '--n', String(n), '--per', String(per), '--copies', String(copies), '--blight', String(blight), '--seed-prefix', prefix, '--beam', String(beam), '--depth', String(depth)];
        const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'inherit'] });
        let buf = '';
        child.stdout.on('data', (d) => {
          buf += d.toString();
          let i;
          while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i);
            buf = buf.slice(i + 1);
            if (line.trim()) {
              recs.push(JSON.parse(line));
              if (++done % 20 === 0) process.stderr.write(`  cardtest ${done}/${total}\r`);
            }
          }
        });
        child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('child exited ' + code))));
      }),
    ),
  );
  const by: Record<string, RunRec[]> = {};
  for (const r of recs) (by[r.tag!] ??= []).push(r);
  const prog = (r: RunRec) => (r.act - 1) * 11 + r.floor;
  const norm = (rs: RunRec[]) => rs.flatMap((r) => r.fights.filter((f) => f.kind === 'normal'));
  const base = by['(baseline)'];
  const bp = avg(base.map(prog));
  const bl = avg(norm(base).map((f) => f.hpLost));
  console.log(`\n==== CARD TEST: starter deck + ${copies}x card, starter-picks-nothing bot, ${per} runs per card, Blight ${blight} ====`);
  console.log(`baseline: progress ${bp.toFixed(2)} floors, normal-fight HP lost ${bl.toFixed(1)}, act1 boss reached ${pct(base.filter((r) => prog(r) >= 11).length / base.length)}, win ${pct(base.filter((r) => r.result === 'victory').length / base.length)}`);
  const rows = Object.entries(by).filter(([k]) => k !== '(baseline)').map(([id, rs]) => ({
    id, rarity: getCard(id).rarity, n: rs.length, prog: avg(rs.map(prog)), lost: avg(norm(rs).map((f) => f.hpLost)),
    boss: rs.filter((r) => prog(r) >= 11).length / rs.length, win: rs.filter((r) => r.result === 'victory').length / rs.length,
  }));
  rows.sort((a, b) => b.prog - a.prog);
  for (const r of rows) console.log(`  ${r.id.padEnd(18)} ${r.rarity.padEnd(9)} progress ${r.prog.toFixed(2).padStart(6)} (${(r.prog - bp >= 0 ? '+' : '') + (r.prog - bp).toFixed(2)})  normalHpLost ${r.lost.toFixed(1).padStart(5)} (${(r.lost - bl >= 0 ? '+' : '') + (r.lost - bl).toFixed(1)})  reachBoss ${pct(r.boss).padStart(6)}  win ${pct(r.win)}`);
  writeFileSync('/tmp/claude-0/sim-cardtest.json', JSON.stringify({ baseline: { prog: bp, lost: bl }, rows }, null, 1));
}

async function main() {
  if (flag('card-test')) return cardTest();
  if (flag('verbose')) {
    engineLog.quiet = false;
    const rec = playRun(`${prefix}${arg('index', '0')}`, { blight, picks, beam, depth, verbose: true });
    console.log(`\nRESULT ${rec.result} act ${rec.act} floor ${rec.floor} cause ${rec.cause}; deck ${rec.deck.join(',')}`);
    return;
  }
  const t0 = Date.now();
  const recs = await runBatch(picks, runs);
  const a = analyse(recs);
  printReport(`Blight ${blight}, picks=${picks}, ${runs} runs (${((Date.now() - t0) / 1000).toFixed(0)}s)`, recs, a);
  const out: Record<string, unknown> = { config: { runs, blight, picks, prefix, beam, depth }, main: a };
  if (flag('compare') && picks !== 'none') {
    const base = await runBatch('none', runs);
    const b = analyse(base);
    printReport(`BASELINE starter-deck bot (never picks cards), Blight ${blight}`, base, b);
    console.log(`\n>>> COMPARISON  ${picks}: win ${pct(a.winRate)}, progress ${a.avgFloors.toFixed(1)} floors   vs   starter-only: win ${pct(b.winRate)}, progress ${b.avgFloors.toFixed(1)} floors`);
    out.baseline = b;
    const rnd = await runBatch('random', runs);
    const rr = analyse(rnd);
    console.log(`>>> SANITY random-picks bot (25% skip, else random card): win ${pct(rr.winRate)}, progress ${rr.avgFloors.toFixed(1)} floors, deaths act1/2/3 ${[1, 2, 3].map((k) => rnd.filter((r) => r.result !== 'victory' && r.act === k).length).join('/')}`);
    out.random = rr;
  }
  // unused import guard
  void findEnemy;
  writeFileSync(jsonPath, JSON.stringify(out, null, 1));
  console.log('\nJSON written to ' + jsonPath);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
