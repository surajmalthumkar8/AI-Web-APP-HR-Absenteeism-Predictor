"""
Model Loading and Inference for Absenteeism Prediction.

Why this module:
- Encapsulates all model-related operations
- Provides SHAP explanations for predictions
- Handles risk level classification
- Manages model lifecycle (load, predict, explain)
"""

import numpy as np
import pandas as pd
import joblib
import json
import shap
from pathlib import Path

from app.config import settings
from app.ml.preprocessor import DataPreprocessor, prepare_single_input, REASON_CATEGORIES


class AbsenteeismModel:
    """
    Wrapper for the trained absenteeism prediction model.

    Responsibilities:
    - Load model and preprocessor from disk
    - Make predictions with confidence intervals
    - Generate SHAP-based feature explanations
    - Classify risk levels
    """

    # Risk level thresholds (in hours)
    RISK_THRESHOLDS = {
        "low": 4,      # <= 4 hours: half day or less
        "medium": 8,   # <= 8 hours: one day
        "high": 16,    # <= 16 hours: two days
        "critical": float("inf"),  # > 16 hours
    }

    def __init__(self, model_path: Path | None = None):
        """
        Initialize the model by loading from disk.

        Args:
            model_path: Path to model file. Uses config default if None.
        """
        if model_path is None:
            model_path = settings.models_path / settings.model_filename

        if not model_path.exists():
            raise FileNotFoundError(
                f"Model not found at {model_path}. "
                "Run 'python -m app.ml.train' to train the model first."
            )

        # Load model
        self.model = joblib.load(model_path)

        # Load preprocessor
        self.preprocessor = DataPreprocessor.load()

        # Load feature names
        feature_names_path = settings.models_path / "feature_names.json"
        with open(feature_names_path, "r") as f:
            self.feature_names = json.load(f)

        # Initialize SHAP explainer (TreeExplainer is fast for XGBoost)
        self.explainer = shap.TreeExplainer(self.model)

        # Load metrics for confidence estimation
        metrics_path = settings.models_path / "metrics.json"
        with open(metrics_path, "r") as f:
            self.metrics = json.load(f)

    def predict(self, data: dict) -> float:
        """
        Make a single prediction.

        Args:
            data: Dictionary with employee features

        Returns:
            Predicted absenteeism hours
        """
        df = prepare_single_input(data)
        features = self.preprocessor.transform(df)
        prediction = self.model.predict(features)[0]
        return max(0, float(prediction))  # Ensure non-negative

    def predict_with_explanation(self, data: dict) -> dict:
        """
        Make prediction with full explanation including SHAP values.

        Args:
            data: Dictionary with employee features

        Returns:
            Dictionary containing:
            - predicted_hours: The prediction
            - risk_level: Classified risk
            - confidence_interval: (low, high) bounds
            - feature_contributions: SHAP values per feature
            - top_factors: Most important factors for this prediction
        """
        df = prepare_single_input(data)
        features = self.preprocessor.transform(df)

        # Make prediction
        prediction = self.model.predict(features)[0]
        prediction = max(0, float(prediction))

        # Calculate SHAP values for this prediction
        shap_values = self.explainer.shap_values(features)

        # Create feature contribution dictionary
        contributions = {}
        for i, name in enumerate(self.feature_names):
            contributions[name] = float(shap_values[0][i])

        # Sort by absolute contribution
        sorted_contributions = sorted(
            contributions.items(),
            key=lambda x: abs(x[1]),
            reverse=True
        )

        # Get top 5 contributing factors
        top_factors = []
        for name, value in sorted_contributions[:5]:
            direction = "increases" if value > 0 else "decreases"
            top_factors.append({
                "feature": name,
                "contribution": value,
                "direction": direction,
                "description": self._get_feature_description(name, data, value),
            })

        # Calculate confidence interval using training error
        mae = self.metrics["test"]["mae"]
        confidence_interval = (
            max(0, prediction - 1.96 * mae),
            prediction + 1.96 * mae,
        )

        # Classify risk level
        risk_level = self._classify_risk(prediction)

        return {
            "predicted_hours": round(prediction, 1),
            "risk_level": risk_level,
            "confidence_interval": (
                round(confidence_interval[0], 1),
                round(confidence_interval[1], 1),
            ),
            "feature_contributions": contributions,
            "top_factors": top_factors,
            "base_value": float(self.explainer.expected_value),
        }

    def _classify_risk(self, hours: float) -> str:
        """Classify prediction into risk level."""
        if hours <= self.RISK_THRESHOLDS["low"]:
            return "low"
        elif hours <= self.RISK_THRESHOLDS["medium"]:
            return "medium"
        elif hours <= self.RISK_THRESHOLDS["high"]:
            return "high"
        else:
            return "critical"

    def _get_feature_description(
        self, feature_name: str, data: dict, contribution: float
    ) -> str:
        """
        Generate human-readable description of a feature's contribution.

        Why this matters:
        - Raw feature names aren't meaningful to HR users
        - Context about the specific value helps interpretation
        - Prepares data for LLM explanation generation
        """
        direction = "increasing" if contribution > 0 else "decreasing"

        # Handle specific features with meaningful descriptions
        if "Reason for absence" in feature_name:
            reason_code = data.get("reason_for_absence", 0)
            reason_name = REASON_CATEGORIES.get(reason_code, "Unknown")
            return f"Absence reason '{reason_name}' is {direction} predicted hours"

        elif "Age" in feature_name:
            age = data.get("age", "unknown")
            return f"Age of {age} years is {direction} predicted hours"

        elif "Body mass index" in feature_name or "bmi" in feature_name.lower():
            bmi = data.get("bmi", "unknown")
            return f"BMI of {bmi} is {direction} predicted hours"

        elif "Day of the week" in feature_name:
            day_map = {2: "Monday", 3: "Tuesday", 4: "Wednesday", 5: "Thursday", 6: "Friday"}
            day = day_map.get(data.get("day_of_week", 0), "unknown")
            return f"Day of week ({day}) is {direction} predicted hours"

        elif "Service time" in feature_name:
            years = data.get("service_time", "unknown")
            return f"{years} years of service is {direction} predicted hours"

        elif "Disciplinary" in feature_name:
            has_failure = data.get("disciplinary_failure", 0)
            status = "having" if has_failure else "not having"
            return f"{status.title()} disciplinary failure is {direction} predicted hours"

        elif "is_monday" in feature_name:
            return f"Being Monday is {direction} predicted hours"

        elif "is_friday" in feature_name:
            return f"Being Friday is {direction} predicted hours"

        elif "reason_is_medical" in feature_name:
            is_medical = data.get("reason_for_absence", 0) in range(1, 22)
            type_str = "medical" if is_medical else "administrative"
            return f"Absence being {type_str} is {direction} predicted hours"

        elif "workload" in feature_name.lower():
            return f"Workload level is {direction} predicted hours"

        elif "Distance" in feature_name:
            dist = data.get("distance_from_residence", "unknown")
            return f"Distance of {dist}km from work is {direction} predicted hours"

        else:
            # Generic fallback
            return f"{feature_name} is {direction} predicted hours"

    def get_feature_importance(self) -> dict:
        """Get global feature importance from the model."""
        importance = dict(zip(self.feature_names, self.model.feature_importances_))
        return dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))

    def get_model_metrics(self) -> dict:
        """Get model performance metrics."""
        return self.metrics
