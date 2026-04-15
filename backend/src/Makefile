# Makefile for Kociemba Cube Solver
## This file is intentionally deleted. Use CMake for backend build.
CXX = g++
CXXFLAGS = -std=c++17 -O3 -fPIC -Wall -Wextra
PYTHON_INCLUDE = $(shell python3 -c "import sysconfig; print(sysconfig.get_path('include'))")
PYTHON_LIB_DIR = /opt/homebrew/opt/python@3.13/Frameworks/Python.framework/Versions/3.13/lib
PYTHON_LIBS = $(shell python3-config --libs --embed)
# Source files
KOCIEMBA_SOURCES = kociemba_solver.cpp
KOCIEMBA_HEADERS = kociemba_solver.h
KOCIEMBA_TEST = test_kociemba.cpp

# Legacy source files (for compatibility)
LEGACY_SOURCES = custom_cube_solver.cpp
LEGACY_HEADERS = custom_cube_solver.h
LEGACY_TEST = test_solver.cpp

# Targets
KOCIEMBA_LIB = kociemba_solver.so
KOCIEMBA_EXEC = test_kociemba
LEGACY_LIB = custom_cube_solver.so
LEGACY_EXEC = test_solver

.PHONY: all clean test install kociemba legacy

# Default target - build Kociemba solver
all: kociemba

# Build Kociemba solver
kociemba: $(KOCIEMBA_LIB) $(KOCIEMBA_EXEC)

# Build legacy solver (for compatibility)
legacy: $(LEGACY_LIB) $(LEGACY_EXEC)

# Build both solvers
both: kociemba legacy

# Build Kociemba shared library
$(KOCIEMBA_LIB): $(KOCIEMBA_SOURCES) $(KOCIEMBA_HEADERS)
	$(CXX) $(CXXFLAGS) -shared -I$(PYTHON_INCLUDE) -L$(PYTHON_LIB_DIR) $(PYTHON_LIBS) -o $@ $(KOCIEMBA_SOURCES)

# Build Kociemba test executable
$(KOCIEMBA_EXEC): $(KOCIEMBA_TEST) $(KOCIEMBA_SOURCES) $(KOCIEMBA_HEADERS)
	$(CXX) $(CXXFLAGS) -o $@ $(KOCIEMBA_TEST) $(KOCIEMBA_SOURCES)

# Build legacy shared library
$(LEGACY_LIB): $(LEGACY_SOURCES) $(LEGACY_HEADERS)
	$(CXX) $(CXXFLAGS) -shared -I$(PYTHON_INCLUDE) -L$(PYTHON_LIB) -lpython3.11 -o $@ $(LEGACY_SOURCES)

# Build legacy test executable
$(LEGACY_EXEC): $(LEGACY_TEST) $(LEGACY_SOURCES) $(LEGACY_HEADERS)
	$(CXX) $(CXXFLAGS) -o $@ $(LEGACY_TEST) $(LEGACY_SOURCES)

# Run tests
test: $(KOCIEMBA_EXEC)
	./$(KOCIEMBA_EXEC)

test-legacy: $(LEGACY_EXEC)
	./$(LEGACY_EXEC)

test-all: test test-legacy

# Clean build files
clean:
	rm -f $(KOCIEMBA_LIB) $(KOCIEMBA_EXEC) $(LEGACY_LIB) $(LEGACY_EXEC) *.o

# Install (copy to parent directory)
install: $(KOCIEMBA_LIB)
	cp $(KOCIEMBA_LIB) ../

install-legacy: $(LEGACY_LIB)
	cp $(LEGACY_LIB) ../

install-all: install install-legacy

# CMake build (alternative)
cmake-build:
	mkdir -p build
	cd build && cmake .. && make

cmake-clean:
	rm -rf build

help:
	@echo "Available targets:"
	@echo "  all         - Build Kociemba solver (default)"
	@echo "  kociemba    - Build Kociemba solver"
	@echo "  legacy      - Build legacy simple solver"
	@echo "  both        - Build both solvers"
	@echo "  test        - Build and run Kociemba tests"
	@echo "  test-legacy - Build and run legacy tests"
	@echo "  test-all    - Run all tests"
	@echo "  clean       - Remove build files"
	@echo "  install     - Copy Kociemba library to parent directory"
	@echo "  install-legacy - Copy legacy library to parent directory"
	@echo "  install-all - Install both libraries"
	@echo "  cmake-build - Build using CMake"
	@echo "  cmake-clean - Clean CMake build files"
	@echo "  help        - Show this help message"

