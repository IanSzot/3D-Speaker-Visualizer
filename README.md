# 3D Soundwave Visualizer

A real-time, GPU-accelerated acoustic simulation and visualization tool built with React, Three.js, and custom WebGL shaders. 

This project simulates complex acoustic interference patterns, allowing audio engineers and enthusiasts to physically model how sound waves propagate, reflect, and interact within a 3D room.

## ✨ Features

*   **Real-Time GPU Physics Engine:** Sound wave amplitude and interference are calculated pixel-by-pixel using a custom raymarched volumetric shader.
*   **Professional Speaker Settings:**
    *   Set exact Frequencies (Hz).
    *   Toggle between **Omnidirectional** and **Cardioid** radiation patterns (with adjustable rotation).
    *   Apply **Delay (ms)** and **Invert Polarity (180°)** which mathematically propagate into the wave physics.
*   **Acoustic Arrays & Presets:**
    *   **Line Arrays:** Simulate vertical J-curve arrays with customizable splay angles.
    *   **Endfire Subwoofer Arrays:** Automatically calculates physical delays to create powerful forward-firing cardioid beams.
    *   **Arc Delay Sub Arrays:** Electronically delays outer subwoofers to simulate a physical curved arc.
*   **3D Visualization Modes:**
    *   **Volumetric Hologram:** True 3D raymarching of the acoustic field.
    *   **3 Intersecting Planes:** Scientific cross-section analysis.
    *   **Single Plane:** Adjustable height analysis.
*   **Frequency Filtering:** Isolate and visualize the behavior of a specific target frequency band within a complex mix of speakers.
*   **Room Acoustics:** Simulates 1st-order reflections (Image Source Method) with adjustable Wall Absorption parameters.

## 🚀 Getting Started

### Prerequisites
*   Node.js (v20.15.1 or compatible)
*   npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/IanSzot/3D-Speaker-Visualizer.git
   cd 3D-Speaker-Visualizer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

## 🛠️ Tech Stack

*   **React** & **TypeScript**
*   **Three.js** & **@react-three/fiber** (3D Rendering)
*   **GLSL** (Custom Fragment Shaders for Wave Physics)
*   **TailwindCSS** (UI Styling)
*   **Vite** (Build Tool)

## 📝 License

This project is open-source and available under the MIT License.
