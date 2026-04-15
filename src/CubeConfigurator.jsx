// https://github.com/abhinavdogra21/Rubix-Cube-Solver
import React, { useState, useEffect } from 'react';
import { CubeState } from './cubeState';
import './CubeConfigurator.css';

function CubeConfigurator({ cubeState, onCubeStateChange, fromVideo = false }) {
  const [selectedColor, setSelectedColor] = useState('W');
  const [localCubeState, setLocalCubeState] = useState(cubeState);
  const [error, setError] = useState('');

  const colors = [
    { key: 'W', name: 'White', color: '#ffffff' },
    { key: 'R', name: 'Red', color: '#ff0000' },
    { key: 'G', name: 'Green', color: '#00ff00' },
    { key: 'Y', name: 'Yellow', color: '#ffff00' },
    { key: 'O', name: 'Orange', color: '#ff8000' },
    { key: 'B', name: 'Blue', color: '#0000ff' }
  ];

  useEffect(() => {
    const newLocalCubeState = new CubeState();
    Object.entries(cubeState.faces).forEach(([face, colors]) => {
      newLocalCubeState.faces[face] = [...colors];
    });
    setLocalCubeState(newLocalCubeState);
  }, [cubeState]);

  const validateConfiguration = () => {
    // Only check color counts and corner/edge validity, not center colors
    const colorCounts = { W: 0, Y: 0, G: 0, B: 0, R: 0, O: 0 };
    Object.values(localCubeState.faces).forEach(face => {
      face.forEach(color => {
        colorCounts[color]++;
      });
    });

    // Each color should appear exactly 9 times
    for (const [color, count] of Object.entries(colorCounts)) {
      if (count !== 9) {
        return `Color ${color} appears ${count} times (should be 9)`;
      }
    }

    // Check corner pieces
    const corners = [
      // Front-Left-Top
      [localCubeState.faces.front[0], localCubeState.faces.left[2], localCubeState.faces.top[6]],
      // Front-Right-Top
      [localCubeState.faces.front[2], localCubeState.faces.right[0], localCubeState.faces.top[8]],
      // Front-Left-Bottom
      [localCubeState.faces.front[6], localCubeState.faces.left[8], localCubeState.faces.bottom[0]],
      // Front-Right-Bottom
      [localCubeState.faces.front[8], localCubeState.faces.right[6], localCubeState.faces.bottom[2]],
      // Back-Left-Top
      [localCubeState.faces.back[2], localCubeState.faces.left[0], localCubeState.faces.top[0]],
      // Back-Right-Top
      [localCubeState.faces.back[0], localCubeState.faces.right[2], localCubeState.faces.top[2]],
      // Back-Left-Bottom
      [localCubeState.faces.back[8], localCubeState.faces.left[6], localCubeState.faces.bottom[6]],
      // Back-Right-Bottom
      [localCubeState.faces.back[6], localCubeState.faces.right[8], localCubeState.faces.bottom[8]]
    ];

    // Check if each corner has valid color combinations
    const validCornerSets = [
      new Set(['W', 'G', 'R']), // Front-Left-Top
      new Set(['W', 'B', 'R']), // Front-Right-Top
      new Set(['W', 'G', 'O']), // Front-Left-Bottom
      new Set(['W', 'B', 'O']), // Front-Right-Bottom
      new Set(['Y', 'G', 'R']), // Back-Left-Top
      new Set(['Y', 'B', 'R']), // Back-Right-Top
      new Set(['Y', 'G', 'O']), // Back-Left-Bottom
      new Set(['Y', 'B', 'O'])  // Back-Right-Bottom
    ];

    for (let i = 0; i < corners.length; i++) {
      const cornerColors = new Set(corners[i]);
      let isValid = false;
      for (const validSet of validCornerSets) {
        if (setsEqual(cornerColors, validSet)) {
          isValid = true;
          break;
        }
      }
      if (!isValid) {
        return `Invalid corner piece configuration at corner ${i + 1}`;
      }
    }

    // Check edge pieces
    const edges = [
      // Front edges
      [localCubeState.faces.front[1], localCubeState.faces.top[7]], // Front-Top
      [localCubeState.faces.front[3], localCubeState.faces.left[5]], // Front-Left
      [localCubeState.faces.front[5], localCubeState.faces.right[3]], // Front-Right
      [localCubeState.faces.front[7], localCubeState.faces.bottom[1]], // Front-Bottom
      // Back edges
      [localCubeState.faces.back[1], localCubeState.faces.top[1]], // Back-Top
      [localCubeState.faces.back[3], localCubeState.faces.right[5]], // Back-Right
      [localCubeState.faces.back[5], localCubeState.faces.left[3]], // Back-Left
      [localCubeState.faces.back[7], localCubeState.faces.bottom[7]], // Back-Bottom
      // Middle edges
      [localCubeState.faces.top[3], localCubeState.faces.left[1]], // Top-Left
      [localCubeState.faces.top[5], localCubeState.faces.right[1]], // Top-Right
      [localCubeState.faces.bottom[3], localCubeState.faces.left[7]], // Bottom-Left
      [localCubeState.faces.bottom[5], localCubeState.faces.right[7]] // Bottom-Right
    ];

    const validEdgePairs = [
      new Set(['W', 'R']), // Front-Top
      new Set(['W', 'G']), // Front-Left
      new Set(['W', 'B']), // Front-Right
      new Set(['W', 'O']), // Front-Bottom
      new Set(['Y', 'R']), // Back-Top
      new Set(['Y', 'B']), // Back-Right
      new Set(['Y', 'G']), // Back-Left
      new Set(['Y', 'O']), // Back-Bottom
      new Set(['R', 'G']), // Top-Left
      new Set(['R', 'B']), // Top-Right
      new Set(['O', 'G']), // Bottom-Left
      new Set(['O', 'B'])  // Bottom-Right
    ];

    for (let i = 0; i < edges.length; i++) {
      const edgeColors = new Set(edges[i]);
      let isValid = false;
      for (const validPair of validEdgePairs) {
        if (setsEqual(edgeColors, validPair)) {
          isValid = true;
          break;
        }
      }
      if (!isValid) {
        return `Invalid edge piece configuration at edge ${i + 1}`;
      }
    }

    return null;
  };

  // Helper function to compare sets
  const setsEqual = (set1, set2) => {
    if (set1.size !== set2.size) return false;
    for (const item of set1) {
      if (!set2.has(item)) return false;
    }
    return true;
  };

  const handleSquareClick = (face, index) => {
    const newCubeState = new CubeState();
    Object.entries(localCubeState.faces).forEach(([f, colors]) => {
      newCubeState.faces[f] = [...colors];
    });
    newCubeState.faces[face][index] = selectedColor;
    setLocalCubeState(newCubeState);
    setError('');
  };

  const handleApplyConfiguration = () => {
    const error = validateConfiguration();
    if (error) {
      setError(error);
      return;
    }
    onCubeStateChange(localCubeState);
    setError('');
  };

  const handleReset = () => {
    const newCubeState = new CubeState();
    setLocalCubeState(newCubeState);
    onCubeStateChange(newCubeState);
    setError('');
  };

  const renderFace = (faceName, faceData, className) => {
    const face = faceName.toLowerCase();
    const isCenter = (index) => index === 4;
    
    // Expected center colors for reference
    const expectedCenters = {
      'front': 'G',
      'right': 'R', 
      'back': 'B',
      'left': 'O',
      'top': 'W',
      'bottom': 'Y'
    };
    
    return (
      <div className={`cube-face ${className}`}>
        <div className="face-label">
          {faceName}
          {expectedCenters[face] && (
            <span style={{ 
              fontSize: '0.8em', 
              opacity: 0.7, 
              marginLeft: '4px',
              color: colors.find(c => c.key === expectedCenters[face])?.color || '#666'
            }}>
              ({colors.find(c => c.key === expectedCenters[face])?.name || expectedCenters[face]})
            </span>
          )}
        </div>
        <div className="face-grid">
          {faceData.map((color, index) => {
            const isCenterSquare = isCenter(index);
            const expectedCenter = expectedCenters[face];
            const centerCorrect = !isCenterSquare || color === expectedCenter;
            
            return (
              <div
                key={index}
                className={`face-square ${isCenterSquare ? 'center' : ''}`}
                style={{
                  backgroundColor: colors.find(c => c.key === color)?.color || '#333',
                  cursor: 'pointer',
                  border: isCenterSquare && !centerCorrect ? '2px solid #ef4444' : 
                          isCenterSquare ? '2px solid rgba(255,255,255,0.3)' : 
                          '1px solid rgba(255,255,255,0.1)'
                }}
                onClick={() => handleSquareClick(face, index)}
                title={isCenterSquare && !centerCorrect ? 
                  `Center should be ${colors.find(c => c.key === expectedCenter)?.name}` : 
                  colors.find(c => c.key === color)?.name}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="cube-configurator">
      {fromVideo && (
        <div style={{ 
          background: 'rgba(152, 195, 121, 0.1)', 
          border: '1px solid rgba(152, 195, 121, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ color: '#98c379', fontWeight: '500', marginBottom: '8px' }}>
            📷 Detected from video capture
          </div>
          <div style={{ fontSize: '0.9em', opacity: '0.9' }}>
            Review the configuration below. Click on any square to change its color if the detection was incorrect.
            The center squares show the expected colors for each face.
          </div>
        </div>
      )}
      
      <div className="color-palette">
        <div className="palette-label">Select Color:</div>
        <div className="color-options">
          {colors.map(color => (
            <div
              key={color.key}
              className={`color-option ${selectedColor === color.key ? 'selected' : ''}`}
              style={{ backgroundColor: color.color }}
              onClick={() => setSelectedColor(color.key)}
              title={color.name}
            />
          ))}
        </div>
      </div>

      <div className="cube-net">
        <div className="net-row">
          <div className="net-spacer"></div>
          {renderFace('Top', localCubeState.faces.top, 'top-face')}
          <div className="net-spacer"></div>
          <div className="net-spacer"></div>
        </div>
        <div className="net-row">
          {renderFace('Left', localCubeState.faces.left, 'left-face')}
          {renderFace('Front', localCubeState.faces.front, 'front-face')}
          {renderFace('Right', localCubeState.faces.right, 'right-face')}
          {renderFace('Back', localCubeState.faces.back, 'back-face')}
        </div>
        <div className="net-row">
          <div className="net-spacer"></div>
          {renderFace('Bottom', localCubeState.faces.bottom, 'bottom-face')}
          <div className="net-spacer"></div>
          <div className="net-spacer"></div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="config-buttons">
        <button onClick={handleApplyConfiguration} className="btn btn-primary">
          Apply Configuration
        </button>
        <button onClick={handleReset} className="btn btn-secondary">
          Reset to Solved
        </button>
      </div>
    </div>
  );
}

export default CubeConfigurator;

