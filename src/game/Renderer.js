/**
 * Renderer for the FramePusher game
 * Handles all canvas drawing operations including background and frames
 */
export class Renderer {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.FRAME_THICKNESS = config.FRAME_THICKNESS;
    this.backgroundDots = [];
  }

  /**
   * Generates the background dot pattern
   * Creates a grid of colorful dots with random hues
   */
  generateBackground() {
    this.backgroundDots = [];
    const dotRadius = 4;
    const dotSpacing = 20;

    // Generate dots using nested for loops for precise control
    for (let x = 0; x < this.canvas.width; x += dotSpacing) {
      for (let y = 0; y < this.canvas.height; y += dotSpacing) {
        const hue = Math.random() * 360;
        
        this.backgroundDots.push({
          x: x,
          y: y,
          radius: dotRadius,
          color: `hsl(${hue}, 100%, 70%)`,
        });
      }
    }
  }

  /**
   * Draws the complete scene including background and frames
   * @param {Array} frames - Array of frame objects to render
   * @param {boolean} isDragging - Current dragging state
   */
  drawScene(frames, isDragging) {
    this._clearCanvas();
    this._drawBackground();
    this._drawFrames(frames, isDragging);
  }

  /**
   * Clears the entire canvas
   * @private
   */
  _clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draws the background dot pattern
   * Uses for...of loop for clean iteration
   * @private
   */
  _drawBackground() {
    for (const dot of this.backgroundDots) {
      this.ctx.beginPath();
      this.ctx.fillStyle = dot.color;
      this.ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  /**
   * Draws all frames with proper styling and shadows
   * Uses for loop for index-based rendering logic
   * @param {Array} frames - Array of frame objects
   * @param {boolean} isDragging - Current dragging state
   * @private
   */
  _drawFrames(frames, isDragging) {
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const isLastFrame = i === frames.length - 1;

      this.ctx.save();
      this.ctx.translate(frame.x, frame.y);

      if (isLastFrame) {
        this._drawDraggableSquare(frame, isDragging);
      } else {
        this._drawFrameBorder(frame);
      }

      this.ctx.restore();
    }
  }

  /**
   * Draws a frame border (hollow rectangle with shadow)
   * @param {Object} frame - Frame object with dimensions
   * @private
   */
  _drawFrameBorder(frame) {
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = this.FRAME_THICKNESS;
    this.ctx.shadowColor = 'rgba(0,0,0,0.2)';
    this.ctx.shadowBlur = 15;
    this.ctx.shadowOffsetY = 5;

    const halfThickness = this.FRAME_THICKNESS / 2;
    const adjustedWidth = frame.width - this.FRAME_THICKNESS;
    const adjustedHeight = frame.height - this.FRAME_THICKNESS;

    this.ctx.strokeRect(
      halfThickness,
      halfThickness,
      adjustedWidth,
      adjustedHeight
    );
  }

  /**
   * Draws the draggable square (solid rectangle with shadow)
   * @param {Object} frame - Frame object with dimensions
   * @param {boolean} isDragging - Current dragging state
   * @private
   */
  _drawDraggableSquare(frame, isDragging) {
    this.ctx.fillStyle = isDragging ? '#66bb6a' : '#43a047';
    this.ctx.shadowColor = 'rgba(0,0,0,0.3)';
    this.ctx.shadowBlur = 15;
    this.ctx.shadowOffsetY = 5;

    this.ctx.fillRect(0, 0, frame.width, frame.height);
  }

  /**
   * Updates canvas size and regenerates background
   * @param {number} width - New canvas width
   * @param {number} height - New canvas height
   */
  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.generateBackground();
  }

  /**
   * Gets the current canvas dimensions
   * @returns {Object} Object with width and height properties
   */
  getDimensions() {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }
}
