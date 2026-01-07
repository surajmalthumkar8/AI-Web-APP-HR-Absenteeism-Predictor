"""
Model Training Script for Absenteeism Prediction.

Why XGBoost:
- Excellent performance on tabular data with mixed feature types
- Handles small datasets (740 rows) better than deep learning
- Built-in feature importance for explainability
- Fast training and inference
- SHAP TreeExplainer is highly optimized for tree models

Run this script to train and save the model:
    python -m app.ml.train
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
import joblib
import json
from pathlib import Path

from app.config import settings
from app.ml.preprocessor import DataPreprocessor, TARGET_COLUMN


def train_model(save_model: bool = True) -> dict:
    """
    Train the XGBoost regression model for absenteeism prediction.

    Returns:
        Dictionary containing model metrics and feature importances
    """
    print("=" * 60)
    print("ABSENTEEISM PREDICTION MODEL TRAINING")
    print("=" * 60)

    # 1. Load and preprocess data
    print("\n1. Loading data...")
    preprocessor = DataPreprocessor()
    df = preprocessor.load_data()
    print(f"   Loaded {len(df)} records with {len(df.columns)} columns")

    # 2. Prepare features and target
    print("\n2. Preparing features...")
    X = preprocessor.fit_transform(df)
    y = df[TARGET_COLUMN].values

    feature_names = preprocessor.get_feature_names()
    print(f"   Created {X.shape[1]} features")
    print(f"   Target variable: {TARGET_COLUMN}")
    print(f"   Target stats: mean={y.mean():.2f}, std={y.std():.2f}, range=[{y.min()}, {y.max()}]")

    # 3. Train/test split
    print("\n3. Splitting data (80/20)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"   Training samples: {len(X_train)}")
    print(f"   Test samples: {len(X_test)}")

    # 4. Train XGBoost model
    print("\n4. Training XGBoost model...")

    # Hyperparameters tuned for this dataset size
    model = xgb.XGBRegressor(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=3,
        reg_alpha=0.1,  # L1 regularization
        reg_lambda=1.0,  # L2 regularization
        random_state=42,
        n_jobs=-1,
    )

    model.fit(
        X_train,
        y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    # 5. Evaluate model
    print("\n5. Evaluating model...")

    # Training metrics
    y_train_pred = model.predict(X_train)
    train_mae = mean_absolute_error(y_train, y_train_pred)
    train_rmse = np.sqrt(mean_squared_error(y_train, y_train_pred))
    train_r2 = r2_score(y_train, y_train_pred)

    # Test metrics
    y_test_pred = model.predict(X_test)
    test_mae = mean_absolute_error(y_test, y_test_pred)
    test_rmse = np.sqrt(mean_squared_error(y_test, y_test_pred))
    test_r2 = r2_score(y_test, y_test_pred)

    # Cross-validation
    cv_scores = cross_val_score(
        model, X, y, cv=5, scoring="neg_mean_absolute_error"
    )

    print("\n   Training Metrics:")
    print(f"   - MAE:  {train_mae:.2f} hours")
    print(f"   - RMSE: {train_rmse:.2f} hours")
    print(f"   - R2:   {train_r2:.3f}")

    print("\n   Test Metrics:")
    print(f"   - MAE:  {test_mae:.2f} hours")
    print(f"   - RMSE: {test_rmse:.2f} hours")
    print(f"   - R2:   {test_r2:.3f}")

    print(f"\n   5-Fold CV MAE: {-cv_scores.mean():.2f} (+/- {cv_scores.std():.2f})")

    # 6. Feature importance
    print("\n6. Computing feature importance...")
    importance_dict = dict(zip(feature_names, model.feature_importances_))
    sorted_importance = sorted(importance_dict.items(), key=lambda x: x[1], reverse=True)

    print("\n   Top 10 Most Important Features:")
    for i, (name, score) in enumerate(sorted_importance[:10], 1):
        print(f"   {i:2d}. {name}: {score:.4f}")

    # 7. Save artifacts
    if save_model:
        print("\n7. Saving model artifacts...")

        # Ensure models directory exists
        settings.models_path.mkdir(parents=True, exist_ok=True)

        # Save model
        model_path = settings.models_path / settings.model_filename
        joblib.dump(model, model_path)
        print(f"   Model saved to: {model_path}")

        # Save preprocessor
        preprocessor.save()

        # Save feature names
        feature_path = settings.models_path / "feature_names.json"
        with open(feature_path, "w") as f:
            json.dump(feature_names, f, indent=2)
        print(f"   Feature names saved to: {feature_path}")

        # Save metrics
        metrics = {
            "training": {
                "mae": float(train_mae),
                "rmse": float(train_rmse),
                "r2": float(train_r2),
            },
            "test": {
                "mae": float(test_mae),
                "rmse": float(test_rmse),
                "r2": float(test_r2),
            },
            "cv_mae_mean": float(-cv_scores.mean()),
            "cv_mae_std": float(cv_scores.std()),
            "feature_importance": {k: float(v) for k, v in sorted_importance},
        }

        metrics_path = settings.models_path / "metrics.json"
        with open(metrics_path, "w") as f:
            json.dump(metrics, f, indent=2)
        print(f"   Metrics saved to: {metrics_path}")

    print("\n" + "=" * 60)
    print("TRAINING COMPLETE")
    print("=" * 60)

    return {
        "model": model,
        "preprocessor": preprocessor,
        "feature_names": feature_names,
        "metrics": {
            "test_mae": test_mae,
            "test_rmse": test_rmse,
            "test_r2": test_r2,
        },
        "feature_importance": dict(sorted_importance),
    }


if __name__ == "__main__":
    train_model(save_model=True)
