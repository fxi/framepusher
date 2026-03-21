export class Physics {
  constructor(config) {
    this.FRAME_THICKNESS = config.FRAME_THICKNESS;
    this.GAP             = config.GAP ?? config.FRAME_THICKNESS;
    this.DAMPING         = config.DAMPING;
    this.SPRING_STRENGTH = config.SPRING_STRENGTH;

    // Populated during updateDragPhysics; read by FramePusher for audio
    this.pushedContacts = [];
  }

  /**
   * Updates physics during dragging.
   * Only outer frames (indices 0..dragIndex-1) are pushed;
   * inner frames move rigidly with the dragged frame via EventHandler.
   * Sets this.pushedFrameIndices with indices of frames that actually moved.
   */
  updateDragPhysics(frames, dragIndex) {
    this.pushedContacts = [];

    for (let i = dragIndex - 1; i >= 0; i--) {
      const child  = frames[i + 1];
      const parent = frames[i];
      this._applyLeftPush  (parent, child, this.FRAME_THICKNESS, i);
      this._applyRightPush (parent, child, this.FRAME_THICKNESS, i);
      this._applyTopPush   (parent, child, this.FRAME_THICKNESS, i);
      this._applyBottomPush(parent, child, this.FRAME_THICKNESS, i);
    }
  }

  /**
   * Settling physics: springs each frame toward its restX/restY with damping.
   */
  updateSettlingPhysics(frames) {
    for (const frame of frames) {
      frame.vx += (frame.restX - frame.x) * this.SPRING_STRENGTH;
      frame.vy += (frame.restY - frame.y) * this.SPRING_STRENGTH;
      frame.vx *= this.DAMPING;
      frame.vy *= this.DAMPING;
      frame.x  += frame.vx;
      frame.y  += frame.vy;
    }
  }

  stopAllMovement(frames) {
    for (const frame of frames) { frame.vx = 0; frame.vy = 0; }
  }

  // ─── Push methods ──────────────────────────────────────────────────────────

  _applyLeftPush(parent, child, offset, parentIndex) {
    const targetX = child.x - offset;
    if (parent.x > targetX) {
      parent.vx -= (parent.x - targetX) * 0.3;
      parent.x   = targetX;
      this.pushedContacts.push(`${parentIndex}-L`);
    }
  }

  _applyRightPush(parent, child, offset, parentIndex) {
    const targetX = child.x + child.width - parent.width + offset;
    if (parent.x < targetX) {
      parent.vx += (targetX - parent.x) * 0.3;
      parent.x   = targetX;
      this.pushedContacts.push(`${parentIndex}-R`);
    }
  }

  _applyTopPush(parent, child, offset, parentIndex) {
    const targetY = child.y - offset;
    if (parent.y > targetY) {
      parent.vy -= (parent.y - targetY) * 0.3;
      parent.y   = targetY;
      this.pushedContacts.push(`${parentIndex}-T`);
    }
  }

  _applyBottomPush(parent, child, offset, parentIndex) {
    const targetY = child.y + child.height - parent.height + offset;
    if (parent.y < targetY) {
      parent.vy += (targetY - parent.y) * 0.3;
      parent.y   = targetY;
      this.pushedContacts.push(`${parentIndex}-B`);
    }
  }
}
