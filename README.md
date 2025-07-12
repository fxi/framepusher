# FramePusher 🎮

An interactive frame-pushing animation game built with vanilla JavaScript and Canvas API. Drag the green square to push nested frames around with smooth physics!

## 🚀 Live Demo

Visit the live demo at: [https://fxi.io/framepusher](https://fxi.io/framepusher)

## ✨ Features

- **Interactive Physics**: Smooth drag-and-drop mechanics with realistic frame pushing
- **Nested Frame System**: Multiple layers of frames that respond to each other
- **Responsive Design**: Adapts to different screen sizes and devices
- **Modern Architecture**: Clean, modular ES6+ code structure
- **Colorful Background**: Dynamic dot pattern with random colors
- **Performance Optimized**: Efficient rendering and animation loops

## 🎯 How to Play

1. Click and drag the green square in the center
2. Watch as the nested frames get pushed around by your movements
3. Enjoy the smooth physics and visual feedback!

## 🛠️ Development

### Prerequisites

- Node.js (v18 or higher)
- npm

### Getting Started

1. Clone the repository:
```bash
git clone https://github.com/fxi/framepusher.git
cd framepusher
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## 🏗️ Project Structure

```
framepusher/
├── src/
│   ├── game/
│   │   ├── FramePusher.js    # Main game orchestrator
│   │   ├── Physics.js        # Physics engine for drag and collision
│   │   ├── Renderer.js       # Canvas rendering system
│   │   └── EventHandler.js   # Mouse event management
│   ├── styles/
│   │   └── main.css         # Global styles and layout
│   └── main.js              # Application entry point
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Pages deployment
├── index.html               # Main HTML file
├── vite.config.js          # Vite configuration
└── package.json            # Project dependencies
```

## 🎨 Architecture

The game is built with a modular architecture:

- **FramePusher**: Main game class that orchestrates all systems
- **Physics**: Handles collision detection and drag physics using for/for...of loops
- **Renderer**: Manages all canvas drawing operations with optimized rendering
- **EventHandler**: Processes mouse interactions and drag operations
- **App**: Application lifecycle management with error handling

## 🔧 Configuration

The game behavior can be customized through the configuration object in `FramePusher.js`:

```javascript
this.config = {
  FRAME_THICKNESS: 20,    // Thickness of frame borders
  GAP: 10,               // Gap between frames
  DAMPING: 0.9,          // Physics damping factor
  SPRING_STRENGTH: 0.2,  // Spring force strength
  HANDLE_SIZE: 40,       // Size of the draggable square
};
```

The number of nested frames is calculated automatically based on the canvas
size, the frame thickness, the gap and the handle size.

## 🚀 Deployment

The project automatically deploys to GitHub Pages when changes are pushed to the main branch. The deployment is handled by GitHub Actions.

### Manual Deployment Setup

1. Enable GitHub Pages in repository settings
2. Set source to "GitHub Actions"
3. Push to main branch to trigger deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes with proper commit messages
4. Push to your fork and submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Future Enhancements

- [ ] Add sound effects for interactions
- [ ] Implement settling physics animation
- [ ] Add touch support for mobile devices
- [ ] Create different game modes
- [ ] Add particle effects
- [ ] Implement frame customization options

## 👨‍💻 Author

**fxi** - [GitHub Profile](https://github.com/fxi)

---

Enjoy playing FramePusher! 🎮✨
