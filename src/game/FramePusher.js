import { Physics } from './Physics.js';
import { Renderer } from './Renderer.js';
import { EventHandler } from './EventHandler.js';

const DOT_SPACING = 20;
const FRAME_THICKNESS = DOT_SPACING;          // 20px — one dot-spacing wide
const GAP = DOT_SPACING;                      // 20px — one dot-spacing gap
const STEP = (FRAME_THICKNESS + GAP) * 2;    // 80px step between frame sizes
const GREEN_SIZE = DOT_SPACING * 2;           // 40px green block
const INNERMOST_FRAME_SIZE = GREEN_SIZE + STEP; // 120px — ensures GAP to green

export class FramePusher {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) throw new Error(`Canvas "${canvasId}" not found`);

    this.config = {
      FRAME_THICKNESS,
      DAMPING: 0.9,
      SPRING_STRENGTH: 0.2,
    };

    this.frames = [];
    this.isRunning = false;
    this.animationId = null;

    // Eye animation state
    this._cursorPos    = null;  // { x, y } — current cursor position
    this._cursorFrames = 0;     // countdown: eyes follow cursor for N frames after last move
    this._bounceFrames = 0;     // countdown: eyes look surprised for N frames

    // Reset state — frames only spring back when explicitly triggered
    this._isResetting = false;

    this.physics = new Physics(this.config);
    this.renderer = new Renderer(this.canvas, this.config);
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

  /**
   * Compute frames so FRAME_THICKNESS = GAP = DOT_SPACING (20px).
   * canvasMax is chosen so the innermost regular frame = 120px, giving
   * an exact 20px gap to the 40px green block.
   * @private
   */
  _createFrames() {
    this.frames = [];

    const rawMax  = Math.max(this.canvas.width, this.canvas.height);
    const nOuter  = Math.ceil((rawMax - INNERMOST_FRAME_SIZE) / STEP);
    const canvasMax = INNERMOST_FRAME_SIZE + nOuter * STEP;

    const baseRestX = Math.round((this.canvas.width  - canvasMax) / 2);
    const baseRestY = Math.round((this.canvas.height - canvasMax) / 2);

    for (let i = 0; i <= nOuter; i++) {
      const size  = canvasMax - i * STEP;
      const restX = baseRestX + i * (STEP / 2); // STEP/2=40, always integer
      const restY = baseRestY + i * (STEP / 2);
      this.frames.push({ x: restX, y: restY, vx: 0, vy: 0,
                         width: size, height: size, restX, restY });
    }

    // Green block (centered)
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
      () => this.physics.stopAllMovement(this.frames),
      null,
      null
    );

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
        // Force reflow so the animation restarts if clicked again mid-spin
        void resetBtn.offsetWidth;
        resetBtn.classList.add('spinning');
        resetBtn.addEventListener('animationend', () => {
          resetBtn.classList.remove('spinning');
        }, { once: true });
        this._isResetting = true;
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
    } else if (this._isResetting) {
      this.physics.updateSettlingPhysics(this.frames);

      // Velocity spike → surprise eyes during the bounce-back
      const maxV = Math.max(...this.frames.map(f => Math.hypot(f.vx, f.vy)));
      if (maxV > 3) this._bounceFrames = 50;

      // Finished settling — snap to exact rest and stop
      const settled = this.frames.every(
        f => Math.hypot(f.vx, f.vy) < 0.1 &&
             Math.hypot(f.x - f.restX, f.y - f.restY) < 0.5
      );
      if (settled) {
        for (const f of this.frames) { f.x = f.restX; f.y = f.restY; f.vx = 0; f.vy = 0; }
        this._isResetting = false;
      }
    }
    // else: not dragging, not resetting — frames stay where they are
  }

  _render() {
    // Tick eye timers
    if (this._cursorFrames > 0) this._cursorFrames--;
    else this._cursorPos = null;
    if (this._bounceFrames > 0) this._bounceFrames--;

    const green = this.frames[this.frames.length - 1];
    const gcx = green.x + green.width  / 2;
    const gcy = green.y + green.height / 2;

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
