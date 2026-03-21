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

  /** Create (or resume) the AudioContext. Must be called from a user gesture. */
  unlock() {
    if (this._unlocked) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._unlocked = true;
    } catch {
      // Audio not available — degrade silently
    }
  }

  get _ready() {
    return this._unlocked && this._ctx;
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
   * Pitched tick when a frame is pushed by a collision.
   * Rate-limited to one sound per frame per 80 ms.
   * Outer frames = low pitch, inner frames = high pitch.
   * Volume scales with collision velocity.
   */
  playCollision(frameIndex, totalFrames, velocity) {
    if (!this._ready) return;

    const now = performance.now();
    const last = this._cooldowns.get(frameIndex) ?? 0;
    if (now - last < 80) return;
    this._cooldowns.set(frameIndex, now);

    const t    = this._ctx.currentTime;
    const norm = 1 - frameIndex / Math.max(totalFrames - 1, 1); // 0=inner, 1=outer
    const freq = 220 + norm * 560;                               // 220–780 Hz
    const vol  = Math.min(0.3, 0.08 + velocity * 0.015);
    this._tone('triangle', freq, vol, t, 0.002, t + 0.065);
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
