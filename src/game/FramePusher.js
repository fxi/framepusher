import { Physics }      from './Physics.js';
import { Renderer }     from './Renderer.js';
import { EventHandler } from './EventHandler.js';
import { AudioManager } from './AudioManager.js';

const DOT_SPACING         = 20;
const FRAME_THICKNESS     = DOT_SPACING;
const GAP                 = DOT_SPACING;
const STEP                = (FRAME_THICKNESS + GAP) * 2;  // 80
const GREEN_SIZE          = DOT_SPACING * 2;              // 40
const INNERMOST_FRAME_SIZE = GREEN_SIZE + STEP;           // 120

export class FramePusher {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) throw new Error(`Canvas "${canvasId}" not found`);

    this.config = {
      FRAME_THICKNESS,
      DAMPING:        0.9,
      SPRING_STRENGTH: 0.2,
    };

    this.frames       = [];
    this.isRunning    = false;
    this.animationId  = null;

    // Eye animation state
    this._cursorPos    = null;
    this._cursorFrames = 0;
    this._bounceFrames = 0;

    // Sequential reset state
    this._resetSeqActive = false;
    this._resetSeqStep   = 0;
    this._resetSeqLocked = new Set();

    // Intro wave state (frames drop in from above on play tap)
    this._waveActive   = false;
    this._waveReleased = 0;
    this._waveTimer    = 0;

    // Coasting state (billiard inertia after release)
    this._isCoasting    = false;
    this._lastDragIndex = -1;

    // Dark mode state
    this.isDarkMode = false;

    // Collision detection: "idx-side" → countdown frames until contact expires
    this._activeContacts = new Map();

    this.physics      = new Physics(this.config);
    this.renderer     = new Renderer(this.canvas, this.config);
    this.audio        = new AudioManager();
    this.eventHandler = null;

    this._resizeCanvas(window.innerWidth, window.innerHeight);
    this._createFrames();
    this._initializeEventHandler();
  }

  init() {
    this.renderer.generateBackground(this.frames);
    // Park all frames above the canvas — wave drops them in when play is tapped
    for (const f of this.frames) { f.y = -f.height - 20; f.vy = 0; }
    this.start();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this._animate();
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  destroy() {
    this.stop();
    if (this.eventHandler) this.eventHandler.destroy();
  }

  _resizeCanvas(width, height) {
    this.canvas.width  = width;
    this.canvas.height = height;
  }

  _createFrames() {
    this.frames = [];

    const rawMax    = Math.max(this.canvas.width, this.canvas.height);
    const nOuter    = Math.ceil((rawMax - INNERMOST_FRAME_SIZE) / STEP);
    const canvasMax = INNERMOST_FRAME_SIZE + nOuter * STEP;

    const baseRestX = Math.round((this.canvas.width  - canvasMax) / 2);
    const baseRestY = Math.round((this.canvas.height - canvasMax) / 2);

    for (let i = 0; i <= nOuter; i++) {
      const size  = canvasMax - i * STEP;
      const restX = baseRestX + i * (STEP / 2);
      const restY = baseRestY + i * (STEP / 2);
      this.frames.push({ x: restX, y: restY, vx: 0, vy: 0,
                         width: size, height: size, restX, restY });
    }

    const gRestX = Math.round((this.canvas.width  - GREEN_SIZE) / 2);
    const gRestY = Math.round((this.canvas.height - GREEN_SIZE) / 2);
    this.frames.push({ x: gRestX, y: gRestY, vx: 0, vy: 0,
                       width: GREEN_SIZE, height: GREEN_SIZE,
                       restX: gRestX, restY: gRestY });

    if (this.eventHandler) this.eventHandler.setFrames(this.frames);
  }

  _initializeEventHandler() {
    this.eventHandler = new EventHandler(this.canvas, this.frames, FRAME_THICKNESS);
    this.eventHandler.setDragCallbacks(
      (dragIndex) => {
        this.physics.stopAllMovement(this.frames);
        this._activeContacts.clear();
        this._waveActive     = false;
        this._isCoasting     = false;
        this._resetSeqActive = false; // user takes over — cancel sequence
        this._resetSeqLocked.clear();
        this._lastDragIndex  = dragIndex;
        this.audio.playGrab(dragIndex, this.frames.length);
      },
      null,
      () => {
        this._activeContacts.clear();

        // Zero outer-frame velocities accumulated by push mechanics during drag
        // (they would otherwise fire independently and cause chaos)
        for (let i = 0; i < this._lastDragIndex; i++) {
          this.frames[i].vx = 0;
          this.frames[i].vy = 0;
        }

        // Inject cursor velocity into released frame + inner frames
        const vel   = this.eventHandler.getDragVelocity();
        const speed = Math.hypot(vel.x, vel.y);
        if (speed > 0.5) {
          const MAX_VEL = 10; // px/frame — controlled, not chaotic
          const scale   = Math.min(1, MAX_VEL / speed);
          const vx = vel.x * scale;
          const vy = vel.y * scale;
          for (let i = this._lastDragIndex; i < this.frames.length; i++) {
            this.frames[i].vx = vx;
            this.frames[i].vy = vy;
          }
          this._isCoasting = true;
        }
      }
    );

    // Play overlay — dismiss on first tap/click, unlock audio context
    const audioStartBtn = document.getElementById('audio-start');
    if (audioStartBtn) {
      audioStartBtn.addEventListener('pointerdown', () => {
        this.audio.unlock()
        this.audio.playStart();
        audioStartBtn.classList.add('hidden');
        audioStartBtn.addEventListener('transitionend',
          () => audioStartBtn.remove(), { once: true });
        // Launch intro wave
        this._waveActive   = true;
        this._waveReleased = 0;
        this._waveTimer    = 0;
      }, { once: true });
    }

    // Unlock/resume audio on every subsequent pointer interaction — iOS suspends the
    // AudioContext on page hide and needs resume() on the next user gesture.
    this.canvas.addEventListener('pointerdown', () => this.audio.unlock());

    // Cursor tracking — eyes follow pointer / touch
    this.canvas.addEventListener('mousemove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      this._cursorPos    = { x: e.clientX - r.left, y: e.clientY - r.top };
      this._cursorFrames = 60;
    });
    this.canvas.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      const r = this.canvas.getBoundingClientRect();
      this._cursorPos    = { x: t.clientX - r.left, y: t.clientY - r.top };
      this._cursorFrames = 60;
    }, { passive: true });

    // Reset button
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        resetBtn.classList.remove('spinning');
        void resetBtn.offsetWidth;
        resetBtn.classList.add('spinning');
        resetBtn.addEventListener('animationend', () => {
          resetBtn.classList.remove('spinning');
        }, { once: true });
        this._waveActive     = false;
        this._isCoasting     = false;
        this._resetSeqActive = true;
        this._resetSeqStep   = 0;
        this._resetSeqLocked = new Set();
      });
    }

    // Dark mode toggle button
    const darkBtn = document.getElementById('dark-btn');
    if (darkBtn) {
      darkBtn.addEventListener('click', () => {
        this.isDarkMode = !this.isDarkMode;
        document.body.classList.toggle('dark-mode', this.isDarkMode);
      });
    }
  }

  _animate() {
    if (!this.isRunning) return;
    this._updatePhysics();
    this._render();
    this.animationId = requestAnimationFrame(this._animate.bind(this));
  }

  _updatePhysics() {
    if (this._waveActive) {
      // Release one frame every 8 ticks, outer first
      if (--this._waveTimer <= 0 && this._waveReleased < this.frames.length) {
        this._waveReleased++;
        this._waveTimer = 8;
      }
      // Gravity-fall each released frame until it lands at restY
      let allLanded = this._waveReleased >= this.frames.length;
      for (let i = 0; i < this._waveReleased; i++) {
        const f = this.frames[i];
        if (f.y >= f.restY) { f.y = f.restY; f.vy = 0; continue; }
        allLanded = false;
        f.vy = Math.min(f.vy + 1.5, 25);
        f.y += f.vy;
        if (f.y >= f.restY) {
          f.y = f.restY; f.vy = 0;
          this.audio.playCollision(i, this.frames.length, 20);
          this._bounceFrames = 12;
        }
      }
      if (allLanded) this._waveActive = false;
      return;
    }

    if (this.eventHandler.isDragging()) {
      this.physics.updateDragPhysics(this.frames, this.eventHandler.getDraggedIndex());

      // Debounce per frame index (not per side) — prevents re-trigger when the
      // same frame alternates contact sides (e.g. -T vs -B during vertical drag)
      const contacted   = new Set(this.physics.pushedContacts.map(c => parseInt(c)));
      const newFrames   = [...contacted].filter(i => !this._activeContacts.has(i));
      if (newFrames.length > 0) {
        const outermost = Math.min(...newFrames);
        const vel = Math.hypot(this.frames[outermost].vx, this.frames[outermost].vy);
        this.audio.playCollision(outermost, this.frames.length, vel);
      }
      for (const i of contacted) this._activeContacts.set(i, 8);
      for (const [i, n] of this._activeContacts) {
        if (n <= 1) this._activeContacts.delete(i);
        else        this._activeContacts.set(i, n - 1);
      }

    } else if (this._resetSeqActive) {
      const step  = this._resetSeqStep;
      // Speed increases with each step: outer frames slow, inner frames fast
      const SPEED = Math.min(8 + step * 3, 30);
      const T     = this.config.FRAME_THICKNESS;

      // 1. Pin already-placed frames
      for (const idx of this._resetSeqLocked) {
        const f = this.frames[idx];
        f.x = f.restX; f.y = f.restY; f.vx = 0; f.vy = 0;
      }

      // 2. Let non-current inner frames coast from previous pushes
      for (let j = step + 1; j < this.frames.length; j++) {
        if (this._resetSeqLocked.has(j)) continue;
        this.frames[j].x += this.frames[j].vx;
        this.frames[j].y += this.frames[j].vy;
        this.frames[j].vx *= this.config.DAMPING;
        this.frames[j].vy *= this.config.DAMPING;
      }

      // 3. Move current frame linearly toward rest
      if (step < this.frames.length) {
        const frame = this.frames[step];
        const dx    = frame.restX - frame.x;
        const dy    = frame.restY - frame.y;
        const dist  = Math.hypot(dx, dy);

        if (dist <= SPEED) {
          frame.x = frame.restX; frame.y = frame.restY; frame.vx = 0; frame.vy = 0;
          this.audio.playCollision(step, this.frames.length, SPEED);
          this._bounceFrames = 15;
          this._resetSeqLocked.add(step);
          this._resetSeqStep++;
          if (this._resetSeqStep >= this.frames.length) this._resetSeqActive = false;
        } else {
          frame.x += (dx / dist) * SPEED;
          frame.y += (dy / dist) * SPEED;
          frame.vx = (dx / dist) * SPEED;
          frame.vy = (dy / dist) * SPEED;
        }
      }

      // 4. Outer-pushes-inner: each frame constrains the one inside it.
      //    Iterating j in order cascades the push in one tick:
      //    step pushes step+1 → step+1 (updated) pushes step+2, etc.
      for (let j = step + 1; j < this.frames.length; j++) {
        if (this._resetSeqLocked.has(j)) continue;
        const outer = this.frames[j - 1];
        const inner = this.frames[j];

        const minX = outer.x + T;
        const maxX = outer.x + outer.width  - T - inner.width;
        const minY = outer.y + T;
        const maxY = outer.y + outer.height - T - inner.height;
        let hit = false;

        if (inner.x < minX) { inner.vx += (minX - inner.x) * 0.5; inner.x = minX; hit = true; }
        if (inner.x > maxX) { inner.vx -= (inner.x - maxX) * 0.5; inner.x = maxX; hit = true; }
        if (inner.y < minY) { inner.vy += (minY - inner.y) * 0.5; inner.y = minY; hit = true; }
        if (inner.y > maxY) { inner.vy -= (inner.y - maxY) * 0.5; inner.y = maxY; hit = true; }

        if (hit) {
          this.audio.playCollision(j, this.frames.length, Math.hypot(inner.vx, inner.vy));
          this._bounceFrames = 20;
        }
      }

    } else if (this._isCoasting) {
      // Integrate velocities for all frames
      for (const frame of this.frames) {
        frame.x  += frame.vx;
        frame.y  += frame.vy;
        frame.vx *= this.config.DAMPING;
        frame.vy *= this.config.DAMPING;
      }

      // Collision: sliding inner group pushes outer frames — chain reaction
      this.physics.updateDragPhysics(this.frames, this._lastDragIndex);

      // Audio on chain collision
      const contacted = new Set(this.physics.pushedContacts.map(c => parseInt(c)));
      const newFrames = [...contacted].filter(i => !this._activeContacts.has(i));
      if (newFrames.length > 0) {
        const outermost = Math.min(...newFrames);
        const vel = Math.hypot(this.frames[outermost].vx, this.frames[outermost].vy);
        this.audio.playCollision(outermost, this.frames.length, vel);
      }
      for (const i of contacted) this._activeContacts.set(i, 8);
      for (const [i, n] of this._activeContacts) {
        if (n <= 1) this._activeContacts.delete(i);
        else        this._activeContacts.set(i, n - 1);
      }

      let maxV = 0;
      for (const frame of this.frames) maxV = Math.max(maxV, Math.hypot(frame.vx, frame.vy));
      if (maxV > 3) this._bounceFrames = 50;
      if (maxV < 0.5) {
        for (const f of this.frames) { f.vx = 0; f.vy = 0; }
        this._isCoasting = false;
      }
    }
  }

  _render() {
    if (this._cursorFrames > 0) this._cursorFrames--;
    else this._cursorPos = null;
    if (this._bounceFrames > 0) this._bounceFrames--;

    const green = this.frames[this.frames.length - 1];
    const gcx   = green.x + green.width  / 2;
    const gcy   = green.y + green.height / 2;

    this.renderer.updateEyes(
      this._cursorFrames > 0 ? this._cursorPos : null,
      gcx, gcy,
      this._bounceFrames > 0
    );
    this.renderer.drawScene(this.frames, this.eventHandler.isDragging(), this.isDarkMode);
  }

  resize(width, height) {
    this._waveActive = false;
    this._resizeCanvas(width, height);
    this._createFrames();
    this.renderer.generateBackground(this.frames);
  }
}
