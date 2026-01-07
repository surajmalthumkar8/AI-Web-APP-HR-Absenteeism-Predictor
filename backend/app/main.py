"""
FastAPI Application Entry Point.

This is the main entry point for the HR Absenteeism Predictor API.
It configures CORS, registers routes, and sets up application lifecycle events.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.deps import load_model, unload_model, get_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifecycle manager.

    Why lifespan over on_event:
    - Modern FastAPI pattern (on_event is deprecated)
    - Cleaner resource management with context manager
    - Explicit startup/shutdown phases
    """
    # Startup: Load ML model into memory
    print("Loading ML model...")
    load_model()

    yield  # Application runs here

    # Shutdown: Cleanup
    print("Shutting down...")
    unload_model()


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="""
    AI-powered HR Decision Support System for predicting and analyzing employee absenteeism.

    ## Features
    - **ML Predictions**: Predict absenteeism hours with confidence intervals
    - **Explainable AI**: SHAP-based feature importance for each prediction
    - **LLM Explanations**: Human-readable explanations via Ollama
    - **NLP Queries**: Ask questions in natural language
    - **Analytics**: Dashboard statistics and trends
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://localhost:5173",
        "https://*.onrender.com",  # Render deployments
    ],
    allow_origin_regex=r"https://.*\.onrender\.com",  # Allow all Render subdomains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import router AFTER app is created to avoid circular imports
from app.api.v1.router import api_router
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint - API information."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/v1/health",
    }


@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint for monitoring.

    Returns model status and API health.
    """
    model = get_model()
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "version": settings.app_version,
    }
