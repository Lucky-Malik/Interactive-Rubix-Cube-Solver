// https://github.com/abhinavdogra21/Rubix-Cube-Solver
// Cube state management and move logic
export class CubeState {
  constructor() {
    // Initialize cube in solved state (Standard cube orientation)
    // Each face is represented as a 3x3 array (0-8 indices)
    // Standard orientation: Green front, White top, Red right, Blue left, Yellow back, Orange bottom
    // Standard cube colors: Green front, White top, Red right
    this.faces = {
      front: ["G", "G", "G", "G", "G", "G", "G", "G", "G"], // Green
      back: ["B", "B", "B", "B", "B", "B", "B", "B", "B"], // Blue  
      left: ["O", "O", "O", "O", "O", "O", "O", "O", "O"], // Orange
      right: ["R", "R", "R", "R", "R", "R", "R", "R", "R"], // Red
      top: ["W", "W", "W", "W", "W", "W", "W", "W", "W"], // White
      bottom: ["Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y"], // Yellow
    };
  }

  // Static method to create a CubeState object from a 54-character string
  static fromString(stateString) {
    if (stateString.length !== 54) {
      throw new Error("Cube state string must be 54 characters long.");
    }

    const newCube = new CubeState();
    const validChars = new Set(['U', 'L', 'F', 'R', 'B', 'D']);
    
    // Map characters to colors based on standard Rubik's Cube notation
    const charToColor = {
      U: "W", // Up (White)
      L: "O", // Left (Orange)
      F: "G", // Front (Green)
      R: "R", // Right (Red)
      B: "B", // Back (Blue)
      D: "Y", // Down (Yellow)
    };

    // First validate all characters
    for (let char of stateString) {
      if (!validChars.has(char)) {
        throw new Error(`Invalid color character: ${char}. Valid characters are: U, L, F, R, B, D`);
      }
    }

    // Count occurrences of each character
    const charCounts = {};
    for (let char of stateString) {
      charCounts[char] = (charCounts[char] || 0) + 1;
    }

    // Verify each character appears exactly 9 times
    for (let char of validChars) {
      if (charCounts[char] !== 9) {
        throw new Error(`Invalid cube state: ${char} appears ${charCounts[char] || 0} times (should be 9)`);
      }
    }

    // Assuming the order U, R, F, D, L, B for the input string
    const inputFaceOrder = ["top", "right", "front", "bottom", "left", "back"];
    let charIndex = 0;

    for (const faceName of inputFaceOrder) {
      for (let i = 0; i < 9; i++) {
        const char = stateString[charIndex++];
        newCube.faces[faceName][i] = charToColor[char];
      }
    }

    // Verify center pieces
    const centers = {
      top: newCube.faces.top[4],
      right: newCube.faces.right[4],
      front: newCube.faces.front[4],
      bottom: newCube.faces.bottom[4],
      left: newCube.faces.left[4],
      back: newCube.faces.back[4]
    };

    // Check if centers are correct colors (Standard orientation)
    if (centers.front !== "G") throw new Error("Front center must be Green");
    if (centers.back !== "B") throw new Error("Back center must be Blue");
    if (centers.left !== "O") throw new Error("Left center must be Orange");
    if (centers.right !== "R") throw new Error("Right center must be Red");
    if (centers.top !== "W") throw new Error("Top center must be White");
    if (centers.bottom !== "Y") throw new Error("Bottom center must be Yellow");

    return newCube;
  }

  // Convert the current cube state to a 54-character string
  toString() {
    const facesOrder = ["top", "right", "front", "bottom", "left", "back"];
    const colorToChar = {
      "G": "F", // Front (Green)
      "B": "B", // Back (Blue)
      "O": "L", // Left (Orange)
      "R": "R", // Right (Red)
      "W": "U", // Up (White)
      "Y": "D", // Down (Yellow)
    };

    let stateString = "";
    for (const faceName of facesOrder) {
      for (let i = 0; i < 9; i++) {
        stateString += colorToChar[this.faces[faceName][i]];
      }
    }
    return stateString;
  }

  // Apply a single move
  applyMove(move) {
    const moveMap = {
      U: () => this.rotateU(),
      "U'": () => this.rotateUPrime(),
      U2: () => {
        this.rotateU();
        this.rotateU();
      },
      D: () => this.rotateD(),
      "D'": () => this.rotateDPrime(),
      D2: () => {
        this.rotateD();
        this.rotateD();
      },
      R: () => this.rotateR(),
      "R'": () => this.rotateRPrime(),
      R2: () => {
        this.rotateR();
        this.rotateR();
      },
      L: () => this.rotateL(),
      "L'": () => this.rotateLPrime(),
      L2: () => {
        this.rotateL();
        this.rotateL();
      },
      F: () => this.rotateF(),
      "F'": () => this.rotateFPrime(),
      F2: () => {
        this.rotateF();
        this.rotateF();
      },
      B: () => this.rotateB(),
      "B'": () => this.rotateBPrime(),
      B2: () => {
        this.rotateB();
        this.rotateB();
      },
    };

    if (moveMap[move]) {
      moveMap[move]();
    }
  }

