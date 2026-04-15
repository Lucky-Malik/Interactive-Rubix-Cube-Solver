CXX = g++
CXXFLAGS = -std=c++17 -O3 -fPIC -Wall -Wextra
## This file is intentionally deleted. Use CMake for backend build.
PYTHON_INCLUDE = $(shell python3-config --includes)
PYTHON_LIBS = $(shell python3-config --libs)

# Source files for the shared library
KOCIEMBA_SOURCES = src/kociemba_solver.cpp

# Target shared library
KOCIEMBA_LIB = src/kociemba_solver.so

# Target test executable
KOCIEMBA_TEST = src/test_kociemba

all: $(KOCIEMBA_LIB) $(KOCIEMBA_TEST)
kociemba: $(KOCIEMBA_LIB) $(KOCIEMBA_TEST)

$(KOCIEMBA_LIB): $(KOCIEMBA_SOURCES)
	$(CXX) $(CXXFLAGS) -shared $(PYTHON_INCLUDE) $(PYTHON_LIBS) -o $@ $(KOCIEMBA_SOURCES)

$(KOCIEMBA_TEST): src/test_kociemba.cpp $(KOCIEMBA_SOURCES)
	$(CXX) $(CXXFLAGS) -o $@ src/test_kociemba.cpp $(KOCIEMBA_SOURCES)

clean:
	rm -f $(KOCIEMBA_LIB) $(KOCIEMBA_TEST) src/*.o

.PHONY: all clean kociemba


