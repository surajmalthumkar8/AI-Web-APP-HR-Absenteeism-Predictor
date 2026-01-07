"""
NLP Service - Orchestrates natural language query processing.

Why a service layer:
- Combines intent classification, entity extraction, and query execution
- Provides clean interface for API endpoints
- Handles error cases and logging
- Easy to test and mock
"""

from dataclasses import dataclass
from typing import Any

from app.nlp.intent_classifier import classify_query, Intent
from app.nlp.entity_extractor import extract_entities
from app.nlp.query_executor import get_query_executor, QueryResult


@dataclass
class NLPResponse:
    """Complete response for an NLP query."""
    success: bool
    intent: str
    confidence: float
    result_type: str
    data: Any
    message: str
    interpretation: str
    suggestions: list[str]


class NLPService:
    """
    Main service for processing natural language queries.

    Flow:
    1. Classify intent (what does the user want?)
    2. Extract entities (what specifics are mentioned?)
    3. Execute query (get the data)
    4. Format response (present to user)
    """

    # Suggested queries to help users
    SUGGESTED_QUERIES = [
        "Show employees with more than 20 hours of absence",
        "What's the average absence by education level?",
        "Compare absence between smokers and non-smokers",
        "Show monthly absence trends",
        "How many employees have disciplinary failures?",
        "List high-risk employees",
        "What's the average BMI of employees?",
        "Show employees over 40 years old",
    ]

    def __init__(self):
        self.query_executor = get_query_executor()

    async def process_query(self, query: str) -> NLPResponse:
        """
        Process a natural language query and return results.

        Args:
            query: The user's natural language query

        Returns:
            NLPResponse with all query results and metadata
        """
        # Validate input
        query = query.strip()
        if not query:
            return NLPResponse(
                success=False,
                intent="unknown",
                confidence=0,
                result_type="text",
                data=None,
                message="Please enter a query.",
                interpretation="Empty query",
                suggestions=self.SUGGESTED_QUERIES[:4],
            )

        # Step 1: Classify intent
        intent_result = classify_query(query)

        # Step 2: Extract entities
        entities = extract_entities(query)

        # Step 3: Execute query
        query_result = await self.query_executor.execute(
            intent=intent_result,
            entities=entities,
            original_query=query,
        )

        # Step 4: Generate relevant suggestions
        suggestions = self._get_relevant_suggestions(intent_result.intent, query)

        return NLPResponse(
            success=query_result.success,
            intent=intent_result.intent.value,
            confidence=intent_result.confidence,
            result_type=query_result.result_type,
            data=query_result.data,
            message=query_result.message,
            interpretation=query_result.query_interpretation,
            suggestions=suggestions,
        )

    def _get_relevant_suggestions(self, intent: Intent, query: str) -> list[str]:
        """Get query suggestions relevant to the current context."""
        # Filter suggestions to be different from current query
        query_lower = query.lower()

        relevant = [
            s for s in self.SUGGESTED_QUERIES
            if not any(word in query_lower for word in s.lower().split()[:3])
        ]

        # Prioritize suggestions of different intents
        if intent == Intent.FILTER:
            # Suggest aggregate or compare queries
            relevant = sorted(
                relevant,
                key=lambda s: 0 if any(w in s.lower() for w in ["average", "compare", "trend"]) else 1
            )
        elif intent == Intent.AGGREGATE:
            # Suggest filter or compare queries
            relevant = sorted(
                relevant,
                key=lambda s: 0 if any(w in s.lower() for w in ["show", "list", "compare"]) else 1
            )

        return relevant[:4]

    def get_suggestions(self) -> list[str]:
        """Get default query suggestions."""
        return self.SUGGESTED_QUERIES


# Singleton instance
_service: NLPService | None = None


def get_nlp_service() -> NLPService:
    """Get or create the NLP service singleton."""
    global _service
    if _service is None:
        _service = NLPService()
    return _service
