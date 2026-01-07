"""
Application configuration using Pydantic Settings.

Why Pydantic Settings:
- Type-safe configuration with validation
- Automatic environment variable loading
- Clear documentation of all config options
- Easy testing with overrides
"""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Settings
    app_name: str = "HR Absenteeism Predictor"
    app_version: str = "1.0.0"
    debug: bool = False

    # CORS - Frontend URL
    frontend_url: str = "http://localhost:5173"

    # Ollama LLM Settings
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    ollama_timeout: int = 60

    # Paths
    base_dir: Path = Path(__file__).parent.parent
    data_path: Path = base_dir / "data" / "raw" / "Absenteeism_at_work.csv"
    models_path: Path = base_dir / "models"

    # ML Settings
    model_filename: str = "absenteeism_model.joblib"
    preprocessor_filename: str = "preprocessor.joblib"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global settings instance
settings = Settings()