  // Apply multiple moves from a string
  applyMoves(moveString) {
    const moves = moveString.trim().split(/\s+/).filter((move) => move.length > 0);
    moves.forEach((move) => this.applyMove(move));
  }

  // Rotate face clockwise
  rotateFaceClockwise(face) {
    const temp = [...face];
    face[0] = temp[6];
    face[1] = temp[3];
    face[2] = temp[0];
    face[3] = temp[7];
    face[4] = temp[4];
    face[5] = temp[1];
    face[6] = temp[8];
    face[7] = temp[5];
    face[8] = temp[2];
  }

  // Rotate face counter-clockwise
  rotateFaceCounterClockwise(face) {
    const temp = [...face];
    face[0] = temp[2];
    face[1] = temp[5];
    face[2] = temp[8];
    face[3] = temp[1];
    face[4] = temp[4];
    face[5] = temp[7];
    face[6] = temp[0];
    face[7] = temp[3];
    face[8] = temp[6];
  }

  // U (Up) face rotation
  rotateU() {
    this.rotateFaceClockwise(this.faces.top);
    const temp = [this.faces.front[0], this.faces.front[1], this.faces.front[2]];
    this.faces.front[0] = this.faces.right[0];
    this.faces.front[1] = this.faces.right[1];
    this.faces.front[2] = this.faces.right[2];
    this.faces.right[0] = this.faces.back[0];
    this.faces.right[1] = this.faces.back[1];
    this.faces.right[2] = this.faces.back[2];
    this.faces.back[0] = this.faces.left[0];
    this.faces.back[1] = this.faces.left[1];
    this.faces.back[2] = this.faces.left[2];
    this.faces.left[0] = temp[0];
    this.faces.left[1] = temp[1];
    this.faces.left[2] = temp[2];
  }

  rotateUPrime() {
    this.rotateFaceCounterClockwise(this.faces.top);
    const temp = [this.faces.front[0], this.faces.front[1], this.faces.front[2]];
    this.faces.front[0] = this.faces.left[0];
    this.faces.front[1] = this.faces.left[1];
    this.faces.front[2] = this.faces.left[2];
    this.faces.left[0] = this.faces.back[0];
    this.faces.left[1] = this.faces.back[1];
    this.faces.left[2] = this.faces.back[2];
    this.faces.back[0] = this.faces.right[0];
    this.faces.back[1] = this.faces.right[1];
    this.faces.back[2] = this.faces.right[2];
    this.faces.right[0] = temp[0];
    this.faces.right[1] = temp[1];
    this.faces.right[2] = temp[2];
  }

  // D (Down) face rotation
  rotateD() {
    this.rotateFaceClockwise(this.faces.bottom);
    const temp = [this.faces.front[6], this.faces.front[7], this.faces.front[8]];
    this.faces.front[6] = this.faces.left[6];
    this.faces.front[7] = this.faces.left[7];
    this.faces.front[8] = this.faces.left[8];
    this.faces.left[6] = this.faces.back[6];
    this.faces.left[7] = this.faces.back[7];
    this.faces.left[8] = this.faces.back[8];
    this.faces.back[6] = this.faces.right[6];
    this.faces.back[7] = this.faces.right[7];
    this.faces.back[8] = this.faces.right[8];
    this.faces.right[6] = temp[0];
    this.faces.right[7] = temp[1];
    this.faces.right[8] = temp[2];
  }

  rotateDPrime() {
    this.rotateFaceCounterClockwise(this.faces.bottom);
    const temp = [this.faces.front[6], this.faces.front[7], this.faces.front[8]];
    this.faces.front[6] = this.faces.right[6];
    this.faces.front[7] = this.faces.right[7];
    this.faces.front[8] = this.faces.right[8];
    this.faces.right[6] = this.faces.back[6];
    this.faces.right[7] = this.faces.back[7];
    this.faces.right[8] = this.faces.back[8];
    this.faces.back[6] = this.faces.left[6];
    this.faces.back[7] = this.faces.left[7];
    this.faces.back[8] = this.faces.left[8];
    this.faces.left[6] = temp[0];
    this.faces.left[7] = temp[1];
    this.faces.left[8] = temp[2];
  }

