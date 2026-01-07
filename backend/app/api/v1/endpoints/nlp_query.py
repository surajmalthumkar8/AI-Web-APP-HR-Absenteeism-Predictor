"""
NLP Query API Endpoints.

Provides natural language query interface for HR users
to ask questions about the absenteeism data.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Any, Optional

from app.services.nlp_service import get_nlp_service
from app.llm.ollama_client import check_ollama_status


router = APIRouter()


class QueryRequest(BaseModel):
    """Request schema for NLP queries."""
    query: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="Natural language query"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "query": "Show employees with more than 20 hours of absence"
            }
        }


class QueryResponse(BaseModel):
    """Response schema for NLP queries."""
    success: bool
    intent: str
    confidence: float
    result_type: str  # "table", "metric", "chart_data", "text"
    data: Any
    message: str
    interpretation: str
    suggestions: list[str]


@router.post("/query", response_model=QueryResponse)
async def process_nlp_query(request: QueryRequest):
    """
    Process a natural language query about the absenteeism data.

    Examples:
    - "Show employees with more than 20 hours of absence"
    - "What's the average absence by education level?"
    - "Compare absence between smokers and non-smokers"
    - "Show monthly absence trends"

    The system will:
    1. Classify the query intent (filter, aggregate, compare, etc.)
    2. Extract relevant entities (fields, values, operators)
    3. Execute the appropriate data operation
    4. Return formatted results
    """
    nlp_service = get_nlp_service()
    result = await nlp_service.process_query(request.query)

    return QueryResponse(
        success=result.success,
        intent=result.intent,
        confidence=result.confidence,
        result_type=result.result_type,
        data=result.data,
        message=result.message,
        interpretation=result.interpretation,
        suggestions=result.suggestions,
    )


@router.get("/suggestions")
async def get_query_suggestions():
    """
    Get suggested queries for the NLP interface.

    Returns a list of example queries users can try.
    """
    nlp_service = get_nlp_service()
    return {
        "suggestions": nlp_service.get_suggestions()
    }


@router.get("/llm-status")
async def get_llm_status():
    """
    Check the status of the Ollama LLM server.

    Returns:
    - available: Whether Ollama is running
    - models: List of installed models
    - configured_model: The model configured for use
    - model_ready: Whether the configured model is installed
    """
    status = await check_ollama_status()
    return status


class ExampleQuery(BaseModel):
    """Example query with explanation."""
    query: str
    description: str
    expected_result_type: str


@router.get("/examples")
async def get_query_examples():
    """
    Get detailed examples of supported queries.

    Helps users understand what types of questions they can ask.
    """
    examples = [
        ExampleQuery(
            query="Show employees with more than 20 hours of absence",
            description="Filter employees by absence threshold",
            expected_result_type="table"
        ),
        ExampleQuery(
            query="What's the average absence hours?",
            description="Calculate overall average absence",
            expected_result_type="metric"
        ),
        ExampleQuery(
            query="Compare absence between smokers and non-smokers",
            description="Group comparison by lifestyle factor",
            expected_result_type="chart_data"
        ),
        ExampleQuery(
            query="Show monthly absence trends",
            description="Time series analysis of absence patterns",
            expected_result_type="chart_data"
        ),
        ExampleQuery(
            query="How many employees have disciplinary failures?",
            description="Count employees with specific attribute",
            expected_result_type="metric"
        ),
        ExampleQuery(
            query="List high-risk employees",
            description="Filter for employees above risk threshold",
            expected_result_type="table"
        ),
        ExampleQuery(
            query="What's the average BMI of employees over 40?",
            description="Aggregate with filter condition",
            expected_result_type="metric"
        ),
        ExampleQuery(
            query="Show absence by education level",
            description="Group statistics by education category",
            expected_result_type="chart_data"
        ),
    ]

    return {"examples": [e.model_dump() for e in examples]}
