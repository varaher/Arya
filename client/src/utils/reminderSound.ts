// ARYA Reminder Sound Utility
// Indian-inspired chime using Web Audio API — no audio files needed

export type SoundType =
  | 'reminder'
  | 'goal'
  | 'morning'
  | 'success'
  | 'gentle'
  | 'alarm'

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume: number = 0.3,
  type: OscillatorType = 'sine',
  decayStyle: 'bell' | 'pluck' | 'sustain' = 'bell'
) {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();

  oscillator.connect(gainNode);
  gainNode.connect(compressor);
  compressor.connect(ctx.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);

  if (decayStyle === 'bell') {
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  } else if (decayStyle === 'pluck') {
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.6);
  } else {
    gainNode.gain.setValueAtTime(volume, startTime + duration * 0.7);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
  }

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.1);
}

function playRichTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume: number = 0.25
) {
  playTone(ctx, frequency,       startTime, duration,       volume,       'sine', 'bell');
  playTone(ctx, frequency * 2,   startTime, duration * 0.7, volume * 0.3, 'sine', 'bell');
  playTone(ctx, frequency * 3,   startTime, duration * 0.4, volume * 0.1, 'sine', 'bell');
}

// ── SOUND 1: Temple Bell — Sa·Pa·Sa ──────────────────────────────────────────
export function playTempleBell() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  playRichTone(ctx, 523.25, now,       2.5, 0.28);
  playRichTone(ctx, 784.00, now + 0.5, 2.0, 0.22);
  playRichTone(ctx, 1046.5, now + 0.9, 2.5, 0.18);
  playTone(ctx, 261.63, now, 3.5, 0.08, 'sine', 'bell');
}

// ── SOUND 2: Sitar Rise — Sa·Re·Ga·Ma·Pa ─────────────────────────────────────
export function playSitarRise() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const notes  = [261.63, 293.66, 329.63, 349.23, 392.00];
  const delays = [0, 0.15, 0.28, 0.40, 0.52];
  notes.forEach((freq, i) => {
    playTone(ctx, freq,         now + delays[i],        1.2, 0.25, 'sawtooth', 'pluck');
    playTone(ctx, freq * 2.01,  now + delays[i] + 0.01, 0.8, 0.08, 'sine',     'pluck');
  });
  playRichTone(ctx, 523.25, now + 0.7, 2.0, 0.2);
}

// ── SOUND 3: Morning Raga — Bhairav phrase ────────────────────────────────────
export function playMorningRaga() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const raga = [
    { freq: 261.63, delay: 0,    dur: 0.6 },
    { freq: 277.18, delay: 0.5,  dur: 0.4 },
    { freq: 329.63, delay: 0.85, dur: 0.5 },
    { freq: 349.23, delay: 1.3,  dur: 0.6 },
    { freq: 392.00, delay: 1.85, dur: 0.5 },
    { freq: 415.30, delay: 2.3,  dur: 0.4 },
    { freq: 493.88, delay: 2.65, dur: 0.5 },
    { freq: 523.25, delay: 3.1,  dur: 1.5 },
  ];
  raga.forEach(({ freq, delay, dur }) => {
    playTone(ctx, freq,  now + delay, dur, 0.2,  'sine', 'sustain');
    playTone(ctx, 65.41, now + delay, dur, 0.04, 'sine', 'sustain');
  });
  playRichTone(ctx, 523.25, now + 4.0, 3.0, 0.15);
}

// ── SOUND 4: Success Chime — C·E·G·C ─────────────────────────────────────────
export function playSuccessChime() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    playRichTone(ctx, freq, now + i * 0.12, 1.5, 0.22);
  });
  playTone(ctx, 1318.5, now + 0.5, 1.0, 0.1, 'sine', 'bell');
}

// ── SOUND 5: Gentle Ping — single E5 ─────────────────────────────────────────
export function playGentlePing() {
  const ctx = getAudioContext();
  playRichTone(ctx, 659.25, ctx.currentTime, 2.0, 0.2);
}

// ── SOUND 6: ARYA Wake — G then C resolving home ─────────────────────────────
export function playAryaWake() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  playRichTone(ctx, 392.00, now,        1.5, 0.2);
  playRichTone(ctx, 523.25, now + 0.35, 2.5, 0.22);
  playTone(ctx, 1046.5, now + 0.6, 1.5, 0.06, 'sine', 'bell');
}

// ── SOUND 7: Alarm — urgent repeating burst ───────────────────────────────────
let alarmIntervalId: ReturnType<typeof setInterval> | null = null;

function playAlarmBurst() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    [0, 0.20, 0.40].forEach((d) => {
      playTone(ctx, 1318.5, now + d,        0.15, 0.5, 'square', 'pluck');
      playTone(ctx, 987.77, now + d + 0.01, 0.13, 0.2, 'sine',   'pluck');
    });
  } catch {}
}

export function playAlarmSound() {
  stopAlarmSound();
  playAlarmBurst();
  alarmIntervalId = setInterval(playAlarmBurst, 1200);
}

export function stopAlarmSound() {
  if (alarmIntervalId !== null) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
}

// ── Main dispatcher ───────────────────────────────────────────────────────────
export function playARYASound(type: SoundType = 'reminder') {
  try {
    switch (type) {
      case 'reminder': playTempleBell();   break;
      case 'goal':     playSitarRise();    break;
      case 'morning':  playMorningRaga();  break;
      case 'success':  playSuccessChime(); break;
      case 'gentle':   playGentlePing();   break;
      case 'alarm':    playAlarmSound();   break;
      default:         playTempleBell();
    }
  } catch (err) {
    console.warn('[ARYA] Sound blocked by browser autoplay policy:', err);
  }
}
