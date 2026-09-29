// Fungeon audio: everything is synthesized with WebAudio (no files). Never throws.
export type SfxName = 'click' | 'card' | 'draw' | 'shuffle' | 'hit' | 'bigHit' | 'block' | 'blockBreak' | 'buff' | 'debuff' | 'rot' | 'heal' | 'coin' | 'plant' | 'grow' | 'bloom' | 'compost' | 'victory' | 'defeat' | 'enemyDie' | 'turn' | 'error' | 'potion' | 'relic' | 'upgrade' | 'select' | 'nodeSelect';
type Mood = 'menu' | 'map' | 'combat' | 'boss' | 'none';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let sfxOn = true;
let musicOn = true;
let wantMood: Mood = 'none';
let run: { mood: Mood; gain: GainNode; timer: ReturnType<typeof setInterval>; step: number; next: number; idx: number } | null = null;

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const rnd = Math.random;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const AC = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC() as AudioContext;
    master = ctx.createGain(); master.gain.value = 0.55;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
    const len = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = rnd() * 2 - 1;
  } catch { ctx = null; }
  return ctx;
}

/** A soft enveloped oscillator. */
function tone(dest: AudioNode, f: number, t: number, dur: number, vol = 0.2, type: OscillatorType = 'sine', slideTo?: number, attack = 0.006, lp = 0) {
  const c = ctx!;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let n: AudioNode = o;
  if (lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); n = fl; }
  n.connect(g); g.connect(dest);
  o.start(t); o.stop(t + dur + 0.05);
}
function noise(dest: AudioNode, t: number, dur: number, type: BiquadFilterType, f: number, vol = 0.2, q = 1, f2?: number) {
  const c = ctx!;
  const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(dest);
  s.start(t, rnd() * 0.5); s.stop(t + dur + 0.05);
}
const pluck = (d: AudioNode, m: number, t: number, dur = 0.28, vol = 0.2) => { tone(d, mtof(m), t, dur, vol, 'triangle', undefined, 0.004, 2600); tone(d, mtof(m) * 2, t, dur * 0.5, vol * 0.25, 'sine'); };

