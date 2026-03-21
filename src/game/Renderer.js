export class Renderer {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.FRAME_THICKNESS = config.FRAME_THICKNESS;
    this.backgroundDots = [];
  }

  /**
   * Generate dot grid aligned to frame border centerlines.
   * The outermost frame's left/top border center becomes the grid origin,
   * so dots fall exactly in the center of every frame band and every gap.
   * @param {Array} frames
   */
  generateBackground(frames) {
    this.backgroundDots = [];
    if (!frames || frames.length === 0) return;

    const DOT_SPACING = 20;
    const dotRadius = 9;
    const half = DOT_SPACING / 2; // 10 — half frame thickness

    // Grid origin = outermost frame border centerline
    const originX = frames[0].restX + half;
    const originY = frames[0].restY + half;

    // Map origin into [0, DOT_SPACING) then extend left/up by one spacing for edge coverage
    const startX = ((originX % DOT_SPACING) + DOT_SPACING) % DOT_SPACING;
    const startY = ((originY % DOT_SPACING) + DOT_SPACING) % DOT_SPACING;
    const xBegin = startX > 0 ? startX - DOT_SPACING : startX;
    const yBegin = startY > 0 ? startY - DOT_SPACING : startY;

    for (let x = xBegin; x <= this.canvas.width; x += DOT_SPACING) {
      for (let y = yBegin; y <= this.canvas.height; y += DOT_SPACING) {
        const hue = Math.random() * 360;
        this.backgroundDots.push({
          x,
          y,
          radius: dotRadius,
          //color: `hsl(${hue}, 100%, 70%)`,
          color: `rgb(255,255,255)`,
        });
      }
    }
  }

  /**
   * Draw complete scene
   * @param {Array}   frames
   * @param {boolean} isDragging
   */
  drawScene(frames, isDragging) {
    this._clearCanvas();
    this._drawBackground(frames[frames.length - 1]);
    this._drawFrames(frames, isDragging);
  }

  _clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw dots with a white reflection glint toward the green block center.
   * @param {Object} greenBlock
   * @private
   */
  _drawBackground(greenBlock) {
    const gcx = greenBlock.x + greenBlock.width / 2;
    const gcy = greenBlock.y + greenBlock.height / 2;

    for (const dot of this.backgroundDots) {
      // Colored dot
      this.ctx.beginPath();
      this.ctx.fillStyle = dot.color;
      this.ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // White glint offset toward green block center
      const dx = gcx - dot.x;
      const dy = gcy - dot.y;
      const dist = Math.hypot(dx, dy) || 1;
      const glintX = dot.x + (dx / dist) * 6;
      const glintY = dot.y + (dy / dist) * 6;

      this.ctx.beginPath();
      //this.ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
      this.ctx.fillStyle = `rgb(0,0,0)`;
      this.ctx.arc(glintX, glintY, dot.radius * 0.2, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  _drawFrames(frames, isDragging) {
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
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
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = this.FRAME_THICKNESS;
    this.ctx.shadowColor = "rgba(0,0,0,0.2)";
    this.ctx.shadowBlur = 15;
    this.ctx.shadowOffsetY = 5;

    const half = this.FRAME_THICKNESS / 2;
    this.ctx.strokeRect(
      half,
      half,
      frame.width - this.FRAME_THICKNESS,
      frame.height - this.FRAME_THICKNESS,
    );
  }

  _drawGreenBlock(frame, isDragging) {
    this.ctx.fillStyle = isDragging ? "#66bb6a" : "#43a047";
    this.ctx.shadowColor = "rgba(0,0,0,0.3)";
    this.ctx.shadowBlur = 15;
    this.ctx.shadowOffsetY = 5;
    this.ctx.fillRect(0, 0, frame.width, frame.height);
  }

  /** Resize canvas only — caller must regenerate background after frames are rebuilt */
  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  getDimensions() {
    return { width: this.canvas.width, height: this.canvas.height };
  }
}
