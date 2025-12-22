"""Vercel Serverless Function entry point for the FastAPI application."""

from __future__ import annotations

import os
import sys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
API_ROOT = os.path.join(PROJECT_ROOT, "apps", "api")
if API_ROOT not in sys.path:
    sys.path.insert(0, API_ROOT)

from app.main import app  # noqa: E402

__all__ = ["app"]