const SFX: Record<SfxName, (d: AudioNode, t: number) => void> = {
  click: (d, t) => tone(d, 720, t, 0.06, 0.16, 'sine', 560),
  select: (d, t) => tone(d, 880, t, 0.07, 0.14, 'triangle'),
  card: (d, t) => { tone(d, 420, t, 0.09, 0.16, 'triangle', 640); noise(d, t, 0.06, 'highpass', 3000, 0.05); },
  draw: (d, t) => noise(d, t, 0.14, 'bandpass', 900, 0.14, 1.2, 3200),
  shuffle: (d, t) => { for (let i = 0; i < 5; i++) noise(d, t + i * 0.055, 0.06, 'bandpass', 1800 + i * 200, 0.1, 1.5); },
  hit: (d, t) => { tone(d, 260, t, 0.16, 0.34, 'sine', 70); noise(d, t, 0.09, 'lowpass', 1400, 0.24); tone(d, 900, t, 0.03, 0.08, 'square'); },
  bigHit: (d, t) => { tone(d, 180, t, 0.34, 0.5, 'sine', 40); tone(d, 300, t, 0.2, 0.25, 'triangle', 80); noise(d, t, 0.22, 'lowpass', 1800, 0.36, 1, 300); },
  block: (d, t) => { tone(d, 780, t, 0.1, 0.32, 'triangle', 420); tone(d, 1240, t, 0.05, 0.12, 'sine'); noise(d, t, 0.03, 'bandpass', 2200, 0.1, 2); },
  blockBreak: (d, t) => { noise(d, t, 0.2, 'bandpass', 2600, 0.24, 1.5, 500); tone(d, 500, t, 0.22, 0.24, 'triangle', 120); },
  buff: (d, t) => [72, 76, 79].forEach((m, i) => pluck(d, m, t + i * 0.07, 0.25, 0.16)),
  debuff: (d, t) => { tone(d, 440, t, 0.18, 0.16, 'triangle', 330); tone(d, 330, t + 0.1, 0.24, 0.16, 'triangle', 220); },
  rot: (d, t) => { for (let i = 0; i < 6; i++) tone(d, 160 + rnd() * 120, t + i * 0.05, 0.1, 0.16, 'sine', 420 + rnd() * 200); noise(d, t, 0.25, 'lowpass', 500, 0.08); },
  heal: (d, t) => [76, 79, 83].forEach((m, i) => tone(d, mtof(m), t + i * 0.09, 0.3, 0.14, 'sine')),
  coin: (d, t) => { tone(d, 1319, t, 0.09, 0.16, 'square', undefined, 0.003, 4000); tone(d, 1760, t + 0.07, 0.22, 0.14, 'square', undefined, 0.003, 4000); },
  plant: (d, t) => { pluck(d, 60, t, 0.22, 0.24); pluck(d, 67, t + 0.09, 0.28, 0.22); },
  grow: (d, t) => [64, 67, 71].forEach((m, i) => pluck(d, m, t + i * 0.09, 0.26, 0.2)),
  bloom: (d, t) => { [72, 76, 79, 84].forEach((m, i) => pluck(d, m, t + i * 0.075, 0.34, 0.2)); noise(d, t + 0.2, 0.15, 'highpass', 6000, 0.05); },
  compost: (d, t) => { for (let i = 0; i < 6; i++) noise(d, t + i * 0.045 + rnd() * 0.02, 0.07, 'bandpass', 1200 + rnd() * 2000, 0.16, 2); },
  victory: (d, t) => { [72, 76, 79, 84, 79, 84, 88].forEach((m, i) => { const at = t + i * 0.16 + (i > 3 ? 0.06 : 0); pluck(d, m, at, i === 6 ? 0.5 : 0.28, 0.2); if (i % 2 === 0) tone(d, mtof(m - 12), at, 0.3, 0.06, 'sine'); }); [60, 64, 67].forEach((m) => tone(d, mtof(m), t + 1.0, 0.5, 0.06, 'sine')); },
  defeat: (d, t) => { [69, 66, 64, 60].forEach((m, i) => { tone(d, mtof(m), t + i * 0.24, 0.45, 0.2, 'triangle', undefined, 0.01, 1800); tone(d, mtof(m - 12), t + i * 0.24, 0.45, 0.08, 'sine'); }); },
  enemyDie: (d, t) => { tone(d, 640, t, 0.28, 0.26, 'sine', 90); noise(d, t, 0.1, 'bandpass', 1500, 0.12, 1); tone(d, 1200, t + 0.02, 0.1, 0.06, 'triangle', 300); },
  turn: (d, t) => { tone(d, 523, t, 0.1, 0.14, 'triangle'); tone(d, 659, t + 0.09, 0.14, 0.14, 'triangle'); },
  error: (d, t) => { tone(d, 170, t, 0.11, 0.18, 'square', undefined, 0.005, 700); tone(d, 150, t + 0.12, 0.13, 0.18, 'square', undefined, 0.005, 700); },
  potion: (d, t) => { for (let i = 0; i < 4; i++) tone(d, 300 + i * 90, t + i * 0.06, 0.09, 0.16, 'sine', 500 + i * 140); tone(d, 1200, t + 0.3, 0.1, 0.08, 'sine'); },
  relic: (d, t) => [79, 83, 86, 91].forEach((m, i) => { pluck(d, m, t + i * 0.08, 0.36, 0.16); }),
  upgrade: (d, t) => [67, 72, 76, 79, 84].forEach((m, i) => pluck(d, m, t + i * 0.07, 0.3, 0.18)),
  nodeSelect: (d, t) => { pluck(d, 67, t, 0.2, 0.18); pluck(d, 74, t + 0.08, 0.26, 0.18); },
};

// ------------------------------------------------------------------ music
interface MoodCfg { bpm: number; root: number; scale: number[]; prog: number[][]; melody: number; bass: 0 | 1 | 2; hat: boolean; padVol: number; wave: OscillatorType }
const CFG: Record<Exclude<Mood, 'none'>, MoodCfg> = {
  // pentatonic major, calm. chord roots relative to root: I vi IV V
  menu: { bpm: 66, root: 60, scale: [0, 2, 4, 7, 9], prog: [[0, 4, 7], [9, 0, 4], [5, 9, 0], [7, 11, 2]], melody: 0.32, bass: 0, hat: false, padVol: 0.06, wave: 'triangle' },
  map: { bpm: 78, root: 62, scale: [0, 2, 4, 7, 9], prog: [[0, 4, 7], [7, 11, 2], [9, 0, 4], [5, 9, 0]], melody: 0.4, bass: 1, hat: false, padVol: 0.05, wave: 'triangle' },
  // minor pentatonic, rhythmic
  combat: { bpm: 108, root: 57, scale: [0, 3, 5, 7, 10], prog: [[0, 3, 7], [8, 0, 3], [3, 7, 10], [10, 2, 5]], melody: 0.5, bass: 2, hat: true, padVol: 0.04, wave: 'triangle' },
  // harmonic-minor, tense
  boss: { bpm: 96, root: 50, scale: [0, 2, 3, 5, 7, 8, 11], prog: [[0, 3, 7], [0, 3, 6], [8, 0, 3], [7, 11, 2]], melody: 0.4, bass: 2, hat: true, padVol: 0.06, wave: 'sawtooth' },
};

