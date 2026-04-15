// https://github.com/abhinavdogra21/Rubix-Cube-Solver
import React, { useRef, useEffect, useCallback, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const RubiksCube = forwardRef(({ cubeState }, ref) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const cubeGroupRef = useRef(new THREE.Group());
  const cubesRef = useRef([]);
  const animationIdRef = useRef(null);
  const currentStateRef = useRef(null);

  // Color mapping for cube faces
  const faceColors = {
    'W': 0xFFFFFF, // White
    'R': 0xFF0000, // Red
    'G': 0x00FF00, // Green
    'Y': 0xFFFF00, // Yellow
    'O': 0xFFA500, // Orange
    'B': 0x0000FF  // Blue
  };

  const createCubelet = useCallback((x, y, z) => {
    const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);
    // Create materials for each face
    const materials = [
      new THREE.MeshLambertMaterial({ color: 0x333333 }), // Right
      new THREE.MeshLambertMaterial({ color: 0x333333 }), // Left
      new THREE.MeshLambertMaterial({ color: 0x333333 }), // Top
      new THREE.MeshLambertMaterial({ color: 0x333333 }), // Bottom
      new THREE.MeshLambertMaterial({ color: 0x333333 }), // Front
      new THREE.MeshLambertMaterial({ color: 0x333333 })  // Back
    ];
    const cube = new THREE.Mesh(geometry, materials);
    cube.position.set(x, y, z);
    cube.visible = true;
    cube.castShadow = true;
    cube.receiveShadow = true;
    // Add black edges
    const edges = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 3 });
    const wireframe = new THREE.LineSegments(edges, edgeMaterial);
    wireframe.visible = true;
    cube.add(wireframe);
    return cube;
  }, []);

  const updateCubeColors = useCallback((cubeStateObj) => {
    if (!cubeStateObj || !cubeStateObj.faces) {
      console.warn('Invalid cube state provided to updateCubeColors');
      return;
    }
    // Helper to normalize color keys and provide default gray
    const getColorHex = (char) => {
      if (!char) return 0x333333;
      const key = char.toUpperCase();
      return faceColors[key] || 0x333333;
    };
    const faces = cubeStateObj.faces;
    currentStateRef.current = cubeStateObj;
    // Ensure cube group is visible
    if (cubeGroupRef.current) {
      cubeGroupRef.current.visible = true;
    }
    cubesRef.current.forEach((cube, index) => {
      const pos = cube.position;
      const materials = cube.material;
      // Ensure cube is visible
      cube.visible = true;
      // Reset all faces to dark gray first
      materials.forEach(mat => {
        mat.color.setHex(0x333333);
        mat.needsUpdate = true;
      });
      // Right face (x = 1)
      if (pos.x === 1) {
        const row = 1 - pos.y;
        const col = 1 - pos.z;
        const index = row * 3 + col;
        if (faces.right[index]) {
          materials[0].color.setHex(getColorHex(faces.right[index]));
          materials[0].needsUpdate = true;
        }
      }
      // Left face (x = -1)
      if (pos.x === -1) {
        const row = 1 - pos.y;
        const col = 1 + pos.z;
        const index = row * 3 + col;
        if (faces.left[index]) {
          materials[1].color.setHex(getColorHex(faces.left[index]));
          materials[1].needsUpdate = true;
        }
      }
      // Top face (y = 1)
      if (pos.y === 1) {
        const row = 1 + pos.z;
        const col = 1 + pos.x;
        const index = row * 3 + col;
        if (faces.top[index]) {
          materials[2].color.setHex(getColorHex(faces.top[index]));
          materials[2].needsUpdate = true;
        }
      }
      // Bottom face (y = -1)
      if (pos.y === -1) {
        const row = 1 - pos.z;
        const col = 1 + pos.x;
        const index = row * 3 + col;
        if (faces.bottom[index]) {
          materials[3].color.setHex(getColorHex(faces.bottom[index]));
          materials[3].needsUpdate = true;
        }
      }
      // Front face (z = 1)
      if (pos.z === 1) {
        const row = 1 - pos.y;
        const col = 1 + pos.x;
        const index = row * 3 + col;
        if (faces.front[index]) {
          materials[4].color.setHex(getColorHex(faces.front[index]));
          materials[4].needsUpdate = true;
        }
      }
      // Back face (z = -1)
      if (pos.z === -1) {
        const row = 1 - pos.y;
        const col = 1 - pos.x;
        const index = row * 3 + col;
        if (faces.back[index]) {
          materials[5].color.setHex(getColorHex(faces.back[index]));
          materials[5].needsUpdate = true;
        }
      }
    });
  }, []);

  useEffect(() => {
    // Setup scene, camera, renderer
    const width = mountRef.current.clientWidth || 800;
    const height = mountRef.current.clientHeight || 600;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x4a9eff);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    rendererRef.current = renderer;
    cameraRef.current = camera;
    sceneRef.current = scene;
    mountRef.current.appendChild(renderer.domElement);
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);
    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.15;
    controls.enablePan = false;
    controls.minDistance = 4;
    controls.maxDistance = 12;
    // Create 27 cubelets (skip center)
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;
          const cubelet = createCubelet(x, y, z);
          cubeGroupRef.current.add(cubelet);
          cubesRef.current.push(cubelet);
        }
      }
    }
    scene.add(cubeGroupRef.current);
    // Initial color update
    updateCubeColors(cubeState);
    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    // Cleanup
    return () => {
      cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
      mountRef.current.removeChild(renderer.domElement);
      cubesRef.current = [];
      cubeGroupRef.current.clear();
    };
    // eslint-disable-next-line
  }, []);

  // Update cube colors when cubeState changes
  useEffect(() => {
    updateCubeColors(cubeState);
  }, [cubeState, updateCubeColors]);

  // Expose methods to parent
  React.useImperativeHandle(ref, () => ({
    updateCubeState: (newState) => {
      updateCubeColors(newState);
      currentStateRef.current = newState;
    },
    animateMove: async (move) => {
      if (!move) return;
      const { CubeState } = await import('./cubeState');
      let state;
      if (currentStateRef.current) {
        state = new CubeState();
        state.faces = JSON.parse(JSON.stringify(currentStateRef.current.faces));
      } else {
        state = new CubeState();
      }
      state.applyMove(move);
      updateCubeColors(state);
      currentStateRef.current = state;
      await new Promise(res => setTimeout(res, 350));
    },
    animateSolution: async (movesString) => {
      if (!movesString || typeof movesString !== 'string') return;
      const moves = movesString.trim().split(/\s+/).filter(m => m.length > 0);
      const { CubeState } = await import('./cubeState');
      let state;
      if (currentStateRef.current) {
        state = new CubeState();
        state.faces = JSON.parse(JSON.stringify(currentStateRef.current.faces));
      } else {
        state = new CubeState();
      }
      for (let move of moves) {
        state.applyMove(move);
        updateCubeColors(state);
        await new Promise(res => setTimeout(res, 350));
      }
      currentStateRef.current = state;
    },
    getCurrentState: () => {
      if (!currentStateRef.current) return null;
      const { CubeState } = require('./cubeState');
      const clone = new CubeState();
      clone.faces = JSON.parse(JSON.stringify(currentStateRef.current.faces));
      return clone;
    }
  }));

  return (
    <div ref={mountRef} className="cube-3d-mount" style={{ width: '100%', height: '100%' }} />
  );
});

export default RubiksCube;

