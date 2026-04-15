
cmake_minimum_required(VERSION 3.12)
project(kociemba_solver)

# Fix for pybind11 Python config error
set(PYBIND11_FINDPYTHON ON)

set(CMAKE_CXX_STANDARD 14)

# Find pybind11
find_package(pybind11 REQUIRED)
include_directories(/usr/include/python3.10)
# Add the solver library
add_library(kociemba_lib STATIC
    kociemba_api/src/solver/solve.cpp
    kociemba_api/src/solver/search.cpp
    kociemba_api/src/solver/cubiecube.cpp
    kociemba_api/src/solver/coordcube.cpp
    kociemba_api/src/solver/facecube.cpp
    kociemba_api/src/solver/prunetable_helpers.cpp
    kociemba_api/src/solver/random.cpp
    kociemba_api/src/solver/solve.h
    kociemba_api/src/solver/search.h
    kociemba_api/src/solver/cubiecube.h
    kociemba_api/src/solver/coordcube.h
    kociemba_api/src/solver/facecube.h
    kociemba_api/src/solver/prunetable_helpers.h
    kociemba_api/src/solver/random.h
)
set_property(TARGET kociemba_lib PROPERTY POSITION_INDEPENDENT_CODE ON)
# Create Python module
pybind11_add_module(kociemba_solver
    kociemba_api/src/kociemba_wrapper.cpp
)# Link the solver library
target_link_libraries(kociemba_solver PRIVATE kociemba_lib)