function schedule(r: NonNullable<typeof run>) {
  const c = ctx!; const cfg = CFG[r.mood as Exclude<Mood, 'none'>]; const stepDur = 60 / cfg.bpm / 2;
  while (r.next < c.currentTime + 0.45) {
    const t = r.next; const s = r.step; const bar = Math.floor(s / 8); const chord = cfg.prog[bar % cfg.prog.length];
    const d = r.gain;
    if (s % 8 === 0) { // pad
      chord.forEach((n, i) => { const f = mtof(cfg.root + n - 12 + (i === 0 ? 0 : 0)); const o = c.createOscillator(); const g = c.createGain(); const fl = c.createBiquadFilter();
        o.type = cfg.wave === 'sawtooth' ? 'sawtooth' : 'sine'; o.frequency.value = f; o.detune.value = (i - 1) * 4; fl.type = 'lowpass'; fl.frequency.value = 700;
        const len = stepDur * 8; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(cfg.padVol, t + len * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + len * 1.02);
        o.connect(fl); fl.connect(g); g.connect(d); o.start(t); o.stop(t + len * 1.05); });
    }
    if (cfg.bass === 2 && s % 2 === 0) { const n = chord[(s / 2) % 4 === 2 ? 2 : 0] - 24; tone(d, mtof(cfg.root + n), t, stepDur * 1.6, 0.16, 'triangle', undefined, 0.005, 500); }
    else if (cfg.bass === 1 && s % 4 === 0) tone(d, mtof(cfg.root + chord[0] - 24), t, stepDur * 3, 0.14, 'sine');
    if (cfg.hat && s % 2 === 1) noise(d, t, 0.04, 'highpass', 7000, 0.035);
    if (cfg.hat && s % 4 === 0) noise(d, t, 0.06, 'lowpass', 300, 0.12);
    if (rnd() < cfg.melody * (s % 2 === 0 ? 1.15 : 0.7)) {
      r.idx = Math.max(0, Math.min(cfg.scale.length * 2 - 1, r.idx + Math.round(rnd() * 4 - 2)));
      const deg = cfg.scale[r.idx % cfg.scale.length] + 12 * Math.floor(r.idx / cfg.scale.length);
      pluck(d, cfg.root + 12 + deg, t + (rnd() < 0.3 ? stepDur * 0.25 : 0), stepDur * 3, 0.1);
      if (r.mood === 'boss' && rnd() < 0.08) pluck(d, cfg.root + 12 + deg + 6, t, stepDur * 2, 0.05);
    }
    r.step++; r.next += stepDur;
  }
}

function stopRun() {
  const r = run; run = null;
  if (!r) return;
  clearInterval(r.timer);
  try { const c = ctx!; r.gain.gain.cancelScheduledValues(c.currentTime); r.gain.gain.setValueAtTime(r.gain.gain.value, c.currentTime); r.gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.3); setTimeout(() => { try { r.gain.disconnect(); } catch { /* ignore */ } }, 450); } catch { /* ignore */ }
}
function applyMusic() {
  try {
    const want = musicOn ? wantMood : 'none';
    if (run && run.mood === want) return;
    stopRun();
    if (want === 'none' || !ensure() || !musicBus || ctx!.state === 'closed') return;
    const c = ctx!; const gain = c.createGain(); gain.gain.setValueAtTime(0, c.currentTime); gain.gain.linearRampToValueAtTime(1, c.currentTime + 0.6); gain.connect(musicBus);
    const r = { mood: want, gain, timer: 0 as unknown as ReturnType<typeof setInterval>, step: 0, next: c.currentTime + 0.08, idx: 3 };
    r.timer = setInterval(() => { try { if (c.state === 'running') schedule(r); else r.next = Math.max(r.next, c.currentTime); } catch { /* ignore */ } }, 100);
    run = r;
  } catch { /* ignore */ }
}

export const audio = {
  play(name: SfxName) {
    try {
      if (!sfxOn || !ctx || ctx.state !== 'running' || !sfxBus) return;
      SFX[name]?.(sfxBus, ctx.currentTime + 0.005);
    } catch { /* ignore */ }
  },
  setSfx(on: boolean) { sfxOn = on; },
  setMusic(on: boolean) { musicOn = on; if (ctx || !on) applyMusic(); },
  /** Must be called from a user gesture once to unlock audio on iOS. */
  unlock() {
    try {
      const c = ensure();
      if (!c) return;
      if (c.state !== 'running') void c.resume().then(applyMusic).catch(() => {});
      applyMusic();
    } catch { /* ignore */ }
  },
  /** Background music mood. */
  music(mood: Mood) { wantMood = mood; if (ctx || mood === 'none') applyMusic(); },
};
