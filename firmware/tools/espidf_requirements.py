"""Install the ESP-IDF Python tools omitted by some PlatformIO packages."""

Import("env")

import importlib.util
from pathlib import Path
import subprocess
import sys


REQUIREMENTS = (
    ("idf_component_manager", "idf-component-manager~=2.2"),
    ("kconfgen", "esp-idf-kconfig"),
    ("cryptography", "cryptography"),
)

idf_python = env.get("ESPIDF_PYTHONEXE")
if not idf_python:
    core_dir = Path(env.subst("$PROJECT_CORE_DIR"))
    idf_python_candidates = sorted((core_dir / "penv").glob(".espidf-*/bin/python"))
    idf_python = str(idf_python_candidates[-1]) if idf_python_candidates else sys.executable


def has_module(module):
    result = subprocess.run(
        [idf_python, "-c", f"import {module}"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    return result.returncode == 0


missing = [package for module, package in REQUIREMENTS if not has_module(module)]

if missing:
    print("Installing missing ESP-IDF Python requirements: " + ", ".join(missing))
    subprocess.check_call([idf_python, "-m", "pip", "install", *missing])
