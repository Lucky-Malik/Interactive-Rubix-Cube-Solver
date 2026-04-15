// Minimal main to run the solver
#include <iostream>
#include <vector>
#include <string>
#include "solve.h"

int main() {
    // List of sample cube strings (solved, easy scramble, hard scramble)
    std::vector<std::string> cubes = {
        "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB", // solved
        "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB", // solved again
        "UUFUUUUUURRRRRRRRRFFFUFFUFFDDDDDDDDDLLLLLLLLLBBBBBBBBB", // 3 stickers swapped
        "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB", // solved
        "UFUUUUUUURRRRRRRRRFFFUFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB", // 1 sticker swapped
        // Add more realistic scrambles if needed
    };

    for (size_t i = 0; i < cubes.size(); ++i) {
        std::cout << "Test " << i+1 << ":\nCube string: " << cubes[i] << std::endl;
        std::vector<std::string> solution = get_solution(cubes[i]);
        std::cout << "Solution moves:" << std::endl;
        for (const auto& move : solution) {
            std::cout << move << " ";
        }
        std::cout << std::endl << std::endl;
    }
    return 0;
}
