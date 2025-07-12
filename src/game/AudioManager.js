/**
 * Audio manager for the FramePusher game
 * Handles sound effects using HTML5 Audio
 */
export class AudioManager {
  constructor() {
    this.isEnabled = true;
    this.volume = 0.3;
    this.tickSound = null;
    
    this._loadAudioAssets();
  }

  /**
   * Loads audio assets
   * @private
   */
  _loadAudioAssets() {
    try {
      this.tickSound = new Audio('src/audio/tick.mp3');
      this.tickSound.volume = this.volume;
      this.tickSound.preload = 'auto';
      
      // Handle loading errors
      this.tickSound.addEventListener('error', () => {
        console.warn('Failed to load tick sound');
        this.isEnabled = false;
      });
    } catch (error) {
      console.warn('Audio not supported:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Plays a tick sound when frames collide
   */
  playTickSound() {
    if (!this.isEnabled || !this.tickSound) {
      return;
    }

    try {
      // Reset the audio to the beginning and play
      this.tickSound.currentTime = 0;
      this.tickSound.volume = this.volume;
      this.tickSound.play().catch(error => {
        // Handle autoplay restrictions gracefully
        console.warn('Audio play failed:', error);
      });
    } catch (error) {
      console.warn('Error playing tick sound:', error);
    }
  }

  /**
   * Sets the volume for sound effects
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Enables or disables sound effects
   * @param {boolean} enabled - Whether sounds should be enabled
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * Gets the current volume level
   * @returns {number} Current volume (0.0 to 1.0)
   */
  getVolume() {
    return this.volume;
  }

  /**
   * Gets whether sound effects are enabled
   * @returns {boolean} True if sounds are enabled
   */
  isAudioEnabled() {
    return this.isEnabled && this.tickSound !== null;
  }

  /**
   * Destroys the audio manager and cleans up resources
   */
  destroy() {
    if (this.tickSound) {
      this.tickSound.pause();
      this.tickSound.src = '';
      this.tickSound = null;
    }
  }
}
