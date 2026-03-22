/**
 * Event handler for the FramePusher game
 * Manages mouse/touch interactions and drag operations for any frame
 */
export class EventHandler {
  constructor(canvas, frames, frameThickness) {
    this.canvas = canvas;
    this.frames = frames;
    this.frameThickness = frameThickness;

    this.dragInfo = {
      isDragging: false,
      draggedIndex: -1,
      offsetX: 0,
      offsetY: 0,
    };

    this.onDragStart = null;
    this.onDragEnd = null;
    this.onDragMove = null;

    this._dragVelocity = { x: 0, y: 0 };
    this._lastDragPos  = null;

    this._bindEvents();
  }

  /**
   * Binds all mouse and touch event listeners to the canvas and window
   * @private
   */
  _bindEvents() {
    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onTouchStart = this._handleTouchStart.bind(this);
    this._onTouchMove = this._handleTouchMove.bind(this);
    this._onTouchEnd = this._handleTouchEnd.bind(this);

    this.canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);

    this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    window.addEventListener('touchmove', this._onTouchMove, { passive: false });
    window.addEventListener('touchend', this._onTouchEnd);
    window.addEventListener('touchcancel', this._onTouchEnd);
  }

  /**
   * Removes all event listeners
   */
  destroy() {
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);

    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    window.removeEventListener('touchmove', this._onTouchMove);
    window.removeEventListener('touchend', this._onTouchEnd);
    window.removeEventListener('touchcancel', this._onTouchEnd);
  }

  /**
   * Sets callback functions for drag events
   */
  setDragCallbacks(onDragStart, onDragMove, onDragEnd) {
    this.onDragStart = onDragStart;
    this.onDragMove = onDragMove;
    this.onDragEnd = onDragEnd;
  }

  /**
   * Updates the frames array reference (called after frame recreation)
   */
  setFrames(frames) {
    this.frames = frames;
  }

  /**
   * Gets the current dragging state
   * @returns {boolean}
   */
  isDragging() {
    return this.dragInfo.isDragging;
  }

  /**
   * Gets the index of the currently dragged frame, or -1 if not dragging
   * @returns {number}
   */
  getDraggedIndex() {
    return this.dragInfo.draggedIndex;
  }

  // ─── Mouse events ─────────────────────────────────────────────────────────

  _handleMouseDown(event) {
    const position = this._getMousePosition(event);
    this._handleDragStart(event, position);
  }

  _handleMouseMove(event) {
    if (!this.dragInfo.isDragging) return;
    const position = this._getMousePosition(event);
    this._handleDragMove(position);
  }

  _handleMouseUp() {
    this._handleDragEnd();
  }

  _getMousePosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  // ─── Touch events ──────────────────────────────────────────────────────────

  _handleTouchStart(event) {
    event.preventDefault();
    const touch = event.touches[0];
    if (!touch) return;
    const position = this._getTouchPosition(touch);
    this._handleDragStart(event, position);
  }

  _handleTouchMove(event) {
    if (!this.dragInfo.isDragging) return;
    event.preventDefault();
    const touch = event.touches[0];
    if (!touch) return;
    const position = this._getTouchPosition(touch);
    this._handleDragMove(position);
  }

  _handleTouchEnd() {
    this._handleDragEnd();
  }

  _getTouchPosition(touch) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  // ─── Hit testing ───────────────────────────────────────────────────────────

  /**
   * Checks if a point falls inside a solid (filled) frame
   * @private
   */
  _isPointInFrame(point, frame) {
    return (
      point.x >= frame.x &&
      point.x <= frame.x + frame.width &&
      point.y >= frame.y &&
      point.y <= frame.y + frame.height
    );
  }

  /**
   * Checks if a point falls on the visible border strip of a hollow frame
   * @private
   */
  _isOnFrameBorder(point, frame, thickness) {
    const inOuter = this._isPointInFrame(point, frame);
    if (!inOuter) return false;
    const inInner = (
      point.x > frame.x + thickness &&
      point.x < frame.x + frame.width - thickness &&
      point.y > frame.y + thickness &&
      point.y < frame.y + frame.height - thickness
    );
    return !inInner;
  }

  /**
   * Finds the topmost frame the pointer is over, innermost first.
   * Green block (last frame) uses solid hit-test; others use border hit-test.
   * @returns {number} Frame index, or -1
   * @private
   */
  _findDraggedFrame(position) {
    const lastIdx = this.frames.length - 1;

    // Green block: solid hit-test
    if (this._isPointInFrame(position, this.frames[lastIdx])) {
      return lastIdx;
    }

    // All other frames: border-only hit-test, innermost to outermost
    for (let i = lastIdx - 1; i >= 0; i--) {
      if (this._isOnFrameBorder(position, this.frames[i], this.frameThickness)) {
        return i;
      }
    }

    return -1;
  }

  // ─── Shared drag logic ─────────────────────────────────────────────────────

  _handleDragStart(event, position) {
    const foundIndex = this._findDraggedFrame(position);
    if (foundIndex === -1) return;

    event.preventDefault();

    const frame = this.frames[foundIndex];
    this.dragInfo.isDragging = true;
    this.dragInfo.draggedIndex = foundIndex;
    this.dragInfo.offsetX = position.x - frame.x;
    this.dragInfo.offsetY = position.y - frame.y;

    this._dragVelocity = { x: 0, y: 0 };
    this._lastDragPos  = null;

    this.canvas.style.cursor = 'grabbing';

    if (this.onDragStart) this.onDragStart(foundIndex);
  }

  getDragVelocity() {
    return { ...this._dragVelocity };
  }

  _handleDragMove(position) {
    const di = this.dragInfo.draggedIndex;
    const draggedFrame = this.frames[di];
    const green = this.frames[this.frames.length - 1];

    let newX = position.x - this.dragInfo.offsetX;
    let newY = position.y - this.dragInfo.offsetY;

    // Clamp movement so the green block never leaves the canvas
    const gOffX = green.x - draggedFrame.x;
    const gOffY = green.y - draggedFrame.y;

    const clampedGX = Math.max(0, Math.min(newX + gOffX, this.canvas.width - green.width));
    const clampedGY = Math.max(0, Math.min(newY + gOffY, this.canvas.height - green.height));
    newX = clampedGX - gOffX;
    newY = clampedGY - gOffY;

    const dx = newX - draggedFrame.x;
    const dy = newY - draggedFrame.y;

    // Move dragged frame and all inner frames together
    for (let i = di; i < this.frames.length; i++) {
      this.frames[i].x += dx;
      this.frames[i].y += dy;
    }

    // Track cursor velocity (EMA) for inertia on release
    if (this._lastDragPos) {
      const dvx = position.x - this._lastDragPos.x;
      const dvy = position.y - this._lastDragPos.y;
      this._dragVelocity.x = dvx * 0.4 + this._dragVelocity.x * 0.6;
      this._dragVelocity.y = dvy * 0.4 + this._dragVelocity.y * 0.6;
    }
    this._lastDragPos = { x: position.x, y: position.y };

    if (this.onDragMove) this.onDragMove(position);
  }

  _handleDragEnd() {
    if (!this.dragInfo.isDragging) return;
    this.dragInfo.isDragging = false;
    this.dragInfo.draggedIndex = -1;
    this.canvas.style.cursor = 'pointer';
    if (this.onDragEnd) this.onDragEnd();
  }
}
