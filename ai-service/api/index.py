"""Vercel serverless entry point for the FastAPI app. Local development keeps using main.py."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app  # noqa: E402,F401
