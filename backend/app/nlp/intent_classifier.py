"""
Intent Classification for Natural Language Queries.

Why intent classification:
- Routes queries to appropriate handlers
- Improves accuracy by narrowing the problem space
- Enables specialized responses for each query type
- Faster than sending everything to LLM

Supported intents:
- FILTER: "Show employees with X > Y"
- AGGREGATE: "What's the average/total/count..."
- COMPARE: "Compare X between groups"
- TREND: "Show trend over time"
- PREDICT: "Predict absence for..."
- GENERAL: Questions requiring LLM response
"""

import re
from enum import Enum
from dataclasses import dataclass


class Intent(str, Enum):
    """Query intent types."""
    FILTER = "filter"
    AGGREGATE = "aggregate"
    COMPARE = "compare"
    TREND = "trend"
    PREDICT = "predict"
    GENERAL = "general"


@dataclass
class ClassificationResult:
    """Result of intent classification."""
    intent: Intent
    confidence: float
    matched_patterns: list[str]


class IntentClassifier:
    """
    Rule-based intent classifier for HR queries.

    Why rule-based over ML:
    - Deterministic and predictable
    - No training data required
    - Fast inference
    - Easy to debug and extend
    - Sufficient for our focused domain
    """

    # Pattern definitions for each intent
    INTENT_PATTERNS = {
        Intent.FILTER: [
            r"\b(show|list|find|get|display|who)\b.*\b(employees?|workers?|staff)\b",
            r"\b(employees?|workers?)\b.*(where|with|having|that have)\b",
            r"\bwho (has|have|is|are)\b",
            r"\b(filter|search)\b",
            r"\b(more|less|greater|fewer|above|below|over|under)\s+than\b",
            r"\bat[\s-]?risk\b",
        ],
        Intent.AGGREGATE: [
            r"\b(average|avg|mean)\b",
            r"\b(total|sum)\b",
            r"\b(count|how many|number of)\b",
            r"\b(maximum|max|highest|most)\b",
            r"\b(minimum|min|lowest|least)\b",
            r"\b(median|percentile)\b",
            r"\bwhat('s| is) the\b.*\b(average|total|count)\b",
        ],
        Intent.COMPARE: [
            r"\bcompare\b",
            r"\bdifference\s+between\b",
            r"\b(vs\.?|versus)\b",
            r"\b(higher|lower)\s+than\b.*\bor\b",
            r"\bbetween\b.*\band\b.*\b(groups?|categories)\b",
            r"\bby\s+(department|age|gender|education)\b",
        ],
        Intent.TREND: [
            r"\btrend\b",
            r"\bover\s+(time|months?|years?|weeks?)\b",
            r"\b(monthly|weekly|yearly|quarterly)\b",
            r"\bchange\b.*\bover\b",
            r"\bhistory\b",
            r"\bprogression\b",
        ],
        Intent.PREDICT: [
            r"\bpredict\b",
            r"\bforecast\b",
            r"\bestimate\b.*\babsence\b",
            r"\bwhat\s+(will|would)\b.*\babsence\b",
            r"\bexpected\s+absence\b",
            r"\brisk\s+(score|level|assessment)\b",
        ],
    }

    # Keywords that boost confidence for each intent
    INTENT_KEYWORDS = {
        Intent.FILTER: ["show", "list", "find", "employees", "who", "where", "with"],
        Intent.AGGREGATE: ["average", "total", "count", "how many", "sum", "mean"],
        Intent.COMPARE: ["compare", "difference", "vs", "versus", "between"],
        Intent.TREND: ["trend", "over time", "monthly", "history", "progression"],
        Intent.PREDICT: ["predict", "forecast", "estimate", "risk", "expected"],
    }

    def classify(self, query: str) -> ClassificationResult:
        """
        Classify a natural language query into an intent.

        Args:
            query: The user's natural language query

        Returns:
            ClassificationResult with intent, confidence, and matched patterns
        """
        query_lower = query.lower().strip()
        scores = {}
        matches = {}

        # Score each intent based on pattern matches
        for intent, patterns in self.INTENT_PATTERNS.items():
            intent_matches = []
            score = 0.0

            for pattern in patterns:
                if re.search(pattern, query_lower, re.IGNORECASE):
                    intent_matches.append(pattern)
                    score += 1.0

            # Bonus for keyword matches
            keywords = self.INTENT_KEYWORDS.get(intent, [])
            keyword_count = sum(1 for kw in keywords if kw in query_lower)
            score += keyword_count * 0.3

            scores[intent] = score
            matches[intent] = intent_matches

        # Find best match
        if scores:
            best_intent = max(scores, key=scores.get)
            best_score = scores[best_intent]

            # Calculate confidence (normalize by max possible score)
            max_possible = len(self.INTENT_PATTERNS.get(best_intent, [])) + \
                          len(self.INTENT_KEYWORDS.get(best_intent, [])) * 0.3
            confidence = min(best_score / max_possible if max_possible > 0 else 0, 1.0)

            # If confidence is too low, classify as GENERAL
            if confidence < 0.2 or best_score < 0.5:
                return ClassificationResult(
                    intent=Intent.GENERAL,
                    confidence=1.0 - confidence,  # Inverse confidence
                    matched_patterns=[],
                )

            return ClassificationResult(
                intent=best_intent,
                confidence=confidence,
                matched_patterns=matches[best_intent],
            )

        # Default to GENERAL if no patterns match
        return ClassificationResult(
            intent=Intent.GENERAL,
            confidence=0.5,
            matched_patterns=[],
        )


# Singleton instance
_classifier: IntentClassifier | None = None


def get_intent_classifier() -> IntentClassifier:
    """Get or create the intent classifier singleton."""
    global _classifier
    if _classifier is None:
        _classifier = IntentClassifier()
    return _classifier


def classify_query(query: str) -> ClassificationResult:
    """Convenience function to classify a query."""
    return get_intent_classifier().classify(query)
