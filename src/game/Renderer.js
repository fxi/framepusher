export class Renderer {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.FRAME_THICKNESS = config.FRAME_THICKNESS;
    this.backgroundDots = [];
  }

  /**
   * Generate eye grid aligned to frame border centerlines.
   * Each eye is an independent entity with its own look state.
   * @param {Array} frames
   */
  generateBackground(frames) {
    this.backgroundDots = [];
    if (!frames || frames.length === 0) return;

    const DOT_SPACING = 20;
    const dotRadius   = 9;
    const half        = DOT_SPACING / 2;

    // Grid origin = outermost frame border centerline
    const originX = frames[0].restX + half;
    const originY = frames[0].restY + half;

    const startX = ((originX % DOT_SPACING) + DOT_SPACING) % DOT_SPACING;
    const startY = ((originY % DOT_SPACING) + DOT_SPACING) % DOT_SPACING;
    const xBegin = startX > 0 ? startX - DOT_SPACING : startX;
    const yBegin = startY > 0 ? startY - DOT_SPACING : startY;

    for (let x = xBegin; x <= this.canvas.width; x += DOT_SPACING) {
      for (let y = yBegin; y <= this.canvas.height; y += DOT_SPACING) {
        this.backgroundDots.push({
          x, y,
          radius: dotRadius,
          pupilX: x, pupilY: y,        // start centered
          state: 'idle',
          stateFrames: 0,
          peekCountdown: Math.floor(180 + Math.random() * 300), // 3–8 s stagger
        });
      }
    }
  }

  /**
   * Update every eye's state machine and lerp pupils toward their targets.
   * Called once per frame before drawScene.
   *
   * States (priority high→low): surprised > cursor > peek > idle
   *   idle      — pupil centered, blank stare
   *   peek      — individual random glance at green block
   *   cursor    — all eyes follow cursor (global)
   *   surprised — all eyes snap to green block on bounce (global)
   *
   * @param {{ x: number, y: number }|null} cursorPos  null when cursor is idle
   * @param {number} greenCx  green block center x
   * @param {number} greenCy  green block center y
   * @param {boolean} isBouncing  true during a velocity spike
   */
  updateEyes(cursorPos, greenCx, greenCy, isBouncing) {
    for (const eye of this.backgroundDots) {
      // --- Global overrides (highest priority) ---
      if (isBouncing) {
        eye.state      = 'surprised';
        eye.stateFrames = 50;
      } else if (cursorPos && eye.state !== 'surprised') {
        eye.state      = 'cursor';
        eye.stateFrames = 60;
      }

      // --- Tick state timer ---
      if (eye.stateFrames > 0) {
        eye.stateFrames--;
      } else if (eye.state !== 'idle') {
        eye.state = 'idle';
      }

      // --- Per-eye random peek (only while idle) ---
      if (eye.state === 'idle') {
        eye.peekCountdown--;
        if (eye.peekCountdown <= 0) {
          eye.state       = 'peek';
          eye.stateFrames = 30 + Math.floor(Math.random() * 30);
          eye.peekCountdown = 180 + Math.floor(Math.random() * 300);
        }
      }

      // --- Compute look target ---
      let tx = eye.x, ty = eye.y; // idle: pupils centered
      if (eye.state === 'peek' || eye.state === 'surprised') {
        tx = greenCx; ty = greenCy;
      } else if (eye.state === 'cursor' && cursorPos) {
        tx = cursorPos.x; ty = cursorPos.y;
      }

      // --- Desired pupil offset (clamped to radius * 0.5) ---
      const dx   = tx - eye.x;
      const dy   = ty - eye.y;
      const dist = Math.hypot(dx, dy) || 1;
      const maxOff = eye.radius * 0.5;
      const off    = eye.state === 'idle' ? 0 : Math.min(dist, maxOff);
      const tpx = eye.x + (dx / dist) * off;
      const tpy = eye.y + (dy / dist) * off;

      // --- Lerp pupil toward target ---
      eye.pupilX += (tpx - eye.pupilX) * 0.12;
      eye.pupilY += (tpy - eye.pupilY) * 0.12;
    }
  }

  /**
   * Draw complete scene
   * @param {Array}   frames
   * @param {boolean} isDragging
   */
  drawScene(frames, isDragging) {
    this._clearCanvas();
    this._drawBackground();
    this._drawFrames(frames, isDragging);
  }

  _clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw all eyes using their current pupil positions (updated by updateEyes).
   * @private
   */
  _drawBackground() {
    for (const eye of this.backgroundDots) {
      // White eyeball
      this.ctx.beginPath();
      this.ctx.fillStyle = '#ffffff';
      this.ctx.arc(eye.x, eye.y, eye.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Black pupil
      this.ctx.beginPath();
      this.ctx.fillStyle = '#000000';
      this.ctx.arc(eye.pupilX, eye.pupilY, eye.radius * 0.35, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  _drawFrames(frames, isDragging) {
    for (let i = 0; i < frames.length; i++) {
      const frame       = frames[i];
      const isLastFrame = i === frames.length - 1;

      this.ctx.save();
      this.ctx.translate(frame.x, frame.y);

      if (isLastFrame) {
        this._drawGreenBlock(frame, isDragging);
      } else {
        this._drawFrameBorder(frame);
      }

      this.ctx.restore();
    }
  }

  _drawFrameBorder(frame) {
    this.ctx.strokeStyle   = '#ffffff';
    this.ctx.lineWidth     = this.FRAME_THICKNESS;
    this.ctx.shadowColor   = 'rgba(0,0,0,0.2)';
    this.ctx.shadowBlur    = 15;
    this.ctx.shadowOffsetY = 5;

    const half = this.FRAME_THICKNESS / 2;
    this.ctx.strokeRect(half, half,
                        frame.width  - this.FRAME_THICKNESS,
                        frame.height - this.FRAME_THICKNESS);
  }

  _drawGreenBlock(frame, isDragging) {
    this.ctx.fillStyle     = isDragging ? '#66bb6a' : '#43a047';
    this.ctx.shadowColor   = 'rgba(0,0,0,0.3)';
    this.ctx.shadowBlur    = 15;
    this.ctx.shadowOffsetY = 5;
    this.ctx.fillRect(0, 0, frame.width, frame.height);
  }

  /** Resize canvas only — caller must regenerate background after frames are rebuilt */
  resize(width, height) {
    this.canvas.width  = width;
    this.canvas.height = height;
  }

  getDimensions() {
    return { width: this.canvas.width, height: this.canvas.height };
  }
}
