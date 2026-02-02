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

    # Copy build files to static directory
    dist_dir = frontend_dir / "dist"
    if not dist_dir.exists():
        print(f"Error: {dist_dir} does not exist after build.")
        return False

    print(f"Copying build files to {static_dir}...")
    if static_dir.exists():
        shutil.rmtree(static_dir)
    shutil.copytree(dist_dir, static_dir)

    print("Frontend build and copy complete.")
    return True

if __name__ == "__main__":
    build_frontend()
