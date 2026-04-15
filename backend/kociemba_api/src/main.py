# https://github.com/abhinavdogra21/Rubix-Cube-Solver
#!/usr/bin/env python3
"""
Flask API for Kociemba Rubik's Cube Solver
"""

import os
import sys
import random
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add the src directory to Python path to import our solver
sys.path.append(os.path.dirname(__file__))

try:
    from kociemba_solver import solve
except ImportError as e:
    print(f"Warning: Could not import Kociemba solver: {e}")
    KOCIEMBA_AVAILABLE = False
else:
    KOCIEMBA_AVAILABLE = True

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/')
def index():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'Kociemba Rubik\'s Cube Solver API',
        'kociemba_available': KOCIEMBA_AVAILABLE
    })

@app.route('/api/solve', methods=['POST'])
def api_solve_cube():
    """Solve a cube from cube state string"""
    try:
        data = request.get_json()
        if not data or 'cube_state' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing cube_state parameter'
            }), 400
        cube_state = data['cube_state']
        print(f"Received cube state: {cube_state}")
        print(f"Cube state length: {len(cube_state)}")
        print(f"Cube state characters: {set(cube_state)}")
        # Convert digit cube state (0-5) to letter format for solver
        digit_to_letter = ['U', 'R', 'F', 'D', 'L', 'B']
        if all(c in '012345' for c in cube_state) and len(cube_state) == 54:
            cube_state_letters = ''.join(digit_to_letter[int(c)] for c in cube_state)
        else:
            cube_state_letters = cube_state
        if KOCIEMBA_AVAILABLE:
            solution = solve(cube_state_letters)
            if solution.startswith('Error:'):
                return jsonify({
                    'success': False,
                    'error': solution
                }), 400
            return jsonify({
                'success': True,
                'solution': solution
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Kociemba solver not available'
            }), 503
    except Exception as e:
        print(f"Solve error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500


if __name__ == '__main__':
    app.run(debug=True, port=5001)

