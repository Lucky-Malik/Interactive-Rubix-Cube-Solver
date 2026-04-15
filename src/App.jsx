// https://github.com/Lucky-Malik/Interactive-Rubix-Cube-Solver
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import RubiksCube from './RubiksCube';
import { CubeState, invertMoveSequence, parseMoveSequence } from './cubeState';
import CubeConfigurator from './CubeConfigurator';
import VideoInput from './VideoInput';
import './App.css';

const API_BASE_URL = 'http://localhost:5001';
const PLAYBACK_INTERVAL_MS = 420;

function App() {
  const [scrambleInput, setScrambleInput] = useState('');
  const [currentScramble, setCurrentScramble] = useState('');
  const [solution, setSolution] = useState('');
  const [cubeState, setCubeStateValue] = useState(() => new CubeState());
  const [timelineBaseState, setTimelineBaseState] = useState(() => new CubeState());
  const [timelineMoves, setTimelineMoves] = useState([]);
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking');
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [detectedFromVideo, setDetectedFromVideo] = useState(false);
  const cubeRef = useRef();

  const updateVisualCubeState = useCallback((nextState) => {
    const clonedState = CubeState.cloneFrom(nextState);
    setCubeStateValue(clonedState);
    if (cubeRef.current) {
      cubeRef.current.updateCubeState(clonedState);
    }
  }, []);

  const buildStateAtIndex = useCallback((baseState, moves, targetIndex) => {
    const nextState = CubeState.cloneFrom(baseState);
    for (let i = 0; i < targetIndex; i += 1) {
      nextState.applyMove(moves[i].move);
    }
    return nextState;
  }, []);

  const moveTimelineTo = useCallback((targetIndex) => {
    const clampedIndex = Math.max(0, Math.min(targetIndex, timelineMoves.length));
    const nextState = buildStateAtIndex(timelineBaseState, timelineMoves, clampedIndex);
    updateVisualCubeState(nextState);
    setTimelineIndex(clampedIndex);
  }, [buildStateAtIndex, timelineBaseState, timelineMoves, updateVisualCubeState]);

  const resetTimeline = useCallback((baseState) => {
    const nextBaseState = CubeState.cloneFrom(baseState);
    setTimelineBaseState(nextBaseState);
    setTimelineMoves([]);
    setTimelineIndex(0);
    setIsTimelinePlaying(false);
  }, []);

  const createTimelineEntries = useCallback((moves, phase, startIndex = 0) => (
    moves.map((move, index) => ({
      id: `${phase}-${startIndex + index}-${move}`,
      move,
      phase
    }))
  ), []);

  const checkApiStatus = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    checkApiStatus();
  }, [checkApiStatus]);

  useEffect(() => {
    if (!isTimelinePlaying) return undefined;

    if (timelineIndex >= timelineMoves.length) {
      setIsTimelinePlaying(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      const nextIndex = timelineIndex + 1;
      const nextState = buildStateAtIndex(timelineBaseState, timelineMoves, nextIndex);
      updateVisualCubeState(nextState);
      setTimelineIndex(nextIndex);
    }, PLAYBACK_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [buildStateAtIndex, isTimelinePlaying, timelineBaseState, timelineIndex, timelineMoves, updateVisualCubeState]);

  const generateRandomScramble = () => {
    const moves = ['R', 'L', 'U', 'D', 'F', 'B'];
    const modifiers = ['', '\'', '2'];
    const scrambleLength = 25;

    const scramble = [];
    let lastMove = '';

    for (let i = 0; i < scrambleLength; i += 1) {
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
        const response = await fetch(`${API_BASE_URL}/api/scramble`);
        const data = await response.json();

        if (data.success) {
          setScrambleInput(data.scramble);
        } else {
          setScrambleInput(generateRandomScramble());
        }
      } else {
        setScrambleInput(generateRandomScramble());
      }
    } catch (error) {
      console.error('Scramble generation failed:', error);
      setScrambleInput(generateRandomScramble());
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyScramble = async () => {
    const scrambleMoves = parseMoveSequence(scrambleInput);
    if (scrambleMoves.length === 0) return;

    setIsLoading(true);
    setIsTimelinePlaying(false);
    setSolution('');
    setDetectedFromVideo(false);

    try {
      const baseState = new CubeState();
      const scrambledState = baseState.clone();
      scrambleMoves.forEach((move) => scrambledState.applyMove(move));

      setTimelineBaseState(baseState.clone());
      setTimelineMoves(createTimelineEntries(scrambleMoves, 'scramble'));
      setTimelineIndex(scrambleMoves.length);
      updateVisualCubeState(scrambledState);
      setCurrentScramble(scrambleMoves.join(' '));
    } catch (error) {
      console.error('Apply scramble failed:', error);
    } finally {
      window.setTimeout(() => setIsLoading(false), 250);
    }
  };

  function advancedCubeStateValidation(state) {
    if (typeof state !== 'string' || state.length !== 54) return 'Cube state must be 54 characters.';

    const normalizedState = state.toUpperCase();
    const colorLetters = ['W', 'Y', 'G', 'B', 'R', 'O'];
    const notationLetters = ['U', 'R', 'F', 'D', 'L', 'B'];
    const isColorRepresentation = [...normalizedState].some((ch) => ch === 'W' || ch === 'O');

    if (isColorRepresentation) {
      const counts = { W: 0, Y: 0, G: 0, B: 0, R: 0, O: 0 };
      for (const ch of normalizedState) {
        if (!colorLetters.includes(ch)) return `Invalid color letter: ${ch}. Allowed: W,Y,G,B,R,O`;
        counts[ch] += 1;
      }
      for (const color of colorLetters) {
        if (counts[color] !== 9) return `Each color must appear exactly 9 times (${color} has ${counts[color]}).`;
      }

      const centerIndices = [4, 13, 22, 31, 40, 49];
      const centers = centerIndices.map((i) => normalizedState[i]);
      const uniqueCenters = new Set(centers);
      if (uniqueCenters.size !== 6) return 'Each face must have a unique center color.';

      const oppositeColors = { W: 'Y', Y: 'W', R: 'O', O: 'R', G: 'B', B: 'G' };
      if (oppositeColors[centers[0]] !== centers[3]) return 'White and Yellow must be on opposite faces';
      if (oppositeColors[centers[4]] !== centers[1]) return 'Red and Orange must be on opposite faces';
      if (oppositeColors[centers[2]] !== centers[5]) return 'Green and Blue must be on opposite faces';
      return null;
    }

    const counts = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 };
    for (const ch of normalizedState) {
      if (!notationLetters.includes(ch)) return `Invalid notation letter: ${ch}. Allowed: U,R,F,D,L,B`;
      counts[ch] += 1;
    }
    for (const letter of notationLetters) {
      if (counts[letter] !== 9) return `Each face letter must appear exactly 9 times (${letter} has ${counts[letter]}).`;
    }

    const centers = [normalizedState[4], normalizedState[13], normalizedState[22], normalizedState[31], normalizedState[40], normalizedState[49]];
    const uniqueCenters = new Set(centers);
    if (uniqueCenters.size !== 6) return 'Each face must have a unique center.';

    const oppositeFaces = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' };
    if (oppositeFaces[centers[0]] !== centers[3]) return 'U and D centers must be opposite';
    if (oppositeFaces[centers[1]] !== centers[4]) return 'R and L centers must be opposite';
    if (oppositeFaces[centers[2]] !== centers[5]) return 'F and B centers must be opposite';

    return null;
  }

  function cubeStateToDigits(stateObj) {
    const centers = [
      stateObj.faces.top[4],
      stateObj.faces.right[4],
      stateObj.faces.front[4],
      stateObj.faces.bottom[4],
      stateObj.faces.left[4],
      stateObj.faces.back[4]
    ];

    const colorToDigit = {};
    centers.forEach((color, index) => {
      colorToDigit[color] = index.toString();
    });

    const facesOrder = ['top', 'right', 'front', 'bottom', 'left', 'back'];
    let result = '';
    for (const face of facesOrder) {
      for (let i = 0; i < 9; i += 1) {
        const color = stateObj.faces[face][i];
        result += colorToDigit[color] ?? '0';
      }
    }
    return result;
  }

  const handleSolveCube = async () => {
    const solvedState = new CubeState();
    const visibleState = CubeState.cloneFrom(cubeState);
    const historyPrefix = timelineMoves.slice(0, timelineIndex);
    const historyStartIndex = historyPrefix.length;

    if (visibleState.toString() === solvedState.toString()) {
      setSolution('Cube is already solved!');
      setIsTimelinePlaying(false);
      setTimelineMoves(historyPrefix);
      setTimelineIndex(historyStartIndex);
      return;
    }

    const validationError = advancedCubeStateValidation(visibleState.toString());
    if (!currentScramble && timelineMoves.length === 0 && validationError) {
      alert(`Invalid cube configuration! ${validationError}`);
      return;
    }

    setIsLoading(true);
    setIsTimelinePlaying(false);

    try {
      if (apiStatus !== 'available') {
        throw new Error('Backend not available');
      }

      const payload = { cube_state: cubeStateToDigits(visibleState) };
      const response = await fetch(`${API_BASE_URL}/api/solve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!data.success || !data.solution) {
        throw new Error(data.error || 'Backend solver failed');
      }

      const solverMoves = parseMoveSequence(data.solution);
      setSolution(data.solution);
      setTimelineMoves([
        ...historyPrefix,
        ...createTimelineEntries(solverMoves, 'solution', historyStartIndex)
      ]);
      setTimelineIndex(historyStartIndex);
    } catch (error) {
      console.error('Backend solve failed:', error);

      if (apiStatus === 'available') {
        alert(`Backend error: ${error.message}`);
      } else if (historyPrefix.length > 0) {
        const fallbackMoves = invertMoveSequence(historyPrefix.map((entry) => entry.move));
        const fallbackSolution = fallbackMoves.join(' ');
        setSolution(fallbackSolution);
        setTimelineMoves([
          ...historyPrefix,
          ...createTimelineEntries(fallbackMoves, 'solution', historyStartIndex)
        ]);
        setTimelineIndex(historyStartIndex);
      } else {
        setSolution('The backend is unavailable. The fallback solver can only reverse move history that already exists in the timeline.');
        setTimelineMoves(historyPrefix);
        setTimelineIndex(historyStartIndex);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndoMove = () => {
    if (timelineIndex === 0) return;
    setIsTimelinePlaying(false);
    moveTimelineTo(timelineIndex - 1);
  };

  const handleRedoMove = () => {
    if (timelineIndex >= timelineMoves.length) return;
    setIsTimelinePlaying(false);
    moveTimelineTo(timelineIndex + 1);
  };

  const handleTimelineToggle = () => {
    if (timelineMoves.length === 0) return;
    if (isTimelinePlaying) {
      setIsTimelinePlaying(false);
      return;
    }
    if (timelineIndex >= timelineMoves.length) {
      moveTimelineTo(0);
    }
    setIsTimelinePlaying(true);
  };

  const handleReset = () => {
    const newCubeState = new CubeState();
    updateVisualCubeState(newCubeState);
    setScrambleInput('');
    setCurrentScramble('');
    setSolution('');
    setDetectedFromVideo(false);
    resetTimeline(newCubeState);
  };

  const handleCubeStateChange = (newCubeState) => {
    const clonedState = CubeState.cloneFrom(newCubeState);
    updateVisualCubeState(clonedState);
    setCurrentScramble('');
    setSolution('');
    setDetectedFromVideo(false);
    resetTimeline(clonedState);
  };

  const handleVideoDetection = (detected) => {
    try {
      let newCubeState;
      if (detected instanceof CubeState) {
        newCubeState = detected;
      } else if (typeof detected === 'string') {
        newCubeState = CubeState.fromString(detected);
      } else if (detected && typeof detected === 'object' && detected.faces) {
        newCubeState = CubeState.cloneFrom(detected);
      } else {
        throw new Error('Unrecognized cube state');
      }

      const clonedState = CubeState.cloneFrom(newCubeState);
      updateVisualCubeState(clonedState);
      setDetectedFromVideo(true);
      setShowConfiguration(true);
      setCurrentScramble('');
      setSolution('');
      resetTimeline(clonedState);

      alert('Cube state detected! Review and correct any errors in the Manual Configuration section below, then click "Apply Configuration".');
    } catch (error) {
      console.error('Invalid cube state from video detection:', error);
      alert('Invalid cube state detected from video. Please try again with better lighting and cube positioning.');
    }
  };

  const getStatusColor = () => {
    switch (apiStatus) {
      case 'available': return '#98c379';
      case 'limited': return '#f59e0b';
      case 'unavailable': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (apiStatus) {
      case 'available': return 'Kociemba Solver Ready';
      case 'limited': return 'Limited Mode (Fallback Solver)';
      case 'unavailable': return 'Backend Unavailable';
      default: return 'Checking...';
    }
  };

  const timelineSummary = useMemo(() => {
    const scrambleCount = timelineMoves.filter((entry) => entry.phase === 'scramble').length;
    const solutionCount = timelineMoves.filter((entry) => entry.phase === 'solution').length;
    const currentEntry = timelineIndex > 0 ? timelineMoves[timelineIndex - 1] : null;
    const nextEntry = timelineMoves[timelineIndex] ?? null;
    return {
      scrambleCount,
      solutionCount,
      currentEntry,
      nextEntry
    };
  }, [timelineIndex, timelineMoves]);

  return (
    <div className="App">
      <header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '2rem' }}>
        <div className="status-indicator" style={{ color: getStatusColor(), minWidth: 220, textAlign: 'left' }}>
          {getStatusText()}
        </div>
        <h1 style={{ margin: 0 }}>3D Interactive Rubik&apos;s Cube Solver</h1>
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
                onChange={(event) => setScrambleInput(event.target.value)}
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
                  disabled={isLoading || parseMoveSequence(scrambleInput).length === 0}
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
                  <span
                    style={{
                      fontSize: '0.7em',
                      color: '#98c379',
                      marginLeft: '10px',
                      background: 'rgba(152, 195, 121, 0.2)',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}
                  >
                    From Video - Review and Correct
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
                {isLoading ? 'Solving...' : 'Find Solution'}
              </button>
              <button
                onClick={handleReset}
                className="btn btn-secondary"
                disabled={isLoading}
              >
                Reset Cube
              </button>

              {timelineMoves.length > 0 && (
                <div className="timeline-panel">
                  <div className="timeline-heading">
                    <div>
                      <h3>Move History Timeline</h3>
                      <p>Scrub through the scramble and solution like a replay.</p>
                    </div>
                    <div className="timeline-counters">
                      <span className="timeline-pill scramble">Scramble {timelineSummary.scrambleCount}</span>
                      <span className="timeline-pill solution">Solution {timelineSummary.solutionCount}</span>
                    </div>
                  </div>

                  <div className="timeline-status">
                    <div>
                      <span className="timeline-label">Position</span>
                      <strong>{timelineIndex} / {timelineMoves.length}</strong>
                    </div>
                    <div>
                      <span className="timeline-label">Current</span>
                      <strong>{timelineSummary.currentEntry ? timelineSummary.currentEntry.move : 'Start'}</strong>
                    </div>
                    <div>
                      <span className="timeline-label">Next</span>
                      <strong>{timelineSummary.nextEntry ? timelineSummary.nextEntry.move : 'End'}</strong>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max={timelineMoves.length}
                    value={timelineIndex}
                    onChange={(event) => {
                      setIsTimelinePlaying(false);
                      moveTimelineTo(Number(event.target.value));
                    }}
                    className="timeline-slider"
                  />

                  <div className="timeline-controls">
                    <button
                      className="btn btn-small"
                      onClick={() => {
                        setIsTimelinePlaying(false);
                        moveTimelineTo(0);
                      }}
                      disabled={timelineIndex === 0}
                    >
                      Start
                    </button>
                    <button
                      className="btn btn-small"
                      onClick={handleUndoMove}
                      disabled={timelineIndex === 0}
                    >
                      Undo
                    </button>
                    <button
                      className="btn btn-small btn-primary"
                      onClick={handleTimelineToggle}
                      disabled={timelineMoves.length === 0}
                    >
                      {isTimelinePlaying ? 'Pause' : 'Play'}
                    </button>
                    <button
                      className="btn btn-small"
                      onClick={handleRedoMove}
                      disabled={timelineIndex >= timelineMoves.length}
                    >
                      Redo
                    </button>
                    <button
                      className="btn btn-small"
                      onClick={() => {
                        setIsTimelinePlaying(false);
                        moveTimelineTo(timelineMoves.length);
                      }}
                      disabled={timelineIndex >= timelineMoves.length}
                    >
                      End
                    </button>
                  </div>

                  <div className="timeline-strip">
                    {timelineMoves.map((entry, index) => {
                      const isApplied = index < timelineIndex;
                      const isCurrent = timelineIndex > 0 && index === timelineIndex - 1;
                      const isUpcoming = index === timelineIndex;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          className={`timeline-step ${entry.phase} ${isApplied ? 'applied' : ''} ${isCurrent ? 'current' : ''} ${isUpcoming ? 'upcoming' : ''}`}
                          onClick={() => {
                            setIsTimelinePlaying(false);
                            moveTimelineTo(index + 1);
                          }}
                          title={`${entry.phase === 'scramble' ? 'Scramble' : 'Solution'} move ${index + 1}: ${entry.move}`}
                        >
                          <span className="timeline-step-index">{index + 1}</span>
                          <span className="timeline-step-move">{entry.move}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {solution && solution.length > 0 && !solution.includes('backend') && !solution.includes('Error') && (
                <div className="solution-display">
                  <h3>Solution</h3>
                  <div className="solution-text">
                    {solution.split(' ').map((move, index) => (
                      <span key={`${move}-${index}`} className="move">
                        {move}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {solution && (solution.includes('Error') || solution.includes('backend')) && (
                <div className="solution-display error">
                  <p>{solution}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
