import { FramePusher } from './game/FramePusher.js';
import './styles/main.css';

/**
 * Main application entry point
 * Initializes and starts the FramePusher game
 */
class App {
  constructor() {
    this.game = null;
    this.isInitialized = false;
  }

  /**
   * Initializes the application
   */
  init() {
    if (this.isInitialized) {
      return;
    }

    try {
      this._waitForDOM(() => {
        this._createGameInstance();
        this._setupEventListeners();
        this.isInitialized = true;
      });
    } catch (error) {
      console.error('Failed to initialize FramePusher:', error);
      this._showError('Failed to initialize the game. Please refresh the page.');
    }
  }

  /**
   * Waits for DOM to be ready before executing callback
   * @param {Function} callback - Function to execute when DOM is ready
   * @private
   */
  _waitForDOM(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  /**
   * Creates and initializes the game instance
   * @private
   */
  _createGameInstance() {
    try {
      this.game = new FramePusher('game-canvas');
      this.game.init();
      
      console.log('FramePusher game initialized successfully!');
    } catch (error) {
      console.error('Error creating game instance:', error);
      throw error;
    }
  }

  /**
   * Sets up global event listeners
   * @private
   */
  _setupEventListeners() {
    // Handle window resize
    window.addEventListener('resize', this._handleResize.bind(this));
    
    // Handle visibility change (pause/resume game)
    document.addEventListener('visibilitychange', this._handleVisibilityChange.bind(this));
    
    // Handle page unload cleanup
    window.addEventListener('beforeunload', this._handleUnload.bind(this));
  }

  /**
   * Handles window resize events
   * @private
   */
  _handleResize() {
    if (!this.game) {
      return;
    }

    // Debounce resize events
    clearTimeout(this._resizeTimeout);
    this._resizeTimeout = setTimeout(() => {
      const containerSize = Math.min(
        window.innerHeight * 0.7,
        window.innerWidth * 0.8,
        600
      );
      
      this.game.resize(containerSize, containerSize);
    }, 250);
  }

  /**
   * Handles page visibility changes
   * Pauses game when page is hidden, resumes when visible
   * @private
   */
  _handleVisibilityChange() {
    if (!this.game) {
      return;
    }

    if (document.hidden) {
      this.game.stop();
    } else {
      this.game.start();
    }
  }

  /**
   * Handles page unload cleanup
   * @private
   */
  _handleUnload() {
    if (this.game) {
      this.game.destroy();
    }
  }

  /**
   * Shows an error message to the user
   * @param {string} message - Error message to display
   * @private
   */
  _showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #ff5252;
      color: white;
      padding: 20px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      text-align: center;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    // Remove error message after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  }

  /**
   * Gets the current game instance
   * @returns {FramePusher|null} The game instance or null if not initialized
   */
  getGame() {
    return this.game;
  }

  /**
   * Destroys the application and cleans up resources
   */
  destroy() {
    if (this.game) {
      this.game.destroy();
      this.game = null;
    }
    
    this.isInitialized = false;
    
    // Remove event listeners
    window.removeEventListener('resize', this._handleResize.bind(this));
    document.removeEventListener('visibilitychange', this._handleVisibilityChange.bind(this));
    window.removeEventListener('beforeunload', this._handleUnload.bind(this));
  }
}

// Create and initialize the application
const app = new App();
app.init();

// Export for potential external access
export default app;
