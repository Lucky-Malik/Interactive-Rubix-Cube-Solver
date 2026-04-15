# 3D Interactive Rubik's Cube Solver

An interactive 3D Rubik's Cube solver with move history replay, pattern presets, manual configuration, and backend-powered optimal solving.

## Overview

This project is a full-stack Rubik's Cube app with:

- a React + Vite frontend for 3D cube interaction
- a move history timeline with undo, redo, play/pause, and scrubbing
- a built-in scramble pattern library
- manual cube configuration
- video-based cube state detection
- an optional Flask + C++ backend for optimal solving with the Kociemba algorithm

You can run the frontend by itself, or run the frontend and backend together for full solving support.

## Features

- **3D Interactive Cube**: Rotate, inspect, and interact with the cube in the browser
- **Move History Timeline**: Scrub through scramble and solution moves like a replay bar
- **Undo / Redo Controls**: Step backward and forward through move history
- **Pattern Library**: Load presets like Checkerboard, Superflip, Snake, Cube in a Cube, and more
- **Random Scramble Generator**: Generate and apply scrambles quickly
- **Manual Configuration**: Enter custom cube states by hand
- **Video Detection**: Detect cube colors from camera/video input
- **Backend Solver Support**: Use the backend for optimal solving on non-trivial states
- **Fallback Frontend Solve**: Reverse known timeline history when the backend is unavailable

## Tech Stack

- **Frontend**: React, Vite, Three.js
- **Backend API**: Flask, Flask-CORS
- **Native Solver**: C++ with pybind11

## Project Structure

```text
.
├── src/                      # React frontend
├── backend/
│   ├── CMakeLists.txt        # Native solver build config
│   └── kociemba_api/
│       ├── requirements.txt  # Python backend dependencies
│       └── src/
│           ├── main.py       # Flask API
│           ├── kociemba_wrapper.cpp
│           └── solver/       # C++ solver source
├── package.json
└── README.md
```

## Quick Start

### Frontend Only

This is the fastest way to run the project locally.

```sh
git clone https://github.com/Lucky-Malik/Interactive-Rubix-Cube-Solver.git
cd Interactive-Rubix-Cube-Solver
npm install
npm run dev
```

Then open:

`http://localhost:5173/`

### What works in frontend-only mode

- 3D cube interaction
- random scrambles
- pattern library
- move history timeline
- undo / redo / replay controls
- manual configuration UI
- video detection UI

### What needs the backend

- solving arbitrary custom cube states
- optimal Kociemba-based solutions

Without the backend, the app can still reverse move history that already exists in the timeline.

## Full Setup With Backend

### Requirements

- Node.js 18+ recommended
- npm
- Python 3
- CMake 3.12+
- a C++ compiler
- pybind11

### 1. Install frontend dependencies

```sh
npm install
```

### 2. Install Python backend dependencies

```sh
cd backend/kociemba_api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

If `pybind11` is missing during native build, install it too:

```sh
pip install pybind11
```

Or on macOS with Homebrew:

```sh
brew install pybind11
```

### 3. Build the native solver

From the project root:

```sh
cd backend
mkdir -p build
cd build
cmake ..
make
```

After building, copy the generated solver module into the Flask app source folder:

```sh
cp kociemba_solver*.so ../kociemba_api/src/
```

On some systems the extension suffix may vary. Copy the built `kociemba_solver` module that CMake generates into:

`backend/kociemba_api/src/`

### 4. Start the backend

```sh
cd backend/kociemba_api
source venv/bin/activate
cd src
python main.py
```

The backend runs at:

`http://localhost:5001/`

### 5. Start the frontend

In a separate terminal:

```sh
cd Interactive-Rubix-Cube-Solver
npm run dev
```

Then open:

`http://localhost:5173/`

## Windows Notes

The frontend should run normally with:

```powershell
npm install
npm run dev
```

The backend may require extra setup for:

- Visual Studio C++ Build Tools
- CMake generator selection
- Python headers
- pybind11 discovery

If you only want to explore the UI, run the frontend first and add backend support later.

## API

### `GET /`

Health check endpoint.

### `POST /api/solve`

Solve a cube from a 54-character cube state string.

Example:

```js
fetch('http://localhost:5001/api/solve', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cube_state: '000000000111111111222222222333333333444444444555555555'
  })
})
  .then((res) => res.json())
  .then((data) => console.log(data));
```

## Usage

### Scramble and Solve

1. Generate a random scramble or enter your own
2. Click `Apply Scramble`
3. Click `Find Solution`
4. Use the move history timeline to replay the result

### Pattern Library

1. Open the `Scramble` section
2. Choose a preset pattern
3. Click `Load Pattern` to preview it
4. Click `Apply Pattern` to put it on the cube

### Manual Configuration

1. Expand `Manual Configuration`
2. Paint the cube stickers
3. Apply the configuration
4. Solve it with the backend enabled

### Video Detection

Use the video section to scan a real cube, then review and correct the detected colors before solving.

## Troubleshooting

### Frontend does not start

Try:

```sh
rm -rf node_modules
npm install
npm run dev
```

### Backend says solver is unavailable

That usually means the compiled `kociemba_solver` native module was not built or not copied into:

`backend/kociemba_api/src/`

### CMake or Python header errors

This project currently depends on local Python/C++ toolchain configuration. If CMake cannot find the right Python headers or pybind11, install pybind11 and verify your Python development environment is available on your machine.

### Only the frontend is working

That is expected if the Flask backend is not running. The app will still load and most UI features will work, but optimal solving for arbitrary states will not.

## Current Status

The frontend setup is correct and can be run locally with:

```sh
npm install
npm run dev
```

The backend setup is optional, but it depends on your local C++ / Python / pybind11 environment being configured correctly.
