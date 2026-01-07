"""
Analytics API Endpoints.

Provides dashboard statistics, trends, and aggregated insights
for the HR decision support dashboard.
"""

from fastapi import APIRouter, Query, Depends
from pydantic import BaseModel
from typing import Optional
import pandas as pd
import numpy as np

from app.config import settings
from app.ml.model import AbsenteeismModel
from app.api.deps import get_model


router = APIRouter()


# Lazy-loaded dataframe
_df: pd.DataFrame | None = None


def get_dataframe() -> pd.DataFrame:
    """Get the employee dataframe, loading if necessary."""
    global _df
    if _df is None:
        _df = pd.read_csv(settings.data_path, sep=";")
    return _df


class DashboardSummary(BaseModel):
    """Summary statistics for the dashboard."""
    total_records: int
    unique_employees: int
    total_absence_hours: float
    average_absence_hours: float
    median_absence_hours: float
    max_absence_hours: float
    at_risk_count: int
    at_risk_percentage: float


class TrendPoint(BaseModel):
    """A single point in a trend series."""
    period: str
    period_num: int
    value: float
    count: int


class TrendResponse(BaseModel):
    """Response for trend data."""
    metric: str
    data: list[TrendPoint]


class DistributionBucket(BaseModel):
    """A bucket in a distribution."""
    range_start: float
    range_end: float
    count: int
    percentage: float


class DistributionResponse(BaseModel):
    """Response for distribution data."""
    field: str
    buckets: list[DistributionBucket]
    stats: dict


@router.get("/summary", response_model=DashboardSummary)
async def get_summary():
    """
    Get summary statistics for the dashboard.

    Returns key metrics about the absenteeism dataset.
    """
    df = get_dataframe()

    total_hours = df["Absenteeism time in hours"].sum()
    avg_hours = df["Absenteeism time in hours"].mean()

    # Define at-risk as above average + 1 std
    at_risk_threshold = avg_hours + df["Absenteeism time in hours"].std()
    at_risk_df = df[df["Absenteeism time in hours"] > at_risk_threshold]

    return DashboardSummary(
        total_records=len(df),
        unique_employees=df["ID"].nunique(),
        total_absence_hours=round(total_hours, 1),
        average_absence_hours=round(avg_hours, 2),
        median_absence_hours=round(df["Absenteeism time in hours"].median(), 2),
        max_absence_hours=float(df["Absenteeism time in hours"].max()),
        at_risk_count=len(at_risk_df),
        at_risk_percentage=round(len(at_risk_df) / len(df) * 100, 1),
    )


@router.get("/trends/monthly", response_model=TrendResponse)
async def get_monthly_trends():
    """
    Get monthly absenteeism trends.

    Returns average absence hours per month.
    """
    df = get_dataframe()

    monthly = df.groupby("Month of absence").agg({
        "Absenteeism time in hours": "mean",
        "ID": "count"
    }).reset_index()

    month_names = {
        0: "Unknown", 1: "January", 2: "February", 3: "March",
        4: "April", 5: "May", 6: "June", 7: "July",
        8: "August", 9: "September", 10: "October",
        11: "November", 12: "December"
    }

    data = [
        TrendPoint(
            period=month_names.get(int(row["Month of absence"]), "Unknown"),
            period_num=int(row["Month of absence"]),
            value=round(row["Absenteeism time in hours"], 2),
            count=int(row["ID"])
        )
        for _, row in monthly.iterrows()
        if row["Month of absence"] > 0  # Exclude unknown months
    ]

    # Sort by month number
    data.sort(key=lambda x: x.period_num)

    return TrendResponse(
        metric="Average Absence Hours",
        data=data
    )


@router.get("/trends/weekday", response_model=TrendResponse)
async def get_weekday_trends():
    """
    Get absence trends by day of week.

    Returns average absence hours per weekday.
    """
    df = get_dataframe()

    weekday = df.groupby("Day of the week").agg({
        "Absenteeism time in hours": "mean",
        "ID": "count"
    }).reset_index()

    day_names = {
        2: "Monday", 3: "Tuesday", 4: "Wednesday",
        5: "Thursday", 6: "Friday"
    }

    data = [
        TrendPoint(
            period=day_names.get(int(row["Day of the week"]), "Unknown"),
            period_num=int(row["Day of the week"]),
            value=round(row["Absenteeism time in hours"], 2),
            count=int(row["ID"])
        )
        for _, row in weekday.iterrows()
    ]

    # Sort by day number
    data.sort(key=lambda x: x.period_num)

    return TrendResponse(
        metric="Average Absence Hours",
        data=data
    )


