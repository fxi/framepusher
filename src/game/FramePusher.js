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

  /**
   * Resize canvas only (no background gen — that comes after _createFrames)
   * @private
   */
  _resizeCanvas(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * Compute frames so:
   *  - FRAME_THICKNESS = GAP = DOT_SPACING (20px)
   *  - canvasMax chosen so innermost regular frame = 120px → exact 20px gap to green
   *  - All frame positions derived as integers from canvasMax
   * @private
   */
  _createFrames() {
    this.frames = [];

    const rawMax = Math.max(this.canvas.width, this.canvas.height);
    const nOuter = Math.ceil((rawMax - INNERMOST_FRAME_SIZE) / STEP);
    const canvasMax = INNERMOST_FRAME_SIZE + nOuter * STEP;

    // Base rest position (integer via Math.round; ≤0.5px off for odd-parity screens)
    const baseRestX = Math.round((this.canvas.width  - canvasMax) / 2);
    const baseRestY = Math.round((this.canvas.height - canvasMax) / 2);

    // Regular frames: canvasMax … 120, stepping by STEP=80
    for (let i = 0; i <= nOuter; i++) {
      const size  = canvasMax - i * STEP;
      const restX = baseRestX + i * (STEP / 2);  // STEP/2=40, always integer
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
    } else {
      this.physics.updateSettlingPhysics(this.frames);
    }
  }

  _render() {
    this.renderer.drawScene(this.frames, this.eventHandler.isDragging());
  }

  resize(width, height) {
    this._resizeCanvas(width, height);
    this._createFrames();
    this.renderer.generateBackground(this.frames);
  }
}
