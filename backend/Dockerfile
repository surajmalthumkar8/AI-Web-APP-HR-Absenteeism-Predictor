FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Train model if not exists
RUN python -c "from pathlib import Path; \
    models_path = Path('models'); \
    models_path.mkdir(exist_ok=True); \
    if not (models_path / 'absenteeism_model.joblib').exists(): \
        exec(open('app/ml/train.py').read())"

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
