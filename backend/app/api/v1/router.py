"""
API Router - Aggregates all v1 endpoints.

Why a central router:
- Single point of registration for all endpoints
- Consistent prefix and tags
- Easy to add/remove endpoint modules
"""

from fastapi import APIRouter

from app.api.v1.endpoints import predictions, employees, analytics, nlp_query

api_router = APIRouter()

# Register all endpoint routers with their prefixes and tags
api_router.include_router(
    predictions.router,
    prefix="/predictions",
    tags=["Predictions"],
)

api_router.include_router(
    employees.router,
    prefix="/employees",
    tags=["Employees"],
)

api_router.include_router(
    analytics.router,
    prefix="/analytics",
    tags=["Analytics"],
)

api_router.include_router(
    nlp_query.router,
    prefix="/nlp",
    tags=["NLP Query"],
)
