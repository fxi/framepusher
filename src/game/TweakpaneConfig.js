import { Pane } from "tweakpane";

/**
 * Performance-focused Tweakpane configuration for FramePusher
 * Zero DOM impact - only affects canvas rendering and game physics
 */
export class TweakpaneConfig {
  constructor(game) {
    this.game = game;
    this.pane = new Pane({
      title: "FramePusher Controls",
      expanded: true,
    });

    // Debounce timeout for performance
    this.updateTimeout = null;
    this.DEBOUNCE_DELAY = 16; // ~60fps

    // Configuration parameters
    this.params = {
      numFrames: game.config.NUM_FRAMES,
      frameThickness: game.config.FRAME_THICKNESS,
      gap: game.config.GAP,
      damping: game.config.DAMPING,
      springStrength: game.config.SPRING_STRENGTH,
    };

    this._setupControls();
  }

  /**
   * Sets up essential Tweakpane controls
   * @private
   */
  _setupControls() {
    // Number of frames
    this.pane
      .addBinding(this.params, "numFrames", {
        label: "Frames",
        min: 5,
        max: 50,
        step: 1,
      })
      .on("change", (ev) =>
        this._debouncedUpdate("NUM_FRAMES", ev.value, true)
      );

    // Frame thickness
    this.pane
      .addBinding(this.params, "frameThickness", {
        label: "Thickness",
        min: 5,
        max: 50,
        step: 1,
      })
      .on("change", (ev) =>
        this._debouncedUpdate("FRAME_THICKNESS", ev.value, true)
      );

    // Gap between frames
    this.pane
      .addBinding(this.params, "gap", {
        label: "Gap",
        min: 0,
        max: 30,
        step: 1,
      })
      .on("change", (ev) => this._debouncedUpdate("GAP", ev.value, true));

    // Physics separator
    this.pane.addBlade({
      view: "separator",
    });

    // Damping
    this.pane
      .addBinding(this.params, "damping", {
        label: "Damping",
        min: 0.1,
        max: 1.0,
        step: 0.01,
      })
      .on("change", (ev) => this._debouncedUpdate("DAMPING", ev.value, false));

    // Spring strength
    this.pane
      .addBinding(this.params, "springStrength", {
        label: "Spring",
        min: 0.01,
        max: 1.0,
        step: 0.01,
      })
      .on("change", (ev) =>
        this._debouncedUpdate("SPRING_STRENGTH", ev.value, false)
      );

    // Reset button
    this.pane.addBlade({
      view: "separator",
    });

    this.pane
      .addBlade({
        view: "button",
        title: "Reset",
      })
      .on("click", () => this._resetToDefaults());
  }

  /**
   * Debounced configuration update for performance
   * @param {string} key - Configuration key
   * @param {*} value - New value
   * @param {boolean} requiresRecreation - Whether frames need to be recreated
   * @private
   */
  _debouncedUpdate(key, value, requiresRecreation = false) {
    // Clear existing timeout
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    // Debounce the update
    this.updateTimeout = setTimeout(() => {
      this._updateConfig(key, value, requiresRecreation);
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * Updates game configuration efficiently
   * @param {string} key - Configuration key
   * @param {*} value - New value
   * @param {boolean} requiresRecreation - Whether frames need to be recreated
   * @private
   */
  _updateConfig(key, value, requiresRecreation) {
    // Update game configuration
    this.game.updateConfig({ [key]: value });

    // Only recreate frames if necessary (structural changes)
    if (requiresRecreation) {
      this.game._createFrames();
      this.game._initializeEventHandler();
    }
  }

  /**
   * Resets all parameters to default values
   * @private
   */
  _resetToDefaults() {
    const defaults = {
      numFrames: 10,
      frameThickness: 20,
      gap: 10,
      damping: 0.9,
      springStrength: 0.2,
    };

    // Update parameters
    Object.assign(this.params, defaults);

    // Batch update configuration
    this.game.updateConfig({
      NUM_FRAMES: defaults.numFrames,
      FRAME_THICKNESS: defaults.frameThickness,
      GAP: defaults.gap,
      DAMPING: defaults.damping,
      SPRING_STRENGTH: defaults.springStrength,
    });

    // Recreate frames with new settings
    this.game._createFrames();
    //this.game._initializeEventHandler();

    // Refresh pane to show updated values
    this.pane.refresh();
  }

  /**
   * Destroys the Tweakpane instance and cleans up
   */
  destroy() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    if (this.pane) {
      this.pane.dispose();
    }
  }
}
