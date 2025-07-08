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
   * Binds all mouse event listeners to the canvas and window
   * @private
   */
  _bindEvents() {
    this.canvas.addEventListener('mousedown', this._handleMouseDown.bind(this));
    window.addEventListener('mousemove', this._handleMouseMove.bind(this));
    window.addEventListener('mouseup', this._handleMouseUp.bind(this));
    window.addEventListener('mouseleave', this._handleMouseUp.bind(this));
  }

  /**
   * Removes all event listeners
   * Call this when destroying the game instance
   */
  destroy() {
    this.canvas.removeEventListener('mousedown', this._handleMouseDown.bind(this));
    window.removeEventListener('mousemove', this._handleMouseMove.bind(this));
    window.removeEventListener('mouseup', this._handleMouseUp.bind(this));
    window.removeEventListener('mouseleave', this._handleMouseUp.bind(this));
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
    const mousePos = this._getMousePosition(event);
    const target = this.dragInfo.target;

    const isMouseOverTarget = this._isPointInFrame(mousePos, target);

    if (isMouseOverTarget) {
      event.preventDefault();
      
      this.dragInfo.isDragging = true;
      this.dragInfo.offsetX = mousePos.x - target.x;
      this.dragInfo.offsetY = mousePos.y - target.y;

      this.canvas.style.cursor = 'grabbing';

      if (this.onDragStart) {
        this.onDragStart();
      }
    }
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

    const mousePos = this._getMousePosition(event);
    
    this.dragInfo.target.x = mousePos.x - this.dragInfo.offsetX;
    this.dragInfo.target.y = mousePos.y - this.dragInfo.offsetY;

    if (this.onDragMove) {
      this.onDragMove(mousePos);
    }
  }

  /**
   * Handles mouse up events
   * Ends dragging operation
   * @private
   */
  _handleMouseUp() {
    if (this.dragInfo.isDragging) {
      this.dragInfo.isDragging = false;
      this.canvas.style.cursor = 'pointer';

      if (this.onDragEnd) {
        this.onDragEnd();
      }
    }
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
}
