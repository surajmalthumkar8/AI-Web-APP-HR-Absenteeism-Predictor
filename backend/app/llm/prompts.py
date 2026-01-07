"""
Prompt Templates for LLM-Generated Explanations.

Why separate prompts file:
- Easy to iterate on prompts without changing code
- Clear documentation of LLM interface
- Testable prompt generation
- Version control for prompt changes
"""

# Main prediction explanation prompt
PREDICTION_EXPLANATION_PROMPT = """You are an HR analytics assistant helping managers understand absenteeism predictions. Write a clear, actionable explanation.

## Prediction Summary
- Predicted Absence: {predicted_hours} hours
- Risk Level: {risk_level}
- Confidence Range: {confidence_low} to {confidence_high} hours

## Key Contributing Factors
{factors_text}

## Your Task
Write a 2-3 sentence explanation that:
1. States the prediction in plain language
2. Explains the top 2-3 factors driving this prediction
3. Suggests one actionable recommendation for HR

Use professional, empathetic language. Avoid technical jargon. Be concise.

## Response (2-3 sentences only):"""


# NLP query response prompt
NLP_QUERY_PROMPT = """You are an HR data analyst assistant. Answer the user's question based on the data provided.

## User Question
{question}

## Data Results
{data_results}

## Your Task
Provide a clear, concise answer to the question based on the data. Include specific numbers when relevant. Keep your response under 100 words.

## Response:"""


# Risk assessment prompt
RISK_ASSESSMENT_PROMPT = """You are an HR risk analyst. Assess this employee's absenteeism risk profile.

## Employee Profile
- Age: {age} years
- Service Time: {service_time} years
- BMI: {bmi}
- Has Disciplinary Issues: {disciplinary}
- Predicted Absence: {predicted_hours} hours

## Historical Context
- Average absence in dataset: 6.9 hours
- This prediction is {comparison} average

## Your Task
Provide a brief (2-3 sentence) risk assessment with one specific recommendation.

## Response:"""


def format_factors_for_prompt(top_factors: list[dict]) -> str:
    """
    Format SHAP-based factors into readable text for the LLM.

    Args:
        top_factors: List of factor dictionaries from model.predict_with_explanation

    Returns:
        Formatted string for prompt insertion
    """
    lines = []
    for i, factor in enumerate(top_factors[:5], 1):
        feature = factor["feature"]
        direction = factor["direction"]
        description = factor["description"]
        contribution = factor["contribution"]

        # Format contribution as +/- hours
        sign = "+" if contribution > 0 else ""
        hours_impact = f"{sign}{contribution:.1f} hours"

        lines.append(f"{i}. {description} ({hours_impact})")

    return "\n".join(lines)


def build_explanation_prompt(
    predicted_hours: float,
    risk_level: str,
    confidence_interval: tuple,
    top_factors: list[dict],
) -> str:
    """
    Build the complete explanation prompt for Ollama.

    Args:
        predicted_hours: Model prediction
        risk_level: Classified risk level
        confidence_interval: (low, high) tuple
        top_factors: SHAP-based factors

    Returns:
        Complete prompt string
    """
    factors_text = format_factors_for_prompt(top_factors)

    return PREDICTION_EXPLANATION_PROMPT.format(
        predicted_hours=predicted_hours,
        risk_level=risk_level.upper(),
        confidence_low=confidence_interval[0],
        confidence_high=confidence_interval[1],
        factors_text=factors_text,
    )


def build_nlp_query_prompt(question: str, data_results: str) -> str:
    """Build prompt for NLP query responses."""
    return NLP_QUERY_PROMPT.format(
        question=question,
        data_results=data_results,
    )


# Fallback explanations when Ollama is unavailable
FALLBACK_EXPLANATIONS = {
    "low": "This employee has a low predicted absence of {hours} hours. The main factors are typical for employees with minimal absence risk. No immediate action is needed, but regular check-ins are recommended.",
    "medium": "This employee has a moderate predicted absence of {hours} hours, suggesting potential for 1-2 days off. Key factors include their work profile and personal circumstances. Consider proactive engagement to understand any underlying concerns.",
    "high": "This employee has an elevated predicted absence of {hours} hours, indicating potential for extended time off. Several risk factors are present. Recommend scheduling a supportive conversation to discuss workload and wellbeing.",
    "critical": "This employee has a high predicted absence of {hours} hours, suggesting significant risk for extended absence. Multiple contributing factors are present. Urgent recommendation: initiate a wellness check-in and review workload distribution.",
}


def get_fallback_explanation(predicted_hours: float, risk_level: str) -> str:
    """Generate fallback explanation when LLM is unavailable."""
    template = FALLBACK_EXPLANATIONS.get(risk_level, FALLBACK_EXPLANATIONS["medium"])
    return template.format(hours=round(predicted_hours, 1))