@router.get("/distribution/absence", response_model=DistributionResponse)
async def get_absence_distribution():
    """
    Get distribution of absence hours.

    Returns histogram buckets for the target variable.
    """
    df = get_dataframe()
    hours = df["Absenteeism time in hours"]

    # Create buckets
    bins = [0, 2, 4, 8, 16, 24, 40, float("inf")]
    labels = ["0-2", "2-4", "4-8", "8-16", "16-24", "24-40", "40+"]

    df["bucket"] = pd.cut(hours, bins=bins, labels=labels, include_lowest=True)
    bucket_counts = df["bucket"].value_counts()

    total = len(df)
    buckets = []

    for i, label in enumerate(labels):
        count = bucket_counts.get(label, 0)
        buckets.append(DistributionBucket(
            range_start=bins[i],
            range_end=bins[i + 1] if bins[i + 1] != float("inf") else 100,
            count=int(count),
            percentage=round(count / total * 100, 1)
        ))

    return DistributionResponse(
        field="Absenteeism time in hours",
        buckets=buckets,
        stats={
            "mean": round(hours.mean(), 2),
            "median": round(hours.median(), 2),
            "std": round(hours.std(), 2),
            "min": float(hours.min()),
            "max": float(hours.max()),
        }
    )


@router.get("/by-reason")
async def get_stats_by_reason():
    """
    Get absenteeism statistics grouped by absence reason.

    Returns average hours and count for each reason code.
    """
    df = get_dataframe()

    from app.ml.preprocessor import REASON_CATEGORIES

    grouped = df.groupby("Reason for absence").agg({
        "Absenteeism time in hours": ["mean", "sum", "count"],
        "ID": "nunique"
    })

    grouped.columns = ["avg_hours", "total_hours", "record_count", "unique_employees"]
    grouped = grouped.reset_index()

    result = []
    for _, row in grouped.iterrows():
        reason_code = int(row["Reason for absence"])
        result.append({
            "reason_code": reason_code,
            "reason_description": REASON_CATEGORIES.get(reason_code, "Unknown"),
            "average_hours": round(row["avg_hours"], 2),
            "total_hours": round(row["total_hours"], 1),
            "record_count": int(row["record_count"]),
            "unique_employees": int(row["unique_employees"]),
        })

    # Sort by total hours descending
    result.sort(key=lambda x: x["total_hours"], reverse=True)

    return {"by_reason": result}


@router.get("/by-education")
async def get_stats_by_education():
    """
    Get absenteeism statistics grouped by education level.
    """
    df = get_dataframe()

    education_labels = {
        1: "High School",
        2: "Graduate",
        3: "Postgraduate",
        4: "Master/Doctor"
    }

    grouped = df.groupby("Education").agg({
        "Absenteeism time in hours": ["mean", "sum", "count"],
        "ID": "nunique"
    })

    grouped.columns = ["avg_hours", "total_hours", "record_count", "unique_employees"]
    grouped = grouped.reset_index()

    result = []
    for _, row in grouped.iterrows():
        edu_code = int(row["Education"])
        result.append({
            "education_level": edu_code,
            "education_label": education_labels.get(edu_code, "Unknown"),
            "average_hours": round(row["avg_hours"], 2),
            "total_hours": round(row["total_hours"], 1),
            "record_count": int(row["record_count"]),
            "unique_employees": int(row["unique_employees"]),
        })

    return {"by_education": result}


@router.get("/feature-importance")
async def get_feature_importance(
    model: Optional[AbsenteeismModel] = Depends(get_model),
):
    """
    Get global feature importance from the ML model.

    Returns ranked features by their importance in predictions.
    """
    if model is None:
        # Return placeholder data if model isn't loaded
        return {
            "feature_importance": {},
            "message": "Model not loaded. Train the model to see feature importance."
        }

    importance = model.get_feature_importance()

    # Format for frontend charts
    result = [
        {"feature": name, "importance": round(score, 4)}
        for name, score in importance.items()
    ]

    return {
        "feature_importance": result[:15],  # Top 15 features
        "total_features": len(importance),
    }


@router.get("/correlations")
async def get_correlations():
    """
    Get correlation matrix for numeric features.

    Useful for understanding relationships between variables.
    """
    df = get_dataframe()

    # Select numeric columns for correlation
    numeric_cols = [
        "Age", "Service time", "Transportation expense",
        "Distance from Residence to Work", "Body mass index",
        "Work load Average/day ", "Hit target", "Absenteeism time in hours"
    ]

    corr_matrix = df[numeric_cols].corr()

    # Convert to list format for heatmap
    correlations = []
    for i, col1 in enumerate(numeric_cols):
        for j, col2 in enumerate(numeric_cols):
            correlations.append({
                "x": col1,
                "y": col2,
                "value": round(corr_matrix.loc[col1, col2], 3)
            })

    return {
        "columns": numeric_cols,
        "correlations": correlations,
    }
