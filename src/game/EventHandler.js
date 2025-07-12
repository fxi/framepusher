/**
 * Event handler for the FramePusher game
 * Manages mouse interactions and drag operations
 */
export class EventHandler {
  constructor(canvas, dragTarget) {
    this.canvas = canvas;
    this.dragInfo = {
      isDragging: false,
      target: dragTarget,
      offsetX: 0,
      offsetY: 0,
    };
    
    this.onDragStart = null;
    this.onDragEnd = null;
    this.onDragMove = null;
    
    this._bindEvents();
  }

  /**
   * Binds all mouse and touch event listeners to the canvas and window
   * @private
   */
  _bindEvents() {
    // Mouse events
    this.canvas.addEventListener('mousedown', this._handleMouseDown.bind(this));
    window.addEventListener('mousemove', this._handleMouseMove.bind(this));
    window.addEventListener('mouseup', this._handleMouseUp.bind(this));
    window.addEventListener('mouseleave', this._handleMouseUp.bind(this));
    
    // Touch events for mobile support
    this.canvas.addEventListener('touchstart', this._handleTouchStart.bind(this), { passive: false });
    window.addEventListener('touchmove', this._handleTouchMove.bind(this), { passive: false });
    window.addEventListener('touchend', this._handleTouchEnd.bind(this));
    window.addEventListener('touchcancel', this._handleTouchEnd.bind(this));
  }

  /**
   * Removes all event listeners
   * Call this when destroying the game instance
   */
  destroy() {
    // Remove mouse events
    this.canvas.removeEventListener('mousedown', this._handleMouseDown.bind(this));
    window.removeEventListener('mousemove', this._handleMouseMove.bind(this));
    window.removeEventListener('mouseup', this._handleMouseUp.bind(this));
    window.removeEventListener('mouseleave', this._handleMouseUp.bind(this));
    
    // Remove touch events
    this.canvas.removeEventListener('touchstart', this._handleTouchStart.bind(this));
    window.removeEventListener('touchmove', this._handleTouchMove.bind(this));
    window.removeEventListener('touchend', this._handleTouchEnd.bind(this));
    window.removeEventListener('touchcancel', this._handleTouchEnd.bind(this));
  }

  /**
   * Sets callback functions for drag events
   * @param {Function} onDragStart - Called when dragging starts
   * @param {Function} onDragMove - Called during dragging
   * @param {Function} onDragEnd - Called when dragging ends
   */
  setDragCallbacks(onDragStart, onDragMove, onDragEnd) {
    this.onDragStart = onDragStart;
    this.onDragMove = onDragMove;
    this.onDragEnd = onDragEnd;
  }

  /**
   * Updates the drag target (the draggable frame)
   * @param {Object} target - The frame object that can be dragged
   */
  setDragTarget(target) {
    this.dragInfo.target = target;
  }

  /**
   * Gets the current dragging state
   * @returns {boolean} True if currently dragging
   */
  isDragging() {
    return this.dragInfo.isDragging;
  }

  /**
   * Handles mouse down events
   * Initiates dragging if mouse is over the drag target
   * @param {MouseEvent} event - The mouse event
   * @private
   */
  _handleMouseDown(event) {
    const position = this._getMousePosition(event);
    this._handleDragStart(event, position);
  }

  /**
   * Handles mouse move events
   * Updates drag target position if dragging
   * @param {MouseEvent} event - The mouse event
   * @private
   */
  _handleMouseMove(event) {
    if (!this.dragInfo.isDragging) {
      return;
    }
    const position = this._getMousePosition(event);
    this._handleDragMove(position);
  }

  /**
   * Handles mouse up events
   * Ends dragging operation
   * @private
   */
  _handleMouseUp() {
    this._handleDragEnd();
  }

  /**
   * Gets mouse position relative to canvas
   * @param {MouseEvent} event - The mouse event
   * @returns {Object} Object with x and y coordinates
   * @private
   */
  _getMousePosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  /**
   * Checks if a point is inside a frame
   * @param {Object} point - Point with x and y coordinates
   * @param {Object} frame - Frame object with position and dimensions
   * @returns {boolean} True if point is inside frame
   * @private
   */
  _isPointInFrame(point, frame) {
    return (
      point.x > frame.x &&
      point.x < frame.x + frame.width &&
      point.y > frame.y &&
      point.y < frame.y + frame.height
    );
  }

  /**
   * Gets the current drag offset
   * @returns {Object} Object with offsetX and offsetY
   */
  getDragOffset() {
    return {
      offsetX: this.dragInfo.offsetX,
      offsetY: this.dragInfo.offsetY,
    };
  }

  /**
   * Manually sets the dragging state
   * Useful for programmatic control
   * @param {boolean} isDragging - The desired dragging state
   */
  setDragging(isDragging) {
    this.dragInfo.isDragging = isDragging;
    this.canvas.style.cursor = isDragging ? 'grabbing' : 'pointer';
  }

  /**
   * Touch event handlers - delegate to shared drag methods
   */
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

  /**
   * Gets touch position relative to canvas
   * @param {Touch} touch - The touch object
   * @returns {Object} Object with x and y coordinates
   * @private
   */
  _getTouchPosition(touch) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }

  /**
   * Shared drag logic methods
   */
  _handleDragStart(event, position) {
    const target = this.dragInfo.target;
    const isOverTarget = this._isPointInFrame(position, target);

    if (isOverTarget) {
      event.preventDefault();
      
      this.dragInfo.isDragging = true;
      this.dragInfo.offsetX = position.x - target.x;
      this.dragInfo.offsetY = position.y - target.y;

      this.canvas.style.cursor = 'grabbing';

      if (this.onDragStart) {
        this.onDragStart();
      }
    }
  }

  _handleDragMove(position) {
    // Calculate new position
    let newX = position.x - this.dragInfo.offsetX;
    let newY = position.y - this.dragInfo.offsetY;
    
    // Apply canvas boundary constraints
    const maxX = this.canvas.width - this.dragInfo.target.width;
    const maxY = this.canvas.height - this.dragInfo.target.height;
    
    // Clamp position to canvas boundaries
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));
    
    this.dragInfo.target.x = newX;
    this.dragInfo.target.y = newY;

    if (this.onDragMove) {
      this.onDragMove(position);
    }
  }

  _handleDragEnd() {
    if (this.dragInfo.isDragging) {
      this.dragInfo.isDragging = false;
      this.canvas.style.cursor = 'pointer';

      if (this.onDragEnd) {
        this.onDragEnd();
      }
    }
  }
}
