"""
Explanation Service - Generates human-readable prediction explanations.

Why this service:
- Combines SHAP-based feature importance with LLM narration
- Provides graceful fallback when LLM is unavailable
- Centralizes all explanation generation logic
- Abstracts LLM complexity from API layer
"""

from app.llm.ollama_client import (
    get_ollama_client,
    OllamaConnectionError,
    OllamaGenerationError,
)
from app.llm.prompts import (
    build_explanation_prompt,
    get_fallback_explanation,
)


class ExplanationService:
    """
    Service for generating natural language explanations of predictions.

    Flow:
    1. Receive prediction results with SHAP values
    2. Build structured prompt with context
    3. Send to Ollama for natural language generation
    4. Fall back to template if LLM unavailable
    """

    def __init__(self):
        self.ollama_client = get_ollama_client()

    async def generate_explanation(
        self,
        predicted_hours: float,
        risk_level: str,
        confidence_interval: tuple,
        top_factors: list[dict],
        use_llm: bool = True,
    ) -> dict:
        """
        Generate a human-readable explanation for a prediction.

        Args:
            predicted_hours: The predicted absence hours
            risk_level: Classified risk (low/medium/high/critical)
            confidence_interval: (low, high) bounds
            top_factors: List of top contributing factors from SHAP
            use_llm: Whether to attempt LLM generation

        Returns:
            Dictionary containing:
            - explanation: The generated text
            - source: "llm" or "fallback"
            - llm_available: Whether LLM was available
        """
        explanation = None
        source = "fallback"
        llm_available = False

        if use_llm:
            try:
                # Check if Ollama is available
                llm_available = await self.ollama_client.is_available()

                if llm_available:
                    # Build the prompt
                    prompt = build_explanation_prompt(
                        predicted_hours=predicted_hours,
                        risk_level=risk_level,
                        confidence_interval=confidence_interval,
                        top_factors=top_factors,
                    )

                    # Generate explanation
                    explanation = await self.ollama_client.generate(
                        prompt,
                        temperature=0.1,  # Low for consistent explanations
                        max_tokens=200,
                    )

                    # Clean up the response
                    explanation = self._clean_response(explanation)
                    source = "llm"

            except (OllamaConnectionError, OllamaGenerationError) as e:
                # Log error but continue with fallback
                print(f"LLM generation failed: {e}")
                llm_available = False

        # Use fallback if LLM didn't work
        if explanation is None:
            explanation = get_fallback_explanation(predicted_hours, risk_level)
            source = "fallback"

        return {
            "explanation": explanation,
            "source": source,
            "llm_available": llm_available,
        }

    def _clean_response(self, text: str) -> str:
        """
        Clean and validate LLM response.

        Why cleaning is needed:
        - LLMs sometimes add preamble ("Here's the explanation:")
        - May include markdown formatting we don't want
        - Could have trailing whitespace or newlines
        """
        # Remove common preambles
        preambles = [
            "Here's the explanation:",
            "Here is the explanation:",
            "Explanation:",
            "Response:",
        ]
        for preamble in preambles:
            if text.lower().startswith(preamble.lower()):
                text = text[len(preamble):].strip()

        # Remove markdown bold/italic markers
        text = text.replace("**", "").replace("__", "")

        # Ensure it ends with proper punctuation
        text = text.strip()
        if text and text[-1] not in ".!?":
            text += "."

        return text

    async def generate_risk_summary(
        self,
        employees: list[dict],
    ) -> str:
        """
        Generate a summary of risk across multiple employees.

        Useful for dashboard overview cards.
        """
        high_risk_count = sum(
            1 for e in employees
            if e.get("risk_level") in ("high", "critical")
        )
        total = len(employees)

        if high_risk_count == 0:
            return f"All {total} employees are at low to moderate risk. No immediate concerns."
        elif high_risk_count <= 3:
            return f"{high_risk_count} of {total} employees show elevated absence risk. Consider proactive check-ins."
        else:
            pct = (high_risk_count / total) * 100
            return f"{high_risk_count} employees ({pct:.0f}%) are at high risk. Recommend reviewing workload distribution and conducting wellness assessments."


# Singleton instance
_service: ExplanationService | None = None


def get_explanation_service() -> ExplanationService:
    """Get or create the explanation service singleton."""
    global _service
    if _service is None:
        _service = ExplanationService()
    return _service
