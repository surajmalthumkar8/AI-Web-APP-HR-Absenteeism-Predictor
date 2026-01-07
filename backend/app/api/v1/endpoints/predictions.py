"""
Prediction API Endpoints.

Provides ML-powered absenteeism predictions with SHAP explanations
and LLM-generated natural language interpretations.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from app.ml.model import AbsenteeismModel
from app.services.explanation_service import get_explanation_service
from app.api.deps import get_model


router = APIRouter()


# Request/Response Schemas
class PredictionInput(BaseModel):
    """Input schema for single prediction request."""

    reason_for_absence: int = Field(
        ..., ge=0, le=28,
        description="Absence reason code (0-28). 1-21 are medical ICD codes, 22-28 are administrative."
    )
    month_of_absence: int = Field(
        ..., ge=0, le=12,
        description="Month of absence (1-12, 0 for unknown)"
    )
    day_of_week: int = Field(
        ..., ge=2, le=6,
        description="Day of week (2=Monday, 6=Friday)"
    )
    seasons: int = Field(
        ..., ge=1, le=4,
        description="Season (1=summer, 2=autumn, 3=winter, 4=spring)"
    )
    transportation_expense: float = Field(
        ..., ge=0,
        description="Monthly transportation expense in $"
    )
    distance_from_residence: float = Field(
        ..., ge=0,
        description="Distance from home to work in km"
    )
    service_time: int = Field(
        ..., ge=0,
        description="Years of service at the company"
    )
    age: int = Field(
        ..., ge=18, le=70,
        description="Employee age in years"
    )
    workload_average: float = Field(
        ..., ge=0,
        description="Average daily workload"
    )
    hit_target: int = Field(
        ..., ge=0, le=100,
        description="Performance target hit percentage"
    )
    disciplinary_failure: int = Field(
        ..., ge=0, le=1,
        description="Has disciplinary failure (0=no, 1=yes)"
    )
    education: int = Field(
        ..., ge=1, le=4,
        description="Education level (1=high school, 2=graduate, 3=postgraduate, 4=master/doctor)"
    )
    son: int = Field(
        ..., ge=0,
        description="Number of children"
    )
    social_drinker: int = Field(
        ..., ge=0, le=1,
        description="Is social drinker (0=no, 1=yes)"
    )
    social_smoker: int = Field(
        ..., ge=0, le=1,
        description="Is social smoker (0=no, 1=yes)"
    )
    pet: int = Field(
        ..., ge=0,
        description="Number of pets"
    )
    weight: float = Field(
        ..., ge=0,
        description="Weight in kg"
    )
    height: float = Field(
        ..., ge=0,
        description="Height in cm"
    )
    bmi: float = Field(
        ..., ge=0,
        description="Body Mass Index"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "reason_for_absence": 23,
                "month_of_absence": 7,
                "day_of_week": 3,
                "seasons": 1,
                "transportation_expense": 289,
                "distance_from_residence": 36,
                "service_time": 13,
                "age": 33,
                "workload_average": 239.554,
                "hit_target": 97,
                "disciplinary_failure": 0,
                "education": 1,
                "son": 2,
                "social_drinker": 1,
                "social_smoker": 0,
                "pet": 1,
                "weight": 90,
                "height": 172,
                "bmi": 30,
            }
        }


class FeatureFactor(BaseModel):
    """A single factor contributing to the prediction."""
    feature: str
    contribution: float
    direction: str
    description: str


class PredictionResponse(BaseModel):
    """Response schema for prediction requests."""
    predicted_hours: float
    risk_level: str
    confidence_interval: tuple[float, float]
    feature_contributions: dict[str, float]
    top_factors: list[FeatureFactor]
    explanation: str
    explanation_source: str
    timestamp: datetime


class BatchPredictionInput(BaseModel):
    """Input for batch predictions."""
    employees: list[PredictionInput]


class BatchPredictionResponse(BaseModel):
    """Response for batch predictions."""
    predictions: list[PredictionResponse]
    summary: dict


@router.post("/single", response_model=PredictionResponse)
async def predict_single(
    input_data: PredictionInput,
    model: Optional[AbsenteeismModel] = Depends(get_model),
):
    """
    Generate a single absenteeism prediction with explanation.

    This endpoint:
    1. Validates input data
    2. Runs the ML model for prediction
    3. Calculates SHAP feature contributions
    4. Generates an LLM explanation (or fallback)
    5. Returns comprehensive prediction results
    """
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please run training script first: python -m app.ml.train"
        )

    # Convert to dict for model
    data = input_data.model_dump()

    # Get prediction with SHAP explanation
    prediction_result = model.predict_with_explanation(data)

    # Generate LLM explanation
    explanation_service = get_explanation_service()
    explanation_result = await explanation_service.generate_explanation(
        predicted_hours=prediction_result["predicted_hours"],
        risk_level=prediction_result["risk_level"],
        confidence_interval=prediction_result["confidence_interval"],
        top_factors=prediction_result["top_factors"],
    )

    return PredictionResponse(
        predicted_hours=prediction_result["predicted_hours"],
        risk_level=prediction_result["risk_level"],
        confidence_interval=prediction_result["confidence_interval"],
        feature_contributions=prediction_result["feature_contributions"],
        top_factors=[FeatureFactor(**f) for f in prediction_result["top_factors"]],
        explanation=explanation_result["explanation"],
        explanation_source=explanation_result["source"],
        timestamp=datetime.now(),
    )


@router.post("/batch", response_model=BatchPredictionResponse)
async def predict_batch(
    input_data: BatchPredictionInput,
    model: Optional[AbsenteeismModel] = Depends(get_model),
):
    """
    Generate predictions for multiple employees.

    Useful for:
    - Bulk risk assessment
    - Department-wide analysis
    - Workforce planning
    """
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please run training script first."
        )

    if len(input_data.employees) > 100:
        raise HTTPException(
            status_code=400,
            detail="Maximum 100 employees per batch request."
        )

    predictions = []
    explanation_service = get_explanation_service()

    for employee in input_data.employees:
        data = employee.model_dump()
        prediction_result = model.predict_with_explanation(data)

        explanation_result = await explanation_service.generate_explanation(
            predicted_hours=prediction_result["predicted_hours"],
            risk_level=prediction_result["risk_level"],
            confidence_interval=prediction_result["confidence_interval"],
            top_factors=prediction_result["top_factors"],
            use_llm=False,  # Use fallback for batch to avoid LLM latency
        )

        predictions.append(PredictionResponse(
            predicted_hours=prediction_result["predicted_hours"],
            risk_level=prediction_result["risk_level"],
            confidence_interval=prediction_result["confidence_interval"],
            feature_contributions=prediction_result["feature_contributions"],
            top_factors=[FeatureFactor(**f) for f in prediction_result["top_factors"]],
            explanation=explanation_result["explanation"],
            explanation_source=explanation_result["source"],
            timestamp=datetime.now(),
        ))

    # Calculate summary statistics
    hours = [p.predicted_hours for p in predictions]
    risk_counts = {}
    for p in predictions:
        risk_counts[p.risk_level] = risk_counts.get(p.risk_level, 0) + 1

    summary = {
        "total_employees": len(predictions),
        "average_predicted_hours": sum(hours) / len(hours) if hours else 0,
        "max_predicted_hours": max(hours) if hours else 0,
        "risk_distribution": risk_counts,
    }

    return BatchPredictionResponse(
        predictions=predictions,
        summary=summary,
    )


@router.get("/model-info")
async def get_model_info(
    model: Optional[AbsenteeismModel] = Depends(get_model),
):
    """
    Get information about the loaded model.

    Returns model metrics, feature importance, and configuration.
    """
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded."
        )

    return {
        "metrics": model.get_model_metrics(),
        "feature_importance": model.get_feature_importance(),
        "feature_count": len(model.feature_names),
        "risk_thresholds": model.RISK_THRESHOLDS,
    }
