"""
API Dependencies - Shared dependencies for endpoints.

This module avoids circular imports by providing model access
without importing from main.py.
"""

from app.ml.model import AbsenteeismModel
from app.config import settings

# Global model instance
_model: AbsenteeismModel | None = None


def get_model() -> AbsenteeismModel | None:
    """Get the loaded model instance."""
    global _model
    return _model


def load_model() -> None:
    """Load the ML model into memory."""
    global _model
    try:
        _model = AbsenteeismModel()
        print(f"Model loaded successfully from {settings.models_path}")
    except FileNotFoundError:
        print("WARNING: Model not found. Run training script first.")
        print("API will work but predictions will fail until model is trained.")
        _model = None


def unload_model() -> None:
    """Unload the model from memory."""
    global _model
    _model = None
