"""
Entity Extraction for Natural Language Queries.

Why entity extraction:
- Identifies specific fields, values, and operators in queries
- Enables structured query construction from natural language
- Provides context for query execution
- Makes the NLP system more precise

Extracted entities:
- FIELD: Dataset column references (age, absence hours, BMI, etc.)
- OPERATOR: Comparison operators (>, <, =, between)
- VALUE: Numeric or categorical values
- AGGREGATION: Aggregation functions (avg, sum, count, etc.)
"""

import re
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ExtractedEntities:
    """Container for extracted entities from a query."""
    fields: list[str] = field(default_factory=list)
    operators: list[str] = field(default_factory=list)
    values: list[Any] = field(default_factory=list)
    aggregations: list[str] = field(default_factory=list)
    groups: list[str] = field(default_factory=list)
    conditions: list[dict] = field(default_factory=list)


class EntityExtractor:
    """
    Extracts structured entities from natural language queries.

    Maps natural language terms to dataset column names and operators.
    """

    # Field name aliases - maps user terms to actual column names
    FIELD_ALIASES = {
        # Absence-related
        "absence": "Absenteeism time in hours",
        "absent": "Absenteeism time in hours",
        "absenteeism": "Absenteeism time in hours",
        "hours": "Absenteeism time in hours",
        "absence hours": "Absenteeism time in hours",
        "time off": "Absenteeism time in hours",

        # Personal attributes
        "age": "Age",
        "years old": "Age",
        "bmi": "Body mass index",
        "body mass": "Body mass index",
        "weight": "Weight",
        "height": "Height",

        # Work-related
        "service": "Service time",
        "tenure": "Service time",
        "years of service": "Service time",
        "experience": "Service time",
        "workload": "Work load Average/day ",
        "work load": "Work load Average/day ",
        "target": "Hit target",
        "performance": "Hit target",
        "distance": "Distance from Residence to Work",
        "commute": "Distance from Residence to Work",
        "transport": "Transportation expense",
        "transportation": "Transportation expense",

        # Categories
        "education": "Education",
        "reason": "Reason for absence",
        "absence reason": "Reason for absence",
        "day": "Day of the week",
        "weekday": "Day of the week",
        "month": "Month of absence",
        "season": "Seasons",

        # Lifestyle
        "children": "Son",
        "kids": "Son",
        "son": "Son",
        "sons": "Son",
        "pets": "Pet",
        "pet": "Pet",
        "drinker": "Social drinker",
        "drinking": "Social drinker",
        "smoker": "Social smoker",
        "smoking": "Social smoker",
        "disciplinary": "Disciplinary failure",
        "discipline": "Disciplinary failure",
    }

    # Operator patterns
    OPERATOR_PATTERNS = {
        "greater_than": [r"(greater|more|over|above|>)\s*(than)?", r">\s*=?"],
        "less_than": [r"(less|fewer|under|below|<)\s*(than)?", r"<\s*=?"],
        "equals": [r"(equals?|is|are|=)\s*(to)?", r"=="],
        "between": [r"between\s+(\d+)\s+(and|to)\s+(\d+)"],
        "not_equals": [r"(not|isn't|aren't|!=)\s*(equal)?"],
    }

    # Aggregation keywords
    AGGREGATION_KEYWORDS = {
        "average": "mean",
        "avg": "mean",
        "mean": "mean",
        "total": "sum",
        "sum": "sum",
        "count": "count",
        "number": "count",
        "how many": "count",
        "maximum": "max",
        "max": "max",
        "highest": "max",
        "most": "max",
        "minimum": "min",
        "min": "min",
        "lowest": "min",
        "least": "min",
        "median": "median",
    }

    # Group by keywords
    GROUP_KEYWORDS = {
        "by age": "Age",
        "by education": "Education",
        "by department": "Reason for absence",  # No dept in dataset, use reason
        "by reason": "Reason for absence",
        "by month": "Month of absence",
        "by day": "Day of the week",
        "by season": "Seasons",
        "per employee": "ID",
    }

    def extract(self, query: str) -> ExtractedEntities:
        """
        Extract all entities from a natural language query.

        Args:
            query: The user's query text

        Returns:
            ExtractedEntities containing all identified entities
        """
        query_lower = query.lower()
        entities = ExtractedEntities()

        # Extract fields
        entities.fields = self._extract_fields(query_lower)

        # Extract operators and values (conditions)
        entities.conditions = self._extract_conditions(query_lower)

        # Extract aggregations
        entities.aggregations = self._extract_aggregations(query_lower)

        # Extract group by clauses
        entities.groups = self._extract_groups(query_lower)

        return entities

    def _extract_fields(self, query: str) -> list[str]:
        """Extract field references from query."""
        found_fields = []

        for alias, column in self.FIELD_ALIASES.items():
            if alias in query and column not in found_fields:
                found_fields.append(column)

        return found_fields

    def _extract_conditions(self, query: str) -> list[dict]:
        """Extract filter conditions (field, operator, value)."""
        conditions = []

        # Pattern: [field] [operator] [number]
        # e.g., "age greater than 40", "absence > 10", "bmi over 25"

        for alias, column in self.FIELD_ALIASES.items():
            if alias not in query:
                continue

            # Look for comparison patterns after the field mention
            field_pos = query.find(alias)
            rest_of_query = query[field_pos:]

            # Check for numeric comparisons
            for op_name, patterns in self.OPERATOR_PATTERNS.items():
                for pattern in patterns:
                    match = re.search(f"{pattern}\\s*(\\d+(?:\\.\\d+)?)", rest_of_query)
                    if match:
                        value = float(match.group(match.lastindex))
                        conditions.append({
                            "field": column,
                            "operator": op_name,
                            "value": value,
                        })
                        break

            # Check for between pattern
            between_match = re.search(
                r"between\s+(\d+(?:\.\d+)?)\s+(?:and|to)\s+(\d+(?:\.\d+)?)",
                rest_of_query
            )
            if between_match:
                conditions.append({
                    "field": column,
                    "operator": "between",
                    "value": (float(between_match.group(1)), float(between_match.group(2))),
                })

        # Look for standalone numeric conditions
        # e.g., "employees over 40" (implicitly about age)
        age_pattern = re.search(r"(over|under|above|below)\s+(\d{2})\s*(years?|old)?", query)
        if age_pattern and "Age" not in [c["field"] for c in conditions]:
            op = "greater_than" if age_pattern.group(1) in ["over", "above"] else "less_than"
            conditions.append({
                "field": "Age",
                "operator": op,
                "value": float(age_pattern.group(2)),
            })

        return conditions

    def _extract_aggregations(self, query: str) -> list[str]:
        """Extract aggregation functions from query."""
        found_aggs = []

        for keyword, agg_func in self.AGGREGATION_KEYWORDS.items():
            if keyword in query and agg_func not in found_aggs:
                found_aggs.append(agg_func)

        return found_aggs

    def _extract_groups(self, query: str) -> list[str]:
        """Extract group by clauses from query."""
        found_groups = []

        for keyword, column in self.GROUP_KEYWORDS.items():
            if keyword in query and column not in found_groups:
                found_groups.append(column)

        return found_groups


# Singleton instance
_extractor: EntityExtractor | None = None


def get_entity_extractor() -> EntityExtractor:
    """Get or create the entity extractor singleton."""
    global _extractor
    if _extractor is None:
        _extractor = EntityExtractor()
    return _extractor


def extract_entities(query: str) -> ExtractedEntities:
    """Convenience function to extract entities from a query."""
    return get_entity_extractor().extract(query)
