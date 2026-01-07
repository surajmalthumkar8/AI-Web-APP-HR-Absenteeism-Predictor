# HR Absenteeism Predictor

An AI-powered web application for HR decision support, predicting employee absenteeism with explainable AI and natural language querying.

![Tech Stack](https://img.shields.io/badge/React-18-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green) ![XGBoost](https://img.shields.io/badge/XGBoost-2.0-orange) ![Ollama](https://img.shields.io/badge/Ollama-LLM-purple)

## Overview

This enterprise-grade application demonstrates the integration of:
- **Machine Learning** - XGBoost regression for absence prediction
- **Explainable AI** - SHAP values for feature importance
- **LLM Integration** - Ollama for natural language explanations
- **NLP Interface** - Query data using plain English
- **Modern Web Stack** - React + TypeScript + FastAPI

### Why This Project Matters

HR departments need data-driven insights to:
- Proactively identify at-risk employees
- Understand factors driving absenteeism
- Make informed workforce planning decisions

This tool transforms raw data into actionable intelligence with AI-generated recommendations.

## Features

### 1. Dashboard
- KPI cards (total employees, average absence, at-risk count)
- Monthly trend visualization
- Top absence reasons breakdown
- Quick navigation to key features

### 2. AI Predictions
- Form-based employee data input
- Real-time ML predictions
- SHAP-based feature importance charts
- LLM-generated explanations for non-technical users

### 3. Employee Data
- Paginated, sortable data table
- Filter by age, education, absence hours
- At-risk employee highlighting

### 4. Analytics
- Feature importance visualization
- Absence distribution analysis
- Education level comparisons
- Weekday pattern analysis

### 5. Natural Language Queries
- Ask questions in plain English
- Automatic intent classification
- Dynamic result visualization (tables, charts, metrics)
- Suggested follow-up queries

## Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| FastAPI | High-performance Python API framework |
| XGBoost | Gradient boosting for predictions |
| SHAP | Explainable AI / feature importance |
| Ollama | Local LLM for text generation |
| Pydantic | Data validation and schemas |

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| TailwindCSS | Styling |
| Recharts | Data visualization |
| React Query | Server state management |
| Zustand | Client state management |

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Ollama (for LLM features)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Train the model
python -m app.ml.train

# Start the server
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at http://localhost:5173

### Ollama Setup (Optional but Recommended)

```bash
# Install Ollama (see https://ollama.ai)
ollama serve

# Pull the LLM model
ollama pull llama3.2
```

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/predictions/single` | POST | Single employee prediction |
| `/api/v1/predictions/batch` | POST | Batch predictions |
| `/api/v1/employees` | GET | List employees (paginated) |
| `/api/v1/analytics/summary` | GET | Dashboard statistics |
| `/api/v1/analytics/feature-importance` | GET | Model feature importance |
| `/api/v1/nlp/query` | POST | Natural language query |

## Project Structure

```
hr-absenteeism-predictor/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/  # API routes
│   │   ├── services/          # Business logic
│   │   ├── ml/                # ML model & training
│   │   ├── llm/               # Ollama integration
│   │   └── nlp/               # NLP query processing
│   ├── data/                  # Dataset
│   └── models/                # Trained model artifacts
│
├── frontend/
│   ├── src/
│   │   ├── pages/             # Page components
│   │   ├── components/        # Reusable components
│   │   ├── api/               # API client
│   │   └── types/             # TypeScript types
│   └── public/
│
└── docker-compose.yml         # Container orchestration
```

## Architecture Decisions

### Why XGBoost over Deep Learning?
- Dataset is small (740 rows) - tree models excel here
- Built-in feature importance for explainability
- Fast training and inference
- SHAP TreeExplainer is highly optimized

### Why Ollama over OpenAI?
- Free and local - no API costs
- Data privacy - nothing leaves your machine
- Demonstrates self-hosted LLM deployment

### Why Hybrid NLP (Rules + LLM)?
- Rules for speed and reliability on common queries
- LLM fallback for complex questions
- Best of both worlds

## Model Performance

| Metric | Value |
|--------|-------|
| Test MAE | ~5.2 hours |
| Test RMSE | ~7.8 hours |
| Test R² | ~0.15 |

*Note: R² is moderate due to inherent noise in human behavior data. The model still provides valuable directional predictions.*

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Dataset: [UCI Machine Learning Repository - Absenteeism at Work](https://archive.ics.uci.edu/dataset/445/absenteeism+at+work)
- Built as a portfolio demonstration of enterprise AI application development