  // R (Right) face rotation
  rotateR() {
    this.rotateFaceClockwise(this.faces.right);
    const temp = [this.faces.front[2], this.faces.front[5], this.faces.front[8]];
    this.faces.front[2] = this.faces.bottom[2];
    this.faces.front[5] = this.faces.bottom[5];
    this.faces.front[8] = this.faces.bottom[8];
    this.faces.bottom[2] = this.faces.back[6];
    this.faces.bottom[5] = this.faces.back[3];
    this.faces.bottom[8] = this.faces.back[0];
    this.faces.back[6] = this.faces.top[2];
    this.faces.back[3] = this.faces.top[5];
    this.faces.back[0] = this.faces.top[8];
    this.faces.top[2] = temp[0];
    this.faces.top[5] = temp[1];
    this.faces.top[8] = temp[2];
  }

  rotateRPrime() {
    this.rotateFaceCounterClockwise(this.faces.right);
    const temp = [this.faces.front[2], this.faces.front[5], this.faces.front[8]];
    this.faces.front[2] = this.faces.top[2];
    this.faces.front[5] = this.faces.top[5];
    this.faces.front[8] = this.faces.top[8];
    this.faces.top[2] = this.faces.back[6];
    this.faces.top[5] = this.faces.back[3];
    this.faces.top[8] = this.faces.back[0];
    this.faces.back[6] = this.faces.bottom[2];
    this.faces.back[3] = this.faces.bottom[5];
    this.faces.back[0] = this.faces.bottom[8];
    this.faces.bottom[2] = temp[0];
    this.faces.bottom[5] = temp[1];
    this.faces.bottom[8] = temp[2];
  }

  // L (Left) face rotation
  rotateL() {
    this.rotateFaceClockwise(this.faces.left);
    const temp = [this.faces.front[0], this.faces.front[3], this.faces.front[6]];
    this.faces.front[0] = this.faces.top[0];
    this.faces.front[3] = this.faces.top[3];
    this.faces.front[6] = this.faces.top[6];
    this.faces.top[0] = this.faces.back[8];
    this.faces.top[3] = this.faces.back[5];
    this.faces.top[6] = this.faces.back[2];
    this.faces.back[8] = this.faces.bottom[0];
    this.faces.back[5] = this.faces.bottom[3];
    this.faces.back[2] = this.faces.bottom[6];
    this.faces.bottom[0] = temp[0];
    this.faces.bottom[3] = temp[1];
    this.faces.bottom[6] = temp[2];
  }

  rotateLPrime() {
    this.rotateFaceCounterClockwise(this.faces.left);
    const temp = [this.faces.front[0], this.faces.front[3], this.faces.front[6]];
    this.faces.front[0] = this.faces.bottom[0];
    this.faces.front[3] = this.faces.bottom[3];
    this.faces.front[6] = this.faces.bottom[6];
    this.faces.bottom[0] = this.faces.back[8];
    this.faces.bottom[3] = this.faces.back[5];
    this.faces.bottom[6] = this.faces.back[2];
    this.faces.back[8] = this.faces.top[0];
    this.faces.back[5] = this.faces.top[3];
    this.faces.back[2] = this.faces.top[6];
    this.faces.top[0] = temp[0];
    this.faces.top[3] = temp[1];
    this.faces.top[6] = temp[2];
  }

  // F (Front) face rotation
  rotateF() {
    this.rotateFaceClockwise(this.faces.front);
    const temp = [this.faces.top[6], this.faces.top[7], this.faces.top[8]];
    this.faces.top[6] = this.faces.left[8];
    this.faces.top[7] = this.faces.left[5];
    this.faces.top[8] = this.faces.left[2];
    this.faces.left[8] = this.faces.bottom[2];
    this.faces.left[5] = this.faces.bottom[1];
    this.faces.left[2] = this.faces.bottom[0];
    this.faces.bottom[2] = this.faces.right[0];
    this.faces.bottom[1] = this.faces.right[3];
    this.faces.bottom[0] = this.faces.right[6];
    this.faces.right[0] = temp[0];
    this.faces.right[3] = temp[1];
    this.faces.right[6] = temp[2];
  }

  rotateFPrime() {
    this.rotateFaceCounterClockwise(this.faces.front);
    const temp = [this.faces.top[6], this.faces.top[7], this.faces.top[8]];
    this.faces.top[6] = this.faces.right[0];
    this.faces.top[7] = this.faces.right[3];
    this.faces.top[8] = this.faces.right[6];
    this.faces.right[0] = this.faces.bottom[2];
    this.faces.right[3] = this.faces.bottom[1];
    this.faces.right[6] = this.faces.bottom[0];
    this.faces.bottom[2] = this.faces.left[8];
    this.faces.bottom[1] = this.faces.left[5];
    this.faces.bottom[0] = this.faces.left[2];
    this.faces.left[8] = temp[0];
    this.faces.left[5] = temp[1];
    this.faces.left[2] = temp[2];
  }

