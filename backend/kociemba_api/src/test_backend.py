#!/usr/bin/env python3
print("Python is working!")
print("Testing imports...")

try:
    import flask
    print("Flask imported successfully")
except ImportError as e:
    print(f"Flask import error: {e}")

try:
    import kociemba_solver
    print("Kociemba solver imported successfully")
except ImportError as e:
    print(f"Kociemba solver import error: {e}")

print("Starting Flask app...")
from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello():
    return "Hello World!"

if __name__ == '__main__':
    print("Running Flask app on port 5001...")
    app.run(debug=True, port=5001, host='0.0.0.0')
