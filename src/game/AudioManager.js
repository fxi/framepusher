/**
 * AudioManager — fully synthesized sounds via Web Audio API.
 * No audio files required. The context must be unlocked by a user gesture
 * before any sound plays (call unlock() on first pointerdown).
 */
export class AudioManager {
  constructor() {
    this._ctx      = null;
    this._unlocked = false;
    this._cooldowns = new Map(); // frameIndex → timestamp (ms)
  }

  /**
   * Create (or resume) the AudioContext. Safe to call on every user gesture —
   * iOS/Safari suspends the context on page hide and requires resume() again.
   */
  unlock() {
    if (!this._ctx) {
      try {
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
        this._unlocked = true;
      } catch {
        return; // Audio not available — degrade silently
      }
    }
    // iOS suspends the context; resume on every gesture to ensure audio works
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
    // Silent 1-sample buffer — forces iOS WebKit to synchronously mark the context
    // as gesture-activated (resume() alone is async and may not suffice in time)
    if (this._ctx.state !== 'running') {
      try {
        const buf = this._ctx.createBuffer(1, 1, this._ctx.sampleRate);
        const src = this._ctx.createBufferSource();
        src.buffer = buf;
        src.connect(this._ctx.destination);
        src.start(0);
      } catch (_) {}
    }
  }

  get _ready() {
    return this._unlocked && this._ctx && this._ctx.state === 'running';
  }

  // ─── Public sound events ───────────────────────────────────────────────────

  /**
   * Short woody knock when grabbing a frame.
   * Pitch shifts slightly with depth: outer frames are lower.
   */
  playGrab(frameIndex, totalFrames) {
    if (!this._ready) return;
    const t   = this._ctx.currentTime;
    const freq = 100 + (1 - frameIndex / totalFrames) * 80; // 100–180 Hz
    this._tone('sine', freq, 0.3, t, 0.005, t + 0.09);
  }

  /**
   * Woody tap/knock when a frame first makes contact.
   * Rate-limited to one sound per frame per 80 ms.
   * Outer frames = lower pitch, inner frames = higher pitch.
   * Volume scales with collision velocity.
   */
  playCollision(frameIndex, totalFrames, velocity) {
    if (!this._ready) return;

    const now = performance.now();
    const last = this._cooldowns.get(frameIndex) ?? 0;
    if (now - last < 80) return;
    this._cooldowns.set(frameIndex, now);

    const ctx  = this._ctx;
    const t    = ctx.currentTime;
    const norm = frameIndex / Math.max(totalFrames - 1, 1); // 0=outer, 1=inner

    // Short white-noise burst through a downward-sweeping bandpass → woody tap
    const bufLen = Math.ceil(ctx.sampleRate * 0.06);
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 4;
    const baseFreq = 600 + norm * 1400; // outer≈600 Hz (deep thud), inner≈2000 Hz (sharp tap)
    filter.frequency.setValueAtTime(baseFreq, t);
    filter.frequency.exponentialRampToValueAtTime(baseFreq * 0.25, t + 0.04);

    const gain = ctx.createGain();
    const vol  = Math.min(0.45, 0.18 + velocity * 0.015);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.07);
  }

  /**
   * Short ascending sweep when the reset button is pressed.
   */
  playReset() {
    if (!this._ready) return;
    const ctx = this._ctx;
    const t   = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.45);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.4);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  /**
   * Quiet perfect-fifth chord when all frames have settled back to rest.
   */
  playSettle() {
    if (!this._ready) return;
    const t = this._ctx.currentTime;
    this._tone('sine', 330, 0.12, t, 0.01, t + 0.25);
    this._tone('sine', 495, 0.08, t, 0.01, t + 0.25);
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  /**
   * Play a single oscillator tone with a simple attack/decay envelope.
   * @param {string} type      OscillatorType
   * @param {number} freq      Hz
   * @param {number} peakGain  peak amplitude (0–1)
   * @param {number} startTime AudioContext time
   * @param {number} attackEnd time for peak
   * @param {number} stopTime  time for silence (gain → 0)
   */
  _tone(type, freq, peakGain, startTime, attackEnd, stopTime) {
    const ctx  = this._ctx;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, attackEnd);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    const osc  = ctx.createOscillator();
    osc.type   = type;
    osc.frequency.setValueAtTime(freq, startTime);
    osc.connect(gain);
    osc.start(startTime);
    osc.stop(stopTime + 0.01);
  }
}
