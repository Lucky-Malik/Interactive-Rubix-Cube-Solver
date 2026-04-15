
# 3D Interactive Rubik's Cube Solver

A full-stack Rubik's Cube solver with 3D visualization, optimal Kociemba algorithm, and camera-based cube detection.

<video src="https://github.com/user-attachments/assets/c70d1f03-177a-4da5-a45c-88777340712f" controls width="700">
  Your browser does not support the video tag.
</video>

## ✨ Features
- **3D Interactive Cube Visualization**: Real-time 3D rendering with smooth animations
- **Optimal Kociemba Algorithm**: Fast, optimal solutions using C++ backend
- **Random Scramble Generation**: Generate and apply realistic scrambles
- **Step-by-Step Solution Animation**: Visualize and step through the solution
- **Manual Cube Configuration**: Set up any cube state with validation
- **Camera Detection**: Advanced OpenCV-based cube state detection
- **Cross-platform**: Works on macOS and Windows

## 🚀 Quick Start

### Frontend Only (Recommended)
```sh
git clone https://github.com/abhinavdogra21/Rubix-Cube-Solver.git
cd Rubix-Cube-Solver
npm install
npm run dev
```
Open http://localhost:5173

> The frontend includes a fallback solver that works for scrambles generated with the "Random Scramble" button. For custom cube configurations, you'll need the backend.

## 🔧 Full Setup (With Backend)

### Prerequisites
- **Node.js** 16+ and npm
- **Python** 3.11+ (Required - The compiled C++ module is built for Python 3.11)
- **CMake** 3.12+
- **C++ Compiler** (GCC, Clang, or MSVC)

### macOS Setup
```sh
# Install prerequisites (Python 3.11 is required!)
xcode-select --install
brew install cmake python@3.11 node

# Clone and build
git clone https://github.com/abhinavdogra21/Rubix-Cube-Solver.git
cd Rubix-Cube-Solver
npm install

# Clean up all cache and build artifacts (recommended before every fresh build):
rm -rf cache
rm -rf backend/build
rm -rf backend/kociemba_api/build
rm -rf backend/kociemba_api/src/solver/cache
find . -name "kociemba_solver*.so" -delete

# Build Backend
cd backend
rm -rf build
mkdir build && cd build
cmake ..
make -j$(sysctl -n hw.ncpu)

# Copy the built Python module to where main.py expects it
cp kociemba_solver*.so ../kociemba_api/src/

# Setup Python environment (IMPORTANT: Use Python 3.11!)
cd ../kociemba_api
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start backend
cd src
python main.py
```
Backend: http://localhost:5001

In a new terminal:
```sh
cd Rubix-Cube-Solver
npm run dev
```
Frontend: http://localhost:5173

### Windows Setup
```cmd
# Prerequisites: Install Visual Studio 2019+ with C++ tools, Python 3.11+, Node.js 16+, CMake
# IMPORTANT: Make sure to install Python 3.11 specifically!

cd Rubix-Cube-Solver
npm install

# Build backend
cd backend
mkdir build && cd build
cmake .. -G "Visual Studio 16 2019"
cmake --build . --config Release
copy Release\kociemba_solver*.pyd ..\kociemba_api\src\kociemba_solver.so

# Start backend (Use Python 3.11!)
cd ..\kociemba_api
py -3.11 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python src\main.py
```

## 🎮 Usage

### Two Main Workflows
1. **Scramble & Solve**
   - Click "Random Scramble" → "Apply Scramble" → "Find Solution"
   - Works with both frontend-only and full backend

2. **Manual Configuration**
   - Use the cube configurator to set any cube state
   - Use camera detection to scan a real cube
   - Requires backend for optimal solving

### API Endpoints
- `/api/solve` (POST): Solve cube from state string

### Example API Usage
```js
// Solve a cube state
fetch('http://localhost:5001/api/solve', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ cube_state: '000000000111111111222222222333333333444444444555555555' })
})
  .then(res => res.json())
  .then(data => console.log(data.solution));

```

## 🔧 Cube State Format

Cube states are represented as 54-character strings where each character represents a face color:

- **0**: U (Up/White)
- **1**: R (Right/Red)  
- **2**: F (Front/Green)
- **3**: D (Down/Yellow)
- **4**: L (Left/Orange)
- **5**: B (Back/Blue)

The string follows this face order: U→R→F→D→L→B, with each face in reading order (top-left to bottom-right).

## 🐛 Troubleshooting

### Common Issues
- **Backend Not Starting**: Ensure Python 3.11+ (not 3.8 or 3.9!), port 5001 is free, C++ library built correctly
- **"No module named 'kociemba_solver'"**: Python version mismatch - ensure you're using Python 3.11
- **Virtual Environment Issues**: Delete venv folder and recreate with `python3.11 -m venv venv`
- **Package Installation Errors**: Some packages require Python 3.10+ - ensure you're using Python 3.11
- **Frontend Build Errors**: Delete `node_modules`, run `npm install` again
- **C++ Compilation Errors**: Ensure CMake and compatible compiler installed
- **pybind11 Issues**: Install via `brew install pybind11` (macOS) or `pip install pybind11`

### Clean Build
If you encounter build issues, clean everything first:
```sh
rm -rf node_modules package-lock.json
rm -rf backend/build
rm -rf backend/kociemba_api/build
rm -rf backend/kociemba_api/venv
find . -name "*.so" -delete
find . -name "__pycache__" -delete
```

### Python Version Issues
The most common issue is Python version mismatch. The compiled C++ module requires Python 3.11:

**Check your Python version:**
```sh
python3.11 --version  # Should show Python 3.11.x
```

**If you don't have Python 3.11:**
```sh
# macOS
brew install python@3.11

# Ubuntu/Debian
sudo apt install python3.11 python3.11-venv

# Windows
# Download from python.org and install Python 3.11
```

**Recreate virtual environment with correct Python:**
```sh
cd backend/kociemba_api
rm -rf venv
python3.11 -m venv venv  # Use python3.11 specifically!
source venv/bin/activate
pip install -r requirements.txt
```

### CMake Issues
If you see Python config errors, ensure your `CMakeLists.txt` includes:
```cmake
set(PYBIND11_FINDPYTHON ON)
find_package(pybind11 REQUIRED)
```

## 🚀 Production Build

```sh
npm run build
```

This creates an optimized production build in the `dist/` folder.

---

**Project Structure:**
- `src/` - React frontend source code
- `backend/` - C++ Kociemba solver with Python API
- `dist/` - Production build output
- `package.json` - Node.js dependencies and scripts

For issues or contributions, please open a GitHub issue or pull request.



