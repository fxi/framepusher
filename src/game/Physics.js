/**
 * Physics engine for the FramePusher game
 * Handles collision detection, dragging physics, and settling animations
 */
export class Physics {
  constructor(config) {
    this.FRAME_THICKNESS = config.FRAME_THICKNESS;
    this.GAP = config.GAP;
    this.DAMPING = config.DAMPING;
    this.SPRING_STRENGTH = config.SPRING_STRENGTH;
  }

  /**
   * Updates physics during dragging state
   * Pushes parent frames based on child frame positions
   * @param {Array} frames - Array of frame objects
   * @param {number} numFrames - Total number of frames
   */
  updateDragPhysics(frames, numFrames) {
    // Loop from the second-to-last frame outwards using for loop
    for (let i = numFrames - 2; i >= 0; i--) {
      const child = frames[i + 1];
      const parent = frames[i];
      const parentInnerOffset = this.FRAME_THICKNESS;

      // Calculate target positions for pushing logic
      this._applyLeftPush(parent, child, parentInnerOffset);
      this._applyRightPush(parent, child, parentInnerOffset);
      this._applyTopPush(parent, child, parentInnerOffset);
      this._applyBottomPush(parent, child, parentInnerOffset);
    }
  }

  /**
   * Updates physics during settling state (spring-based animation)
   * @param {Array} frames - Array of frame objects
   * @param {number} canvasWidth - Canvas width for boundary calculations
   * @param {number} canvasHeight - Canvas height for boundary calculations
   */
  updateSettlingPhysics(frames, canvasWidth, canvasHeight) {
    // Apply velocity and damping to all frames
    for (const frame of frames) {
      frame.vx *= this.DAMPING;
      frame.vy *= this.DAMPING;
      frame.x += frame.vx;
      frame.y += frame.vy;
    }

    // Apply spring forces for collisions using for loop
    for (let i = frames.length - 1; i >= 0; i--) {
      const frame = frames[i];
      const parent = this._getParentFrame(frames, i, canvasWidth, canvasHeight);
      const parentInnerOffset = i > 0 ? this.FRAME_THICKNESS : 0;

      const boundaries = this._calculateBoundaries(
        parent,
        frame,
        parentInnerOffset
      );

      this._applySpringForces(frame, parent, boundaries, i > 0);
    }
  }

  /**
   * Stops all movement by zeroing velocities
   * @param {Array} frames - Array of frame objects
   */
  stopAllMovement(frames) {
    for (const frame of frames) {
      frame.vx = 0;
      frame.vy = 0;
    }
  }

  /**
   * Applies left push logic during dragging
   * @private
   */
  _applyLeftPush(parent, child, parentInnerOffset) {
    const targetX = child.x - parentInnerOffset;
    if (parent.x > targetX) {
      parent.x = targetX;
    }
  }

  /**
   * Applies right push logic during dragging
   * @private
   */
  _applyRightPush(parent, child, parentInnerOffset) {
    const targetX = child.x + child.width - parent.width + parentInnerOffset;
    if (parent.x < targetX) {
      parent.x = targetX;
    }
  }

  /**
   * Applies top push logic during dragging
   * @private
   */
  _applyTopPush(parent, child, parentInnerOffset) {
    const targetY = child.y - parentInnerOffset;
    if (parent.y > targetY) {
      parent.y = targetY;
    }
  }

  /**
   * Applies bottom push logic during dragging
   * @private
   */
  _applyBottomPush(parent, child, parentInnerOffset) {
    const targetY = child.y + child.height - parent.height + parentInnerOffset;
    if (parent.y < targetY) {
      parent.y = targetY;
    }
  }

  /**
   * Gets the parent frame or canvas boundaries
   * @private
   */
  _getParentFrame(frames, index, canvasWidth, canvasHeight) {
    if (index > 0) {
      return frames[index - 1];
    }
    
    return {
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      vx: 0,
      vy: 0,
    };
  }

  /**
   * Calculates boundary constraints for spring physics
   * @private
   */
  _calculateBoundaries(parent, frame, parentInnerOffset) {
    return {
      minX: parent.x + parentInnerOffset,
      maxX: parent.x + parent.width - parentInnerOffset - frame.width,
      minY: parent.y + parentInnerOffset,
      maxY: parent.y + parent.height - parentInnerOffset - frame.height,
    };
  }

  /**
   * Applies spring forces based on boundary overlaps
   * @private
   */
  _applySpringForces(frame, parent, boundaries, hasParent) {
    let overlap;

    // Left boundary spring force
    overlap = boundaries.minX - frame.x;
    if (overlap > 0) {
      frame.vx += overlap * this.SPRING_STRENGTH;
      if (hasParent) {
        parent.vx -= overlap * this.SPRING_STRENGTH * 0.5;
      }
    }

    // Right boundary spring force
    overlap = boundaries.maxX - frame.x;
    if (overlap < 0) {
      frame.vx += overlap * this.SPRING_STRENGTH;
      if (hasParent) {
        parent.vx -= overlap * this.SPRING_STRENGTH * 0.5;
      }
    }

    // Top boundary spring force
    overlap = boundaries.minY - frame.y;
    if (overlap > 0) {
      frame.vy += overlap * this.SPRING_STRENGTH;
      if (hasParent) {
        parent.vy -= overlap * this.SPRING_STRENGTH * 0.5;
      }
    }

    // Bottom boundary spring force
    overlap = boundaries.maxY - frame.y;
    if (overlap < 0) {
      frame.vy += overlap * this.SPRING_STRENGTH;
      if (hasParent) {
        parent.vy -= overlap * this.SPRING_STRENGTH * 0.5;
      }
    }
  }
}
