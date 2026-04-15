// https://github.com/abhinavdogra21/Rubix-Cube-Solver
import React, { useState, useEffect, useRef } from 'react';
import RubiksCube from './RubiksCube';
import { CubeState } from './cubeState';
import CubeConfigurator from './CubeConfigurator';
import VideoInput from './VideoInput';
import './App.css';

const API_BASE_URL = 'http://localhost:5001'; // Changed to use port 5001

function App() {
  const [scrambleInput, setScrambleInput] = useState('');
  const [currentScramble, setCurrentScramble] = useState('');
  const [solution, setSolution] = useState('');
  const [cubeState, setCubeStateValue] = useState(new CubeState());
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking');
  const cubeRef = useRef();
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [solutionMoves, setSolutionMoves] = useState([]);
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [detectedFromVideo, setDetectedFromVideo] = useState(false);
  const [moveProgress, setMoveProgress] = useState({ current: 0, total: 0 });

  // Check API status on component mount
  useEffect(() => {
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/`);
      if (response.ok) {
        const data = await response.json();
        setApiStatus(data.kociemba_available ? 'available' : 'limited');
      } else {
        setApiStatus('unavailable');
      }
    } catch (error) {
      console.error('API check failed:', error);
      setApiStatus('unavailable');
    }
  };

  const generateRandomScramble = () => {
    const moves = ['R', 'L', 'U', 'D', 'F', 'B'];
    const modifiers = ['', '\'', '2'];
    const scrambleLength = 25;
    
    let scramble = [];
    let lastMove = '';
    
    for (let i = 0; i < scrambleLength; i++) {
      let move;
      do {
        move = moves[Math.floor(Math.random() * moves.length)];
      } while (move === lastMove);
      
      const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
      scramble.push(move + modifier);
      lastMove = move;
    }
    
    return scramble.join(' ');
  };

  const handleRandomScramble = async () => {
    setIsLoading(true);
    try {
      if (apiStatus === 'available') {
        // Try to get scramble from backend
        const response = await fetch(`${API_BASE_URL}/api/scramble`);
        const data = await response.json();
        
        if (data.success) {
          setScrambleInput(data.scramble);
        } else {
          // Fallback to local generation
          const scramble = generateRandomScramble();
          setScrambleInput(scramble);
        }
      } else {
        // Use local generation
        const scramble = generateRandomScramble();
        setScrambleInput(scramble);
      }
    } catch (error) {
      console.error('Scramble generation failed:', error);
      // Fallback to local generation
      const scramble = generateRandomScramble();
      setScrambleInput(scramble);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyScramble = async () => {
    if (!scrambleInput.trim()) return;
    
    setIsLoading(true);
    setCurrentScramble(''); // Clear currentScramble to indicate manual config or new scramble
    setSolution('');
    
    try {
      // Create new cube state and apply scramble
      const newCubeState = new CubeState();
      newCubeState.applyMoves(scrambleInput);
      setCubeStateValue(newCubeState);
      
      // Update 3D visualization
      if (cubeRef.current) {
        cubeRef.current.updateCubeState(newCubeState);
        cubeRef.current.animateScramble(scrambleInput);
      }
      setCurrentScramble(scrambleInput); // Set currentScramble after successful application
    } catch (error) {
      console.error('Apply scramble failed:', error);
    } finally {
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  // Helper to validate cube state (basic check: 54 chars, only valid colors)
  function isValidCubeStateString(state) {
    if (typeof state !== 'string' || state.length !== 54) return false;
    // Accept only W, R, G, Y, O, B
    return /^[WRGYOBwrgyob]{54}$/.test(state);
  }

  // Advanced cube state validation
  function advancedCubeStateValidation(state) {
    if (typeof state !== 'string' || state.length !== 54) return 'Cube state must be 54 characters.';

    state = state.toUpperCase();

    // Detect representation: if we find W or O letters, treat as color representation
    const colorLetters = ['W','Y','G','B','R','O'];
    const notationLetters = ['U','R','F','D','L','B'];

    const isColorRepresentation = [...state].some(ch => ch === 'W' || ch === 'O');

    if (isColorRepresentation) {
      // Validate color representation
      const counts = { W:0,Y:0,G:0,B:0,R:0,O:0 };
      for (const ch of state) {
        if (!colorLetters.includes(ch)) return `Invalid color letter: ${ch}. Allowed: W,Y,G,B,R,O`;
        counts[ch]++;
      }
      for (const color of colorLetters) {
        if (counts[color] !== 9) return `Each color must appear exactly 9 times (${color} has ${counts[color]}).`;
      }
      // Center checks (indices same as before)
      const centerIndices = [4,13,22,31,40,49];
      const centers = centerIndices.map(i => state[i]);
      const uniqueCenters = new Set(centers);
      if (uniqueCenters.size !== 6) return 'Each face must have a unique center color.';
      const opp = { W:'Y', Y:'W', R:'O', O:'R', G:'B', B:'G' };
      if (opp[centers[0]] !== centers[3]) return 'White and Yellow must be on opposite faces';
      if (opp[centers[4]] !== centers[1]) return 'Red and Orange must be on opposite faces';
      if (opp[centers[2]] !== centers[5]) return 'Green and Blue must be on opposite faces';

      return null;
    } else {
      // Validate notation representation
      const counts = { U:0,R:0,F:0,D:0,L:0,B:0 };
      for (const ch of state) {
        if (!notationLetters.includes(ch)) return `Invalid notation letter: ${ch}. Allowed: U,R,F,D,L,B`;
        counts[ch]++;
      }
      for (const letter of notationLetters) {
        if (counts[letter] !== 9) return `Each face letter must appear exactly 9 times (${letter} has ${counts[letter]}).`;
      }
      // Center letters order: indices 4(U), 13(R), 22(F), 31(D), 40(L), 49(B)
      const centers = [state[4], state[13], state[22], state[31], state[40], state[49]];
      const uniqueCenters = new Set(centers);
      if (uniqueCenters.size !== 6) return 'Each face must have a unique center.';
      const opp = { U:'D', D:'U', R:'L', L:'R', F:'B', B:'F' };
      if (opp[centers[0]] !== centers[3]) return 'U and D centers must be opposite';
      if (opp[centers[1]] !== centers[4]) return 'R and L centers must be opposite';
      if (opp[centers[2]] !== centers[5]) return 'F and B centers must be opposite';

      return null;
    }
  }

  // Convert CubeState (internal colors) to solver digit string expected by backend
  function cubeStateToDigits(stateObj) {
    // Determine mapping from center colors to digits 0-5 in order U,R,F,D,L,B (top,right,front,bottom,left,back)
    const centers = [
      stateObj.faces.top[4],
      stateObj.faces.right[4],
      stateObj.faces.front[4],
      stateObj.faces.bottom[4],
      stateObj.faces.left[4],
      stateObj.faces.back[4]
    ];
    const colorToDigit = {};
    centers.forEach((col, idx)=>{ colorToDigit[col] = idx.toString(); });
    const facesOrder = ['top','right','front','bottom','left','back'];
    let result='';
    for(const face of facesOrder){
      for(let i=0;i<9;i++){
        const color=stateObj.faces[face][i];
        result += colorToDigit[color] ?? '0';
      }
    }
    return result;
  }

  const handleSolveCube = async () => {
    if (!currentScramble && cubeState.toString() === new CubeState().toString()) {
      setSolution('Cube is already solved!');
      setIsLoading(false);
      setCurrentMoveIndex(-1);
      setIsAnimating(false);
      setSolutionMoves([]);
      setMoveProgress({ current: 0, total: 0 });
      return;
    }
    
    // Reset solution state
    setCurrentMoveIndex(-1);
    setIsAnimating(false);
    setSolutionMoves([]);
    setMoveProgress({ current: 0, total: 0 });
    
    // If user typed a scramble but didn't press "Apply", use it directly
    let effectiveScramble = currentScramble;
    if (!effectiveScramble && scrambleInput.trim()) {
      effectiveScramble = scrambleInput.trim();
    }

    // Validate cube state before sending to backend
    if (!effectiveScramble) {
      const advErr = advancedCubeStateValidation(cubeState.toString());
      if (advErr) {
        alert('Invalid cube configuration! ' + advErr);
        return;
      }
    }
    
    setIsLoading(true);
    try {
      if (apiStatus === 'available') {
        // Always use /api/solve for both manual and scramble workflows
        const payload = { cube_state: cubeStateToDigits(cubeState) };
        const response = await fetch(`${API_BASE_URL}/api/solve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.success && data.solution) {
          const moves = data.solution.trim().split(/\s+/).filter(move => move.length > 0);
          setSolution(data.solution);
          setSolutionMoves(moves);
          setMoveProgress({ current: 0, total: moves.length });
        } else {
          throw new Error(data.error || 'Backend solver failed');
        }
      } else {
        throw new Error('Backend not available');
      }
    } catch (error) {
      console.error('Backend solve failed:', error);
      
      if (apiStatus === 'available') {
        // Backend reachable but failed
        alert(`Backend error: ${error.message}`);
      } else {
        // Fallback still applies
        try {
          if (effectiveScramble) {
            const moves = effectiveScramble.trim().split(/\s+/).filter(move => move.length > 0);
            const inverseMoves = moves.reverse().map(move => {
              if (move.endsWith('\'')) {
                return move.slice(0, -1);
              } else if (move.endsWith('2')) {
                return move;
              } else {
                return move + '\'';
              }
            });
            
            const solutionMoves = inverseMoves.join(' ');
            setSolution(solutionMoves);
            const moveArray = solutionMoves.trim().split(/\s+/).filter(move => move.length > 0);
            setSolutionMoves(moveArray);
            setMoveProgress({ current: 0, total: moveArray.length });
          } else {
            setSolution('The backend is unavailable. The fallback solver can only solve cubes scrambled with the "Random Scramble" button.\n\nFor custom/manual configurations, please start the backend server.');
            setSolutionMoves([]);
            setMoveProgress({ current: 0, total: 0 });
          }
        } catch (fallbackError) {
          console.error('Fallback solve failed:', fallbackError);
          setSolution('Error: Could not solve cube');
          setSolutionMoves([]);
          setMoveProgress({ current: 0, total: 0 });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextMove = async () => {
    if (!solution || isAnimating) return;
    const moves = solutionMoves;
    if (currentMoveIndex + 1 >= moves.length) return;

    const nextMoveIndex = currentMoveIndex + 1;
    setIsAnimating(true);
    try {
      if (cubeRef.current) {
        const nextMove = moves[nextMoveIndex];
        await cubeRef.current.animateMove(nextMove);
        // Attempt to fetch updated cube state but don't block index/progress update on it
        let updated;
        try {
          updated = cubeRef.current.getCurrentState();
          if (updated) setCubeStateValue(updated);
        } catch (e) {
          console.warn('Could not get cube state after move');
        }
      }
    } catch (error) {
      console.error('Error applying move:', error);
    } finally {
      // Update move index & progress regardless of animation success
      const movesArr = solutionMoves;
      setCurrentMoveIndex(nextMoveIndex);
      setMoveProgress({ current: nextMoveIndex + 1, total: movesArr.length });
      setIsAnimating(false);
    }
  };

  const handlePrevMove = async () => {
    if (!solution || isAnimating || currentMoveIndex < 0) return;

    const moves = solutionMoves;
    const currentMove = moves[currentMoveIndex];
    setIsAnimating(true);
    try {
      if (cubeRef.current) {
        let inverseMove;
        if (currentMove.endsWith("'")) {
          inverseMove = currentMove.slice(0, -1);
        } else if (currentMove.endsWith('2')) {
          inverseMove = currentMove; // 180° move is its own inverse
        } else {
          inverseMove = currentMove + "'";
        }
        await cubeRef.current.animateMove(inverseMove);
        // sync cube state if available
        let updated;
        try {
          updated = cubeRef.current.getCurrentState();
          if (updated) setCubeStateValue(updated);
        } catch {}
      }
    } catch (error) {
      console.error('Error applying move:', error);
    } finally {
      const newMoveIndex = currentMoveIndex - 1;
      setCurrentMoveIndex(newMoveIndex);
      setMoveProgress({ current: newMoveIndex + 1, total: moves.length });
      setIsAnimating(false);
    }
  };

  const handlePlaySolution = async () => {
    if (!solution || isAnimating) return;
    
    const moves = solutionMoves;
    if (currentMoveIndex + 1 >= moves.length) {
      setCurrentMoveIndex(-1);
      setMoveProgress({ current: 0, total: moves.length });
      return;
    }
    
    setIsAnimating(true);
    
    try {
      // Apply all remaining moves
      const remainingMoves = moves.slice(currentMoveIndex + 1);
      if (cubeRef.current) {
        await cubeRef.current.animateSolution(remainingMoves.join(' '));
        const updated = cubeRef.current.getCurrentState();
        if (updated) {
          setCubeStateValue(updated);
          setCurrentMoveIndex(moves.length - 1);
          setMoveProgress({ current: moves.length, total: moves.length });
        }
      }
    } catch (error) {
      console.error('Error playing solution:', error);
    } finally {
      setIsAnimating(false);
    }
  };

  const handleReset = () => {
    const newCubeState = new CubeState();
    setCubeStateValue(newCubeState);
    setScrambleInput('');
    setCurrentScramble('');
    setSolution('');
    
    if (cubeRef.current) {
      cubeRef.current.updateCubeState(newCubeState);
    }
  };

  const handleCubeStateChange = (newCubeState) => {
    setCubeStateValue(newCubeState);
    setCurrentScramble(''); // Clear scramble when manually configuring
    setSolution('');
    setDetectedFromVideo(false); // Clear video detection flag
    
    if (cubeRef.current) {
      cubeRef.current.updateCubeState(newCubeState);
    }
  };

  const handleVideoDetection = (detected) => {
    try {
      let newCubeState;
      if (detected instanceof CubeState) {
        newCubeState = detected;
      } else if (typeof detected === 'string') {
        newCubeState = CubeState.fromString(detected);
      } else if (detected && typeof detected === 'object' && detected.faces) {
        // Plain object with faces
        newCubeState = new CubeState();
        newCubeState.faces = JSON.parse(JSON.stringify(detected.faces));
      } else {
        throw new Error('Unrecognized cube state');
      }

      // Set the detected state and open configuration for manual corrections
      setCubeStateValue(newCubeState);
      setDetectedFromVideo(true);
      setShowConfiguration(true);
      
      if (cubeRef.current) {
        cubeRef.current.updateCubeState(newCubeState);
      }
      
      // Show success message
      alert('Cube state detected! Review and correct any errors in the Manual Configuration section below, then click "Apply Configuration".');
      
    } catch (error) {
      console.error('Invalid cube state from video detection:', error);
      alert('Invalid cube state detected from video. Please try again with better lighting and cube positioning.');
    }
  };

  const getStatusColor = () => {
    switch (apiStatus) {
      case 'available': return '#98c379'; // Greenish color from image
      case 'limited': return '#f59e0b';
      case 'unavailable': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (apiStatus) {
      case 'available': return '🚀 Kociemba Solver Ready';
      case 'limited': return '⚡ Limited Mode (Fallback Solver)';
      case 'unavailable': return '⚠️ Backend Unavailable';
      default: return '🔍 Checking...';
    }
  };

  return (
    <div className="App">
      <header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '2rem' }}>
        <div className="status-indicator" style={{ color: getStatusColor(), minWidth: 220, textAlign: 'left' }}>
          {getStatusText()}
        </div>
        <h1 style={{ margin: 0 }}>3D Interactive Rubik's Cube Solver</h1>
      </header>
      <main className="app-main">
        <div className="cube-section">
          <div className="cube-container">
            <div className="cube-header">
              <h2>3D Cube</h2>
            </div>
            <div className="cube-display">
              <RubiksCube ref={cubeRef} cubeState={cubeState} />
            </div>
          </div>
        </div>

        <div className="controls-section">
          <div className="scramble-section">
            <div className="section-header">
              <h2>Scramble</h2>
            </div>
            <div className="scramble-controls">
              <textarea
                value={scrambleInput}
                onChange={(e) => setScrambleInput(e.target.value)}
                placeholder="Enter scramble (e.g., R U R' F R F') or generate random..."
                className="scramble-input"
                rows={3}
              />
              <div className="scramble-buttons">
                <button 
                  onClick={handleRandomScramble}
                  className="btn btn-outline"
                  disabled={isLoading}
                >
                  Random Scramble
                </button>
                <button 
                  onClick={handleApplyScramble}
                  className="btn btn-primary"
                  disabled={isLoading || !scrambleInput.trim()}
                >
                  Apply Scramble
                </button>
              </div>
            </div>
          </div>

          <div className="configuration-section">
            <div className="section-header" onClick={() => setShowConfiguration(!showConfiguration)} style={{ cursor: 'pointer' }}>
              <h2>
                Manual Configuration 
                <span style={{ fontSize: '0.8em', marginLeft: '10px' }}>
                  {showConfiguration ? '▼ Hide' : '▶ Show'}
                </span>
                {detectedFromVideo && (
                  <span style={{ 
                    fontSize: '0.7em', 
                    color: '#98c379', 
                    marginLeft: '10px',
                    background: 'rgba(152, 195, 121, 0.2)',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    📷 From Video - Review & Correct
                  </span>
                )}
              </h2>
            </div>
            {showConfiguration && (
              <CubeConfigurator 
                cubeState={cubeState} 
                onCubeStateChange={handleCubeStateChange}
                fromVideo={detectedFromVideo}
              />
            )}
          </div>

          <div className="video-section">
            <div className="section-header">
              <h2>Video Detection</h2>
            </div>
            <VideoInput onCubeDetected={handleVideoDetection} />
          </div>

          <div className="solver-section">
            <div className="section-header">
              <h2>Solver</h2>
            </div>
            <div className="solver-controls">
              <button 
                onClick={handleSolveCube}
                className="btn btn-success"
                disabled={isLoading}
              >
                {isLoading ? '🔄 Solving...' : '🎯 Find Solution'}
              </button>
              <button 
                onClick={handleReset}
                className="btn btn-secondary"
                disabled={isLoading}
              >
                Reset Cube
              </button>
              {solution && solution.length > 0 && !solution.includes('Error') && !solution.includes('backend') && (
                <div className="solution-display">
                  <h3>Solution:</h3>
                  <div className="solution-text">
                    {solution.split(' ').map((move, i) => (
                      <span
                        key={i}
                        className={`move ${i === currentMoveIndex ? 'current' : i < currentMoveIndex ? 'applied' : ''}`}
                      >
                        {move}
                      </span>
                    ))}
                  </div>
                  <div className="solution-controls">
                    <div className="solution-progress">
                      <div>Step {moveProgress.current} of {moveProgress.total}</div>
                      <div className="current-move">
                        Current Move: {currentMoveIndex >= 0 ? solutionMoves[currentMoveIndex] : 'None'}
                      </div>
                    </div>
                    <button 
                      onClick={handlePrevMove} 
                      disabled={isAnimating || currentMoveIndex < 0}
                    >
                      Previous
                    </button>
                    <button 
                      onClick={handleNextMove}
                      disabled={isAnimating || currentMoveIndex + 1 >= solutionMoves.length}
                    >
                      Next ({currentMoveIndex + 2 <= solutionMoves.length ? solutionMoves[currentMoveIndex + 1] : ''})
                    </button>
                    <button 
                      onClick={handlePlaySolution}
                      disabled={isAnimating || currentMoveIndex + 1 >= solutionMoves.length}
                    >
                      Play All
                    </button>
                  </div>
                </div>
              )}
              {solution && (solution.includes("Error") || solution.includes("backend")) && (
                <div className="solution-display error">
                  <p style={{ color: "red", fontWeight: "bold" }}>{solution}</p>
                </div>
              )}
            </div> {/* End of solver-controls */}
          </div> {/* End of solver-section */}
        </div> {/* End of controls-section */}
      </main>
    </div>
  );
}

export default App;


