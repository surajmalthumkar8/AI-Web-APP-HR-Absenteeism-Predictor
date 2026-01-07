"""
Employee Data API Endpoints.

Provides access to employee records from the absenteeism dataset
with filtering, pagination, and search capabilities.
"""

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional
import pandas as pd

from app.config import settings
from app.ml.preprocessor import REASON_CATEGORIES


router = APIRouter()


# Lazy-loaded dataframe
_df: pd.DataFrame | None = None


def get_dataframe() -> pd.DataFrame:
    """Get the employee dataframe, loading if necessary."""
    global _df
    if _df is None:
        _df = pd.read_csv(settings.data_path, sep=";")
    return _df


class Employee(BaseModel):
    """Employee record schema."""
    id: int
    reason_for_absence: int
    reason_description: str
    month_of_absence: int
    day_of_week: int
    seasons: int
    transportation_expense: float
    distance_from_residence: float
    service_time: int
    age: int
    workload_average: float
    hit_target: int
    disciplinary_failure: int
    education: int
    son: int
    social_drinker: int
    social_smoker: int
    pet: int
    weight: float
    height: float
    bmi: float
    absenteeism_hours: float


class EmployeeListResponse(BaseModel):
    """Paginated employee list response."""
    employees: list[Employee]
    total: int
    page: int
    page_size: int
    total_pages: int


def row_to_employee(row: pd.Series) -> Employee:
    """Convert a DataFrame row to Employee model."""
    reason_code = int(row["Reason for absence"])
    return Employee(
        id=int(row["ID"]),
        reason_for_absence=reason_code,
        reason_description=REASON_CATEGORIES.get(reason_code, "Unknown"),
        month_of_absence=int(row["Month of absence"]),
        day_of_week=int(row["Day of the week"]),
        seasons=int(row["Seasons"]),
        transportation_expense=float(row["Transportation expense"]),
        distance_from_residence=float(row["Distance from Residence to Work"]),
        service_time=int(row["Service time"]),
        age=int(row["Age"]),
        workload_average=float(row["Work load Average/day "]),
        hit_target=int(row["Hit target"]),
        disciplinary_failure=int(row["Disciplinary failure"]),
        education=int(row["Education"]),
        son=int(row["Son"]),
        social_drinker=int(row["Social drinker"]),
        social_smoker=int(row["Social smoker"]),
        pet=int(row["Pet"]),
        weight=float(row["Weight"]),
        height=float(row["Height"]),
        bmi=float(row["Body mass index"]),
        absenteeism_hours=float(row["Absenteeism time in hours"]),
    )


@router.get("", response_model=EmployeeListResponse)
async def list_employees(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    min_age: Optional[int] = Query(None, description="Minimum age filter"),
    max_age: Optional[int] = Query(None, description="Maximum age filter"),
    min_absence: Optional[float] = Query(None, description="Minimum absence hours"),
    max_absence: Optional[float] = Query(None, description="Maximum absence hours"),
    reason: Optional[int] = Query(None, description="Filter by absence reason code"),
    education: Optional[int] = Query(None, description="Filter by education level"),
    sort_by: str = Query("absenteeism_hours", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
):
    """
    Get paginated list of employee absence records.

    Supports filtering by various attributes and sorting.
    """
    df = get_dataframe().copy()

    # Apply filters
    if min_age is not None:
        df = df[df["Age"] >= min_age]
    if max_age is not None:
        df = df[df["Age"] <= max_age]
    if min_absence is not None:
        df = df[df["Absenteeism time in hours"] >= min_absence]
    if max_absence is not None:
        df = df[df["Absenteeism time in hours"] <= max_absence]
    if reason is not None:
        df = df[df["Reason for absence"] == reason]
    if education is not None:
        df = df[df["Education"] == education]

    # Map sort field to column name
    sort_mapping = {
        "absenteeism_hours": "Absenteeism time in hours",
        "age": "Age",
        "service_time": "Service time",
        "bmi": "Body mass index",
        "id": "ID",
    }
    sort_column = sort_mapping.get(sort_by, "Absenteeism time in hours")
    ascending = sort_order.lower() == "asc"

    # Sort
    df = df.sort_values(by=sort_column, ascending=ascending)

    # Pagination
    total = len(df)
    total_pages = (total + page_size - 1) // page_size
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size

    page_df = df.iloc[start_idx:end_idx]

    # Convert to Employee models
    employees = [row_to_employee(row) for _, row in page_df.iterrows()]

    return EmployeeListResponse(
        employees=employees,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/at-risk", response_model=EmployeeListResponse)
async def get_at_risk_employees(
    threshold: float = Query(10.0, description="Absence hours threshold for at-risk"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Get employees with high absenteeism (at-risk).

    Default threshold is 10 hours (above average).
    """
    df = get_dataframe().copy()

    # Filter for at-risk employees
    df = df[df["Absenteeism time in hours"] >= threshold]
    df = df.sort_values(by="Absenteeism time in hours", ascending=False)

    # Pagination
    total = len(df)
    total_pages = (total + page_size - 1) // page_size
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size

    page_df = df.iloc[start_idx:end_idx]
    employees = [row_to_employee(row) for _, row in page_df.iterrows()]

    return EmployeeListResponse(
        employees=employees,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{employee_id}")
async def get_employee_records(
    employee_id: int,
):
    """
    Get all absence records for a specific employee ID.

    Note: An employee may have multiple absence records.
    """
    df = get_dataframe()
    employee_df = df[df["ID"] == employee_id]

    if len(employee_df) == 0:
        raise HTTPException(status_code=404, detail=f"Employee {employee_id} not found")

    records = [row_to_employee(row) for _, row in employee_df.iterrows()]

    # Calculate summary stats for this employee
    summary = {
        "employee_id": employee_id,
        "total_records": len(records),
        "total_absence_hours": float(employee_df["Absenteeism time in hours"].sum()),
        "average_absence_hours": float(employee_df["Absenteeism time in hours"].mean()),
        "age": int(employee_df["Age"].iloc[0]),
        "service_time": int(employee_df["Service time"].iloc[0]),
    }

    return {
        "summary": summary,
        "records": records,
    }


@router.get("/reasons/list")
async def list_absence_reasons():
    """
    Get list of all absence reason codes with descriptions.

    Useful for populating dropdowns in the UI.
    """
    return {
        "reasons": [
            {"code": code, "description": desc}
            for code, desc in REASON_CATEGORIES.items()
        ]
    }
