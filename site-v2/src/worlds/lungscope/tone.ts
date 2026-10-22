// Synthetic breath tone for the transport. Safe by construction:
// never starts on its own (a click or key press only), master gain is capped, a compressor sits after it,
// and it stops on the Stop button, when the tab is hidden, when the page is left, when the timeline scrolls out of view,
// and after 90 seconds. The sound is filtered noise shaped like one breath; it is not a recording.
export const GAIN_CAP = 0.12;
export const MAX_SECONDS = 90;
const VOICES = [380, 450, 530, 620, 720, 830];

export interface Tone {
  readonly playing: boolean;
  start(): Promise<void>;
  stop(): void;
  setVolume(v: number): void;   // 0..1 of the cap
  setVoice(i: number): void;
}

export function createTone(onChange: (playing: boolean) => void): Tone {
  let ctx: AudioContext | null = null, master: GainNode | null = null, env: GainNode | null = null, filt: BiquadFilterNode | null = null;
  let src: AudioBufferSourceNode | null = null, cycle = 0, killer = 0, vol = 0.4, voice = 0, playing = false;

  const schedule = () => {
    if (!ctx || !env || !filt) return;
    const t = ctx.currentTime, base = VOICES[voice];
    env.gain.cancelScheduledValues(t);
    env.gain.setValueAtTime(env.gain.value, t);
    env.gain.linearRampToValueAtTime(0.9, t + 1.5);   // inhale
    env.gain.linearRampToValueAtTime(0.05, t + 4.0);  // exhale
    filt.frequency.cancelScheduledValues(t);
    filt.frequency.setValueAtTime(base * 0.8, t);
    filt.frequency.linearRampToValueAtTime(base * 1.4, t + 1.5);
    filt.frequency.linearRampToValueAtTime(base * 0.7, t + 4.0);
  };

  const teardown = () => {
    window.clearInterval(cycle); window.clearTimeout(killer);
    document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', stop);
    const c = ctx, s = src; ctx = master = env = filt = src = null;
    if (s) { try { s.stop(); } catch { /* already stopped */ } }
    if (c) c.close().catch(() => undefined);
  };
  const onHide = () => { if (document.hidden) stop(); };
  function stop() {
    if (!playing && !ctx) return;
    if (ctx && master) { try { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, 0.03); } catch { /* ignore */ } }
    playing = false; onChange(false);
    window.setTimeout(teardown, 120);
  }

  return {
    get playing() { return playing; },
    async start() {
      if (playing) return;
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -24; comp.ratio.value = 12;
      env = ctx.createGain(); env.gain.value = 0.05;
      filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.Q.value = 0.9; filt.frequency.value = VOICES[voice];
      const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      let b0 = 0; for (let i = 0; i < len; i++) { b0 = 0.97 * b0 + (Math.random() * 2 - 1) * 0.2; d[i] = b0; }   // soft, low-passed noise
      src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      src.connect(filt); filt.connect(env); env.connect(master); master.connect(comp); comp.connect(ctx.destination);
      if (ctx.state === 'suspended') await ctx.resume();
      src.start();
      master.gain.setTargetAtTime(Math.min(GAIN_CAP, vol * GAIN_CAP), ctx.currentTime, 0.05);
      schedule(); cycle = window.setInterval(schedule, 4000);
      killer = window.setTimeout(stop, MAX_SECONDS * 1000);
      document.addEventListener('visibilitychange', onHide); window.addEventListener('pagehide', stop);
      playing = true; onChange(true);
    },
    stop,
    setVolume(v: number) { vol = Math.max(0, Math.min(1, v)); if (ctx && master) master.gain.setTargetAtTime(Math.min(GAIN_CAP, vol * GAIN_CAP), ctx.currentTime, 0.05); },
    setVoice(i: number) { voice = Math.max(0, Math.min(VOICES.length - 1, i)); },
  };
}
