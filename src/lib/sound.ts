/**
 * Pekoni sound design.
 *
 * Every cue is synthesised with the Web Audio API — no audio files are shipped,
 * so the sound layer costs zero bytes and zero requests. The context is created
 * lazily on the first user gesture, which is also the only point at which a
 * browser will allow playback.
 */

export type SoundName =
  | "click"
  | "hover"
  | "navigate"
  | "bet"
  | "win"
  | "bigWin"
  | "lose"
  | "reelStop"
  | "reelSpin"
  | "tileSafe"
  | "explosion"
  | "caseOpen"
  | "caseTick"
  | "rare"
  | "crashTick"
  | "crashBust"
  | "cashout"
  | "levelUp"
  | "hit"
  | "crit"
  | "kill"
  | "error";

type Engine = {
  ctx: AudioContext;
  master: GainNode;
};

let engine: Engine | null = null;
let muted = true;
let volume = 0.5;

function ensureEngine(): Engine | null {
  if (typeof window === "undefined") return null;
  if (engine) return engine;

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  engine = { ctx, master };
  return engine;
}

export function setMuted(next: boolean) {
  muted = next;
  if (!next) {
    const e = ensureEngine();
    // Browsers start the context suspended until a gesture resumes it.
    if (e && e.ctx.state === "suspended") void e.ctx.resume();
  }
}

export function setVolume(next: number) {
  volume = Math.max(0, Math.min(1, next));
  if (engine) engine.master.gain.value = volume;
}

export function isMuted() {
  return muted;
}

type ToneOptions = {
  type?: OscillatorType;
  freq: number;
  /** Sweep target; omit for a steady tone. */
  to?: number;
  duration: number;
  gain?: number;
  delay?: number;
  /** Attack as a share of the duration. */
  attack?: number;
  detune?: number;
};

function tone(opts: ToneOptions) {
  const e = ensureEngine();
  if (!e || muted) return;
  const { ctx, master } = e;
  if (ctx.state === "suspended") void ctx.resume();

  const start = ctx.currentTime + (opts.delay ?? 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, start);
  if (opts.to !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), start + opts.duration);
  }
  if (opts.detune) osc.detune.setValueAtTime(opts.detune, start);

  const peak = (opts.gain ?? 0.2) * volume;
  const attack = Math.max(0.004, opts.duration * (opts.attack ?? 0.06));

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration);

  osc.connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + opts.duration + 0.02);
}

/** Filtered noise burst — the basis of impacts, explosions and reel stops. */
function noise(opts: {
  duration: number;
  gain?: number;
  delay?: number;
  filter?: BiquadFilterType;
  freq?: number;
  q?: number;
  sweepTo?: number;
}) {
  const e = ensureEngine();
  if (!e || muted) return;
  const { ctx, master } = e;
  if (ctx.state === "suspended") void ctx.resume();

  const start = ctx.currentTime + (opts.delay ?? 0);
  const frames = Math.max(1, Math.floor(ctx.sampleRate * opts.duration));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = opts.filter ?? "lowpass";
  filter.frequency.setValueAtTime(opts.freq ?? 1400, start);
  if (opts.sweepTo) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, opts.sweepTo), start + opts.duration);
  }
  filter.Q.value = opts.q ?? 1;

  const gain = ctx.createGain();
  const peak = (opts.gain ?? 0.14) * volume;
  gain.gain.setValueAtTime(peak, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration);

  source.connect(filter).connect(gain).connect(master);
  source.start(start);
  source.stop(start + opts.duration + 0.02);
}

