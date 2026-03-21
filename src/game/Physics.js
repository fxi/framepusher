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
   * Updates physics during dragging.
   * Only outer frames (indices 0..dragIndex-1) are pushed;
   * inner frames move rigidly with the dragged frame via EventHandler.
   * @param {Array} frames
   * @param {number} dragIndex - Index of the frame being dragged
   */
  updateDragPhysics(frames, dragIndex) {
    for (let i = dragIndex - 1; i >= 0; i--) {
      const child = frames[i + 1];
      const parent = frames[i];
      this._applyLeftPush(parent, child, this.FRAME_THICKNESS);
      this._applyRightPush(parent, child, this.FRAME_THICKNESS);
      this._applyTopPush(parent, child, this.FRAME_THICKNESS);
      this._applyBottomPush(parent, child, this.FRAME_THICKNESS);
    }
  }

  /**
   * Settling physics: springs each frame toward its restX/restY with damping.
   * @param {Array} frames
   */
  updateSettlingPhysics(frames) {
    for (const frame of frames) {
      frame.vx += (frame.restX - frame.x) * this.SPRING_STRENGTH;
      frame.vy += (frame.restY - frame.y) * this.SPRING_STRENGTH;
      frame.vx *= this.DAMPING;
      frame.vy *= this.DAMPING;
      frame.x += frame.vx;
      frame.y += frame.vy;
    }
  }

  /**
   * Stops all movement by zeroing velocities
   * @param {Array} frames
   */
  stopAllMovement(frames) {
    for (const frame of frames) {
      frame.vx = 0;
      frame.vy = 0;
    }
  }

  // ─── Push methods ──────────────────────────────────────────────────────────
  // Each push method also gives the parent a velocity kick for momentum feel.

  _applyLeftPush(parent, child, offset) {
    const targetX = child.x - offset;
    if (parent.x > targetX) {
      parent.vx -= (parent.x - targetX) * 0.3;
      parent.x = targetX;
    }
  }

  _applyRightPush(parent, child, offset) {
    const targetX = child.x + child.width - parent.width + offset;
    if (parent.x < targetX) {
      parent.vx += (targetX - parent.x) * 0.3;
      parent.x = targetX;
    }
  }

  _applyTopPush(parent, child, offset) {
    const targetY = child.y - offset;
    if (parent.y > targetY) {
      parent.vy -= (parent.y - targetY) * 0.3;
      parent.y = targetY;
    }
  }

  _applyBottomPush(parent, child, offset) {
    const targetY = child.y + child.height - parent.height + offset;
    if (parent.y < targetY) {
      parent.vy += (targetY - parent.y) * 0.3;
      parent.y = targetY;
    }
  }
}
