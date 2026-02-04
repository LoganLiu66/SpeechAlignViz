import os
import shutil
import subprocess
from pathlib import Path

def build_frontend():
    project_root = Path(__file__).parent.parent
    frontend_dir = project_root / "frontend"
    static_dir = project_root / "src" / "speech_align_viz" / "static"

    print(f"Building frontend in {frontend_dir}...")
    
    # Run npm install and build
    try:
        subprocess.run(["npm", "install"], cwd=frontend_dir, check=True)
        subprocess.run(["npm", "run", "build"], cwd=frontend_dir, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error building frontend: {e}")
        return False

    if not static_dir.exists():
        print(f"Error: {static_dir} does not exist after build.")
        return False

    print(f"Frontend built successfully in {static_dir}.")
    return True

if __name__ == "__main__":
    build_frontend()
