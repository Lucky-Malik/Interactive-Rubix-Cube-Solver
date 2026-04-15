# Symlink the built .so file to the src directory for Python import
import os
import shutil
src_dir = os.path.dirname(__file__)
build_so = os.path.join(os.path.dirname(os.path.dirname(src_dir)), 'src', 'build', 'kociemba_solver.cpython-313-darwin.so')
target_so = os.path.join(src_dir, 'kociemba_solver.cpython-313-darwin.so')
if os.path.exists(build_so) and not os.path.exists(target_so):
    shutil.copy(build_so, target_so)
