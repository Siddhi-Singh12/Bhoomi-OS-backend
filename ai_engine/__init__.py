"""
Bhoomi Intelligence — AI & Drone Computer Vision Microservice Package
"""
import sys
from pathlib import Path

_current = Path(__file__).resolve().parent
_parent = _current.parent
if str(_parent) not in sys.path:
    sys.path.insert(0, str(_parent))
if str(_current) not in sys.path:
    sys.path.insert(0, str(_current))
