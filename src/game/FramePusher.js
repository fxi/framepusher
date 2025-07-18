import { Physics } from './Physics.js';
import { Renderer } from './Renderer.js';
import { EventHandler } from './EventHandler.js';
import { TweakpaneConfig } from './TweakpaneConfig.js';

/**
 * Main FramePusher game class
 * Orchestrates physics, rendering, and event handling
 */
export class FramePusher {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas element with id "${canvasId}" not found`);
    }

    // Game configuration
    this.config = {
      FRAME_THICKNESS: 20,
      GAP: 10,
      HANDLE_SIZE: 40,
      DAMPING: 0.9,
      SPRING_STRENGTH: 0.2,
      NUM_FRAMES: 0, // will be calculated
    };

    // Game state
    this.frames = [];
    this.isRunning = false;
    this.animationId = null;

    // Initialize game systems
    this.physics = new Physics(this.config);
    this.renderer = new Renderer(this.canvas, this.config);
    this.eventHandler = null; // Will be initialized after frames are created
    this.tweakpane = null; // Will be initialized after game setup

    this._setupCanvas();
    this._createFrames();
    this._initializeEventHandler();
  }

  /**
   * Initializes the game and starts the animation loop
   */
  init() {
    this.renderer.generateBackground();
    
    // Initialize Tweakpane controls only in development mode
    if (this._isDevelopmentMode()) {
      this.tweakpane = new TweakpaneConfig(this);
    }
    
    this.start();
  }

  /**
   * Starts the game animation loop
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this._animate();
  }

  /**
   * Stops the game animation loop
   */
  stop() {
    this.isRunning = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Destroys the game instance and cleans up resources
   */
  destroy() {
    this.stop();
    
    if (this.eventHandler) {
      this.eventHandler.destroy();
    }
    
    if (this.tweakpane) {
      this.tweakpane.destroy();
    }
  }

  /**
   * Sets up canvas dimensions and styling
   * @private
   */
  _setupCanvas() {
    const containerSize = Math.min(
      window.innerHeight * 0.7,
      window.innerWidth * 0.8,
      600
    );

    this.renderer.resize(containerSize, containerSize);
  }

  /**
   * Calculates how many frames can fit in the current canvas
   * based on thickness, gap and handle size
   * @private
   */
  _calculateNumFrames() {
    const stepDown = (this.config.GAP + this.config.FRAME_THICKNESS) * 2;
    if (stepDown <= 0) {
      return 1;
    }

    const available = this.canvas.width - this.config.HANDLE_SIZE;
    const count = Math.floor(available / stepDown);
    return Math.max(1, count + 1); // include the handle frame
  }

  /**
   * Creates the nested frame structure
   * @private
   */
  _createFrames() {
    this.frames = [];
    const stepDown = (this.config.GAP + this.config.FRAME_THICKNESS) * 2;

    this.config.NUM_FRAMES = this._calculateNumFrames();

    for (let i = 0; i < this.config.NUM_FRAMES; i++) {
      const isLastFrame = i === this.config.NUM_FRAMES - 1;
      const size = isLastFrame
        ? this.config.HANDLE_SIZE
        : this.canvas.width - i * stepDown;
      const position = (this.canvas.width - size) / 2;

      this.frames.push({
        x: position,
        y: position,
        vx: 0,
        vy: 0,
        width: size,
        height: size,
      });
    }
  }

  /**
   * Initializes the event handler with drag callbacks
   * @private
   */
  _initializeEventHandler() {
    const dragTarget = this.frames[this.config.NUM_FRAMES - 1];
    this.eventHandler = new EventHandler(this.canvas, dragTarget);

    this.eventHandler.setDragCallbacks(
      this._onDragStart.bind(this),
      this._onDragMove.bind(this),
      this._onDragEnd.bind(this)
    );
  }

  /**
   * Main animation loop
   * @private
   */
  _animate() {
    if (!this.isRunning) {
      return;
    }

    this._updatePhysics();
    this._render();

    this.animationId = requestAnimationFrame(this._animate.bind(this));
  }

  /**
   * Updates game physics based on current state
   * @private
   */
  _updatePhysics() {
    if (this.eventHandler.isDragging()) {
      this.physics.updateDragPhysics(this.frames, this.config.NUM_FRAMES);
    } else {
      // Settling physics is currently disabled but ready for use
      // this.physics.updateSettlingPhysics(
      //   this.frames,
      //   this.canvas.width,
      //   this.canvas.height
      // );
    }
  }

  /**
   * Renders the current game state
   * @private
   */
  _render() {
    const isDragging = this.eventHandler.isDragging();
    this.renderer.drawScene(this.frames, isDragging);
  }

  /**
   * Handles drag start events
   * @private
   */
  _onDragStart() {
    this.physics.stopAllMovement(this.frames);
  }

  /**
   * Handles drag move events
   * @param {Object} mousePos - Current mouse position
   * @private
   */
  _onDragMove(mousePos) {
    // Additional drag move logic can be added here if needed
  }

  /**
   * Handles drag end events
   * @private
   */
  _onDragEnd() {
    // Additional drag end logic can be added here if needed
  }

  /**
   * Gets the current game state
   * @returns {Object} Object containing frames and configuration
   */
  getState() {
    return {
      frames: [...this.frames],
      config: { ...this.config },
      isRunning: this.isRunning,
      isDragging: this.eventHandler ? this.eventHandler.isDragging() : false,
    };
  }

  /**
   * Updates game configuration
   * @param {Object} newConfig - New configuration values
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.physics = new Physics(this.config);
    this.renderer = new Renderer(this.canvas, this.config);
    
    // Regenerate background dots when renderer is recreated
    this.renderer.generateBackground();
  }

  /**
   * Resizes the game canvas
   * @param {number} width - New canvas width
   * @param {number} height - New canvas height
   */
  resize(width, height) {
    this.renderer.resize(width, height);
    this._createFrames();
    
    if (this.eventHandler) {
      const dragTarget = this.frames[this.config.NUM_FRAMES - 1];
      this.eventHandler.setDragTarget(dragTarget);
    }
  }

  /**
   * Checks if the app is running in development mode
   * @returns {boolean} True if in development mode
   * @private
   */
  _isDevelopmentMode() {
    // Check for localhost or common development ports
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      port === '3000' ||
      port === '3001' ||
      port === '5173' ||
      port === '8080' ||
      hostname.includes('.local')
    );
  }

}
