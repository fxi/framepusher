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

    // Reset state
    this._isResetting = false;

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
        this.audio.playGrab(dragIndex, this.frames.length);
      },
      null,
      () => {
        this._activeContacts.clear();
      }
    );

    // Unlock audio on first pointer interaction (required by browsers)
    const unlock = () => {
      this.audio.unlock();
      this.canvas.removeEventListener('pointerdown', unlock);
    };
    this.canvas.addEventListener('pointerdown', unlock);

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
        this._isResetting = true;
        this.audio.playReset();
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

    } else if (this._isResetting) {
      this.physics.updateSettlingPhysics(this.frames);

      const maxV = Math.max(...this.frames.map(f => Math.hypot(f.vx, f.vy)));
      if (maxV > 3) this._bounceFrames = 50;

      const settled = this.frames.every(
        f => Math.hypot(f.vx, f.vy) < 0.1 &&
             Math.hypot(f.x - f.restX, f.y - f.restY) < 0.5
      );
      if (settled) {
        for (const f of this.frames) { f.x = f.restX; f.y = f.restY; f.vx = 0; f.vy = 0; }
        this._isResetting = false;
        this.audio.playSettle();
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
    this.renderer.drawScene(this.frames, this.eventHandler.isDragging());
  }

  resize(width, height) {
    this._resizeCanvas(width, height);
    this._createFrames();
    this.renderer.generateBackground(this.frames);
  }
}