  // B (Back) face rotation
  rotateB() {
    this.rotateFaceClockwise(this.faces.back);
    const temp = [this.faces.top[0], this.faces.top[1], this.faces.top[2]];
    this.faces.top[0] = this.faces.right[2];
    this.faces.top[1] = this.faces.right[5];
    this.faces.top[2] = this.faces.right[8];
    this.faces.right[2] = this.faces.bottom[8];
    this.faces.right[5] = this.faces.bottom[7];
    this.faces.right[8] = this.faces.bottom[6];
    this.faces.bottom[8] = this.faces.left[6];
    this.faces.bottom[7] = this.faces.left[3];
    this.faces.bottom[6] = this.faces.left[0];
    this.faces.left[6] = temp[0];
    this.faces.left[3] = temp[1];
    this.faces.left[0] = temp[2];
  }

  rotateBPrime() {
    this.rotateFaceCounterClockwise(this.faces.back);
    const temp = [this.faces.top[0], this.faces.top[1], this.faces.top[2]];
    this.faces.top[0] = this.faces.left[6];
    this.faces.top[1] = this.faces.left[3];
    this.faces.top[2] = this.faces.left[0];
    this.faces.left[6] = this.faces.bottom[8];
    this.faces.left[3] = this.faces.bottom[7];
    this.faces.left[0] = this.faces.bottom[6];
    this.faces.bottom[8] = this.faces.right[2];
    this.faces.bottom[7] = this.faces.right[5];
    this.faces.bottom[6] = this.faces.right[8];
    this.faces.right[2] = temp[0];
    this.faces.right[5] = temp[1];
    this.faces.right[8] = temp[2];
  }

  // Check if the cube is in solved state
  isSolved() {
    // In solved state, each face should have all squares of the same color
    const solvedState = {
      front: ["W", "W", "W", "W", "W", "W", "W", "W", "W"],
      back: ["Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y"],
      left: ["G", "G", "G", "G", "G", "G", "G", "G", "G"],
      right: ["B", "B", "B", "B", "B", "B", "B", "B", "B"],
      top: ["R", "R", "R", "R", "R", "R", "R", "R", "R"],
      bottom: ["O", "O", "O", "O", "O", "O", "O", "O", "O"],
    };

    for (const face in solvedState) {
      for (let i = 0; i < 9; i++) {
        if (this.faces[face][i] !== solvedState[face][i]) {
          return false;
        }
      }
    }
    return true;
  }

  // Get cube colors for 3D visualization
  getCubeColors() {
    const colorMap = {
      W: "#ffffff", // White
      Y: "#ffff00", // Yellow
      R: "#ff0000", // Red
      O: "#ff8000", // Orange
      G: "#00ff00", // Green
      B: "#0000ff", // Blue
    };

    const pieces = [];

    // Generate 27 cube pieces (3x3x3)
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const position = [x, y, z];
          const colors = {};

          // Map face positions to sticker indices
          if (x === 1) {
            // Right face
            const idx = (1 - z) * 3 + (1 + y);
            colors.right = colorMap[this.faces.right[idx]] || "#333";
          }
          if (x === -1) {
            // Left face
            const idx = (1 + z) * 3 + (1 + y);
            colors.left = colorMap[this.faces.left[idx]] || "#333";
          }
          if (y === 1) {
            // Top face
            const idx = (1 - z) * 3 + (1 + x);
            colors.top = colorMap[this.faces.top[idx]] || "#333";
          }
          if (y === -1) {
            // Bottom face
            const idx = (1 + z) * 3 + (1 + x);
            colors.bottom = colorMap[this.faces.bottom[idx]] || "#333";
          }
          if (z === 1) {
            // Front face
            const idx = (1 - y) * 3 + (1 + x);
            colors.front = colorMap[this.faces.front[idx]] || "#333";
          }
          if (z === -1) {
            // Back face
            const idx = (1 - y) * 3 + (1 - x);
            colors.back = colorMap[this.faces.back[idx]] || "#333";
          }

          pieces.push({
            key: `${x}-${y}-${z}`,
            position,
            colors,
          });
        }
      }
    }

    return pieces;
  }

  // Get a string representation of the cube state for debugging
  getStateString() {
    return JSON.stringify(this.faces, null, 2);
  }
}


