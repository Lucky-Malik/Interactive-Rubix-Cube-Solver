// https://github.com/abhinavdogra21/Rubix-Cube-Solver
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include "Solver/solve.h"

namespace py = pybind11;

namespace {

std::string solve_cube(const std::string& cube_state) {
    try {
        // Use the get_solution function from the new solver
        std::vector<std::string> solution_moves = get_solution(cube_state);
        
        // Convert solution (vector of strings) to a single space-separated string
        std::string result;
        for (size_t i = 0; i < solution_moves.size(); ++i) {
            result += solution_moves[i];
            if (i < solution_moves.size() - 1) {
                result += " ";
            }
        }
        
        return result;
    } catch (const std::exception& e) {
        throw py::value_error(e.what());
    }
}

} // anonymous namespace

PYBIND11_MODULE(kociemba_solver, m) {
    m.doc() = "Rubik\'s cube solver"; 
    m.def("solve", &solve_cube, "Solve a Rubik\'s cube",
          py::arg("cube_state"));
}
