"""
Data Preprocessing Pipeline for Absenteeism Prediction.

Why a dedicated preprocessor:
- Ensures consistent data transformation between training and inference
- Encapsulates all feature engineering logic
- Can be serialized and loaded with the model
- Makes the pipeline reproducible and testable
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import joblib
from pathlib import Path

from app.config import settings


# Feature column names (matching the CSV)
FEATURE_COLUMNS = [
    "Reason for absence",
    "Month of absence",
    "Day of the week",
    "Seasons",
    "Transportation expense",
    "Distance from Residence to Work",
    "Service time",
    "Age",
    "Work load Average/day ",  # Note: has trailing space in original data
    "Hit target",
    "Disciplinary failure",
    "Education",
    "Son",
    "Social drinker",
    "Social smoker",
    "Pet",
    "Weight",
    "Height",
    "Body mass index",
]

TARGET_COLUMN = "Absenteeism time in hours"

# Reason for absence code mappings (ICD-10 based)
REASON_CATEGORIES = {
    0: "Unknown",
    1: "Infectious diseases",
    2: "Neoplasms",
    3: "Blood diseases",
    4: "Endocrine diseases",
    5: "Mental disorders",
    6: "Nervous system",
    7: "Eye diseases",
    8: "Ear diseases",
    9: "Circulatory system",
    10: "Respiratory system",
    11: "Digestive system",
    12: "Skin diseases",
    13: "Musculoskeletal",
    14: "Genitourinary",
    15: "Pregnancy",
    16: "Perinatal conditions",
    17: "Congenital malformations",
    18: "Abnormal findings",
    19: "Injury/poisoning",
    20: "External causes",
    21: "Health factors",
    22: "Patient follow-up",
    23: "Medical consultation",
    24: "Blood donation",
    25: "Lab examination",
    26: "Unjustified absence",
    27: "Physiotherapy",
    28: "Dental consultation",
}


class DataPreprocessor:
    """
    Preprocesses employee data for model training and inference.

    Responsibilities:
    - Load and clean raw data
    - Engineer features (reason categories, BMI risk, etc.)
    - Scale numeric features
    - Handle missing values
    """

    def __init__(self):
        self.scaler = StandardScaler()
        self.feature_names = FEATURE_COLUMNS.copy()
        self.is_fitted = False

        # Numeric columns to scale
        self.numeric_cols = [
            "Transportation expense",
            "Distance from Residence to Work",
            "Service time",
            "Age",
            "Work load Average/day ",
            "Hit target",
            "Weight",
            "Height",
            "Body mass index",
        ]

        # Categorical columns (already encoded as integers in this dataset)
        self.categorical_cols = [
            "Reason for absence",
            "Month of absence",
            "Day of the week",
            "Seasons",
            "Disciplinary failure",
            "Education",
            "Son",
            "Social drinker",
            "Social smoker",
            "Pet",
        ]

    def load_data(self, filepath: Path | str | None = None) -> pd.DataFrame:
        """
        Load the absenteeism dataset from CSV.

        Note: The CSV uses semicolon delimiter, not comma.
        """
        if filepath is None:
            filepath = settings.data_path

        df = pd.read_csv(filepath, sep=";")
        return df

    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create additional features that improve model performance.

        Why these features:
        - reason_is_medical: Binary flag for medical vs administrative absence
        - bmi_category: Categorical health risk indicator
        - is_monday/is_friday: Captures start/end of week patterns
        - age_group: Bins age into meaningful HR categories
        """
        df = df.copy()

        # Binary: Is the absence reason medical (1-21) vs administrative (22-28)?
        df["reason_is_medical"] = (df["Reason for absence"] >= 1) & (
            df["Reason for absence"] <= 21
        )
        df["reason_is_medical"] = df["reason_is_medical"].astype(int)

        # BMI risk categories
        df["bmi_category"] = pd.cut(
            df["Body mass index"],
            bins=[0, 18.5, 25, 30, 100],
            labels=[0, 1, 2, 3],  # underweight, normal, overweight, obese
        ).astype(int)

        # Day of week patterns (Mon=2, Fri=6 in this dataset)
        df["is_monday"] = (df["Day of the week"] == 2).astype(int)
        df["is_friday"] = (df["Day of the week"] == 6).astype(int)

        # Age groups for HR segmentation
        df["age_group"] = pd.cut(
            df["Age"],
            bins=[0, 30, 40, 50, 100],
            labels=[0, 1, 2, 3],  # young, middle, senior, veteran
        ).astype(int)

        # Workload intensity (normalized)
        df["workload_intensity"] = df["Work load Average/day "] / df["Hit target"]

        return df

    def fit(self, df: pd.DataFrame) -> "DataPreprocessor":
        """
        Fit the preprocessor on training data.

        Learns scaling parameters from the data.
        """
        df = self.engineer_features(df)
        self.scaler.fit(df[self.numeric_cols])
        self.is_fitted = True
        return self

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        """
        Transform data using fitted preprocessor.

        Returns numpy array ready for model input.
        """
        if not self.is_fitted:
            raise ValueError("Preprocessor must be fitted before transform")

        df = self.engineer_features(df)

        # Scale numeric columns
        numeric_scaled = self.scaler.transform(df[self.numeric_cols])

        # Get categorical columns as-is (already encoded)
        categorical = df[self.categorical_cols].values

        # Get engineered features
        engineered = df[
            [
                "reason_is_medical",
                "bmi_category",
                "is_monday",
                "is_friday",
                "age_group",
                "workload_intensity",
            ]
        ].values

        # Combine all features
        features = np.hstack([numeric_scaled, categorical, engineered])

        return features

    def fit_transform(self, df: pd.DataFrame) -> np.ndarray:
        """Fit and transform in one step."""
        self.fit(df)
        return self.transform(df)

    def get_feature_names(self) -> list[str]:
        """Return ordered list of feature names after transformation."""
        engineered_cols = [
            "reason_is_medical",
            "bmi_category",
            "is_monday",
            "is_friday",
            "age_group",
            "workload_intensity",
        ]
        return self.numeric_cols + self.categorical_cols + engineered_cols

    def save(self, filepath: Path | str | None = None) -> None:
        """Save fitted preprocessor to disk."""
        if filepath is None:
            filepath = settings.models_path / settings.preprocessor_filename
        joblib.dump(self, filepath)
        print(f"Preprocessor saved to {filepath}")

    @classmethod
    def load(cls, filepath: Path | str | None = None) -> "DataPreprocessor":
        """Load fitted preprocessor from disk."""
        if filepath is None:
            filepath = settings.models_path / settings.preprocessor_filename
        return joblib.load(filepath)


def prepare_single_input(data: dict) -> pd.DataFrame:
    """
    Convert a single prediction request dict to DataFrame.

    Why this function:
    - API receives JSON with snake_case keys
    - Model expects DataFrame with original column names
    - Centralizes the mapping logic
    """
    # Map API field names to dataset column names
    column_mapping = {
        "reason_for_absence": "Reason for absence",
        "month_of_absence": "Month of absence",
        "day_of_week": "Day of the week",
        "seasons": "Seasons",
        "transportation_expense": "Transportation expense",
        "distance_from_residence": "Distance from Residence to Work",
        "service_time": "Service time",
        "age": "Age",
        "workload_average": "Work load Average/day ",
        "hit_target": "Hit target",
        "disciplinary_failure": "Disciplinary failure",
        "education": "Education",
        "son": "Son",
        "social_drinker": "Social drinker",
        "social_smoker": "Social smoker",
        "pet": "Pet",
        "weight": "Weight",
        "height": "Height",
        "bmi": "Body mass index",
    }

    # Remap keys
    remapped = {column_mapping.get(k, k): v for k, v in data.items()}

    return pd.DataFrame([remapped])
