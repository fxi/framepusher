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
          peekAtCursor: false,
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
          eye.state         = 'peek';
          eye.stateFrames   = 30 + Math.floor(Math.random() * 30);
          eye.peekCountdown = 180 + Math.floor(Math.random() * 300);
          // 35% chance to glance at cursor instead of green block
          eye.peekAtCursor  = cursorPos !== null && Math.random() < 0.35;
        }
      }

      // --- Compute look target ---
      let tx = eye.x, ty = eye.y; // idle: pupils centered
      if (eye.state === 'surprised') {
        tx = greenCx; ty = greenCy;
      } else if (eye.state === 'peek') {
        if (eye.peekAtCursor && cursorPos) {
          tx = cursorPos.x; ty = cursorPos.y;
        } else {
          tx = greenCx; ty = greenCy;
        }
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
   * @param {boolean} isDarkMode
   */
  drawScene(frames, isDragging, isDarkMode) {
    this._clearCanvas();
    this._drawBackground(isDarkMode);
    this._drawFrames(frames, isDragging, isDarkMode);
  }

  _clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw all eyes using their current pupil positions (updated by updateEyes).
   * @private
   */
  _drawBackground(isDarkMode) {
    // Reset shadows carried over from previous frame's frame-drawing pass
    this.ctx.shadowColor   = 'transparent';
    this.ctx.shadowBlur    = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;

    for (const eye of this.backgroundDots) {
      // Eyeball — same design as light mode, just dimmed in dark mode
      this.ctx.beginPath();
      this.ctx.fillStyle = isDarkMode ? 'rgba(255,255,255,0.5)' : '#ffffff';
      this.ctx.arc(eye.x, eye.y, eye.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Pupil
      this.ctx.beginPath();
      this.ctx.fillStyle = isDarkMode ? '#111111' : '#000000';
      this.ctx.arc(eye.pupilX, eye.pupilY, eye.radius * 0.35, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  _drawFrames(frames, isDragging, isDarkMode) {
    for (let i = 0; i < frames.length; i++) {
      const frame       = frames[i];
      const isLastFrame = i === frames.length - 1;

      this.ctx.save();
      this.ctx.translate(frame.x, frame.y);

      if (isLastFrame) {
        this._drawGreenBlock(frame, isDragging, isDarkMode);
      } else {
        this._drawFrameBorder(frame, isDarkMode);
      }

      this.ctx.restore();
    }
  }

  _drawFrameBorder(frame, isDarkMode) {
    this.ctx.lineWidth = this.FRAME_THICKNESS;
    const half = this.FRAME_THICKNESS / 2;
    const w    = frame.width  - this.FRAME_THICKNESS;
    const h    = frame.height - this.FRAME_THICKNESS;

    if (isDarkMode) {
      this.ctx.strokeStyle   = '#444444';
      this.ctx.shadowColor   = 'rgba(0,0,0,0.8)';
      this.ctx.shadowBlur    = 8;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
    } else {
      this.ctx.strokeStyle   = '#fcfcfa';
      this.ctx.shadowColor   = 'rgba(0,0,0,0.2)';
      this.ctx.shadowBlur    = 15;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 5;
    }
    this.ctx.strokeRect(half, half, w, h);
  }

  _drawGreenBlock(frame, isDragging, isDarkMode) {
    this.ctx.fillStyle = isDragging ? '#66bb6a' : '#43a047';
    if (isDarkMode) {
      this.ctx.shadowColor   = 'rgba(0,0,0,0.8)';
      this.ctx.shadowBlur    = 8;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
    } else {
      this.ctx.shadowColor   = 'rgba(0,0,0,0.3)';
      this.ctx.shadowBlur    = 15;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 5;
    }
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