const RECIPES: Record<SoundName, () => void> = {
  click: () => tone({ type: "triangle", freq: 520, to: 400, duration: 0.055, gain: 0.1 }),
  hover: () => tone({ type: "sine", freq: 760, duration: 0.04, gain: 0.035 }),
  navigate: () => {
    tone({ type: "sine", freq: 420, to: 620, duration: 0.14, gain: 0.08 });
    tone({ type: "sine", freq: 840, duration: 0.1, gain: 0.03, delay: 0.05 });
  },
  bet: () => {
    tone({ type: "triangle", freq: 300, to: 220, duration: 0.1, gain: 0.11 });
    noise({ duration: 0.09, freq: 900, gain: 0.06 });
  },
  win: () => {
    [523.25, 659.25, 783.99].forEach((freq, i) =>
      tone({ type: "sine", freq, duration: 0.34, gain: 0.11, delay: i * 0.065 }),
    );
  },
  bigWin: () => {
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
      tone({ type: "triangle", freq, duration: 0.52, gain: 0.1, delay: i * 0.075 }),
    );
    noise({ duration: 0.9, freq: 2600, sweepTo: 400, gain: 0.05, delay: 0.1 });
  },
  lose: () => tone({ type: "sine", freq: 240, to: 150, duration: 0.42, gain: 0.09 }),
  reelSpin: () => noise({ duration: 0.22, freq: 620, q: 3, gain: 0.05 }),
  reelStop: () => {
    tone({ type: "square", freq: 150, to: 90, duration: 0.09, gain: 0.07 });
    noise({ duration: 0.08, freq: 420, gain: 0.09 });
  },
  tileSafe: () => {
    tone({ type: "sine", freq: 880, to: 1180, duration: 0.14, gain: 0.08 });
    tone({ type: "sine", freq: 1320, duration: 0.1, gain: 0.03, delay: 0.05 });
  },
  explosion: () => {
    noise({ duration: 0.62, freq: 1800, sweepTo: 60, gain: 0.24, filter: "lowpass" });
    tone({ type: "sine", freq: 90, to: 32, duration: 0.5, gain: 0.2 });
  },
  caseOpen: () => {
    tone({ type: "sine", freq: 180, to: 320, duration: 0.4, gain: 0.1 });
    noise({ duration: 0.3, freq: 1600, sweepTo: 500, gain: 0.08 });
  },
  caseTick: () => tone({ type: "square", freq: 1250, duration: 0.022, gain: 0.028 }),
  rare: () => {
    [659.25, 880, 1174.66, 1567.98].forEach((freq, i) =>
      tone({ type: "sine", freq, duration: 0.85, gain: 0.09, delay: i * 0.1 }),
    );
  },
  crashTick: () => tone({ type: "sine", freq: 640, duration: 0.028, gain: 0.02 }),
  crashBust: () => {
    noise({ duration: 0.5, freq: 2200, sweepTo: 80, gain: 0.2 });
    tone({ type: "sawtooth", freq: 220, to: 60, duration: 0.42, gain: 0.13 });
  },
  cashout: () => {
    tone({ type: "sine", freq: 700, to: 1050, duration: 0.2, gain: 0.11 });
    tone({ type: "sine", freq: 1400, duration: 0.22, gain: 0.05, delay: 0.08 });
  },
  levelUp: () => {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) =>
      tone({ type: "triangle", freq, duration: 0.7, gain: 0.1, delay: i * 0.09 }),
    );
  },
  hit: () => {
    noise({ duration: 0.07, freq: 1800, sweepTo: 700, gain: 0.1 });
    tone({ type: "square", freq: 190, to: 120, duration: 0.06, gain: 0.06 });
  },
  crit: () => {
    noise({ duration: 0.12, freq: 3200, sweepTo: 800, gain: 0.15 });
    tone({ type: "triangle", freq: 520, to: 900, duration: 0.14, gain: 0.09 });
  },
  kill: () => tone({ type: "sine", freq: 420, to: 640, duration: 0.16, gain: 0.08 }),
  error: () => {
    tone({ type: "square", freq: 200, duration: 0.09, gain: 0.07 });
    tone({ type: "square", freq: 150, duration: 0.12, gain: 0.07, delay: 0.09 });
  },
};

export function play(name: SoundName) {
  if (muted) return;
  try {
    RECIPES[name]?.();
  } catch {
    // Audio is decorative — a failure here must never break an interaction.
  }
}

/** Rising pitch for the crash ascent and case reel. */
export function playPitched(name: "crashTick" | "caseTick", progress: number) {
  if (muted) return;
  try {
    const base = name === "crashTick" ? 480 : 1_000;
    tone({
      type: name === "crashTick" ? "sine" : "square",
      freq: base * (1 + Math.min(2.4, progress)),
      duration: 0.026,
      gain: 0.024,
    });
  } catch {
    /* ignore */
  }
}
