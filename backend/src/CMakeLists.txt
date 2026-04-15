## This file is intentionally deleted. Use ../CMakeLists.txt for backend build.
cmake_minimum_required(VERSION 3.12)
project(KociembaCubeSolver)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find Python and pybind11
find_package(Python3 COMPONENTS Interpreter Development REQUIRED)
find_package(pybind11 REQUIRED)

# Include directories
include_directories(${Python3_INCLUDE_DIRS})
include_directories(${pybind11_INCLUDE_DIRS})
include_directories(${CMAKE_SOURCE_DIR}/../kociemba_api/src)
include_directories(${CMAKE_SOURCE_DIR}/../kociemba_api/src/Solver)

# Solver sources
set(SOLVER_SOURCES
    ../kociemba_api/src/Solver/solve.cpp
    ../kociemba_api/src/Solver/search.cpp
    ../kociemba_api/src/Solver/cubiecube.cpp
    ../kociemba_api/src/Solver/coordcube.cpp
    ../kociemba_api/src/Solver/facecube.cpp
    ../kociemba_api/src/Solver/prunetable_helpers.cpp
    ../kociemba_api/src/Solver/random.cpp
)

# Executable for testing
add_executable(run_solver ../kociemba_api/src/Solver/run_solver.cpp ${SOLVER_SOURCES})

# Python module
pybind11_add_module(kociemba_solver
    ../kociemba_api/src/kociemba_wrapper.cpp
    ${SOLVER_SOURCES}
)


