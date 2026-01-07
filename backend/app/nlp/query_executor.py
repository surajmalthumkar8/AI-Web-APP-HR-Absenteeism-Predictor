"""
Query Executor - Translates parsed NLP queries into data operations.

Why query executor:
- Bridges NLP parsing and data operations
- Handles different query types (filter, aggregate, compare)
- Formats results for frontend display
- Provides consistent response structure
"""

import pandas as pd
import numpy as np
from typing import Any
from dataclasses import dataclass

from app.config import settings
from app.nlp.intent_classifier import Intent, ClassificationResult
from app.nlp.entity_extractor import ExtractedEntities
from app.llm.ollama_client import get_ollama_client
from app.llm.prompts import build_nlp_query_prompt


@dataclass
class QueryResult:
    """Result of executing an NLP query."""
    success: bool
    result_type: str  # "table", "metric", "chart_data", "text"
    data: Any
    message: str
    query_interpretation: str
    row_count: int = 0


class QueryExecutor:
    """
    Executes NLP queries against the absenteeism dataset.

    Supports:
    - Filter queries: Return filtered employee records
    - Aggregate queries: Return computed statistics
    - Compare queries: Return grouped comparisons
    - Trend queries: Return time-series data
    - General queries: Use LLM to generate response
    """

    def __init__(self):
        self._df: pd.DataFrame | None = None

    @property
    def df(self) -> pd.DataFrame:
        """Lazy-load the dataset."""
        if self._df is None:
            self._df = pd.read_csv(settings.data_path, sep=";")
        return self._df

    async def execute(
        self,
        intent: ClassificationResult,
        entities: ExtractedEntities,
        original_query: str,
    ) -> QueryResult:
        """
        Execute a parsed NLP query.

        Args:
            intent: Classified query intent
            entities: Extracted entities
            original_query: Original user query text

        Returns:
            QueryResult with data and metadata
        """
        handlers = {
            Intent.FILTER: self._execute_filter,
            Intent.AGGREGATE: self._execute_aggregate,
            Intent.COMPARE: self._execute_compare,
            Intent.TREND: self._execute_trend,
            Intent.PREDICT: self._execute_predict,
            Intent.GENERAL: self._execute_general,
        }

        handler = handlers.get(intent.intent, self._execute_general)

        try:
            return await handler(entities, original_query)
        except Exception as e:
            return QueryResult(
                success=False,
                result_type="text",
                data=None,
                message=f"Error executing query: {str(e)}",
                query_interpretation=f"Failed to process: {original_query}",
            )

    async def _execute_filter(
        self, entities: ExtractedEntities, query: str
    ) -> QueryResult:
        """Execute a filter query - returns matching records."""
        df = self.df.copy()
        interpretation_parts = []

        # Apply conditions
        for condition in entities.conditions:
            field = condition["field"]
            op = condition["operator"]
            value = condition["value"]

            if field not in df.columns:
                continue

            if op == "greater_than":
                df = df[df[field] > value]
                interpretation_parts.append(f"{field} > {value}")
            elif op == "less_than":
                df = df[df[field] < value]
                interpretation_parts.append(f"{field} < {value}")
            elif op == "equals":
                df = df[df[field] == value]
                interpretation_parts.append(f"{field} = {value}")
            elif op == "between":
                df = df[(df[field] >= value[0]) & (df[field] <= value[1])]
                interpretation_parts.append(f"{field} between {value[0]} and {value[1]}")

        # If no conditions but query mentions "at risk" or "high risk"
        if not entities.conditions and ("risk" in query.lower() or "at-risk" in query.lower()):
            # High risk = above average absence
            avg_absence = self.df["Absenteeism time in hours"].mean()
            df = df[df["Absenteeism time in hours"] > avg_absence * 1.5]
            interpretation_parts.append(f"Absenteeism > {avg_absence * 1.5:.1f} hours (high risk)")

        interpretation = "Filtering: " + " AND ".join(interpretation_parts) if interpretation_parts else "Showing all records"

        # Convert to dict for JSON serialization
        result_data = df.head(100).to_dict(orient="records")

        return QueryResult(
            success=True,
            result_type="table",
            data=result_data,
            message=f"Found {len(df)} matching records" + (f" (showing first 100)" if len(df) > 100 else ""),
            query_interpretation=interpretation,
            row_count=len(df),
        )

    async def _execute_aggregate(
        self, entities: ExtractedEntities, query: str
    ) -> QueryResult:
        """Execute an aggregate query - returns computed statistics."""
        df = self.df.copy()

        # Determine which field to aggregate
        target_field = "Absenteeism time in hours"  # Default
        if entities.fields:
            target_field = entities.fields[0]

        # Determine aggregation function
        agg_func = "mean"  # Default
        if entities.aggregations:
            agg_func = entities.aggregations[0]

        # Apply any conditions first
        for condition in entities.conditions:
            field = condition["field"]
            op = condition["operator"]
            value = condition["value"]

            if field not in df.columns:
                continue

            if op == "greater_than":
                df = df[df[field] > value]
            elif op == "less_than":
                df = df[df[field] < value]
            elif op == "equals":
                df = df[df[field] == value]

        # Calculate aggregation
        if agg_func == "count":
            result_value = len(df)
            result_label = "Count"
        elif agg_func == "mean":
            result_value = df[target_field].mean()
            result_label = f"Average {target_field}"
        elif agg_func == "sum":
            result_value = df[target_field].sum()
            result_label = f"Total {target_field}"
        elif agg_func == "max":
            result_value = df[target_field].max()
            result_label = f"Maximum {target_field}"
        elif agg_func == "min":
            result_value = df[target_field].min()
            result_label = f"Minimum {target_field}"
        elif agg_func == "median":
            result_value = df[target_field].median()
            result_label = f"Median {target_field}"
        else:
            result_value = df[target_field].mean()
            result_label = f"Average {target_field}"

        # Handle group by
        if entities.groups:
            group_col = entities.groups[0]
            if group_col in df.columns:
                grouped = df.groupby(group_col)[target_field].agg(agg_func)
                result_data = {
                    "type": "grouped",
                    "label": result_label,
                    "groups": grouped.to_dict(),
                }
                return QueryResult(
                    success=True,
                    result_type="chart_data",
                    data=result_data,
                    message=f"{result_label} by {group_col}",
                    query_interpretation=f"Calculating {agg_func} of {target_field} grouped by {group_col}",
                    row_count=len(grouped),
                )

        # Single value result
        result_data = {
            "type": "single",
            "label": result_label,
            "value": round(float(result_value), 2) if isinstance(result_value, (float, np.floating)) else int(result_value),
            "sample_size": len(df),
        }

        return QueryResult(
            success=True,
            result_type="metric",
            data=result_data,
            message=f"{result_label}: {result_data['value']}",
            query_interpretation=f"Calculating {agg_func} of {target_field}",
            row_count=1,
        )

    async def _execute_compare(
        self, entities: ExtractedEntities, query: str
    ) -> QueryResult:
        """Execute a comparison query - returns grouped comparison data."""
        df = self.df.copy()

        # Determine comparison field (what to group by)
        group_col = entities.groups[0] if entities.groups else None

        # Common comparison patterns
        if not group_col:
            # Try to infer from query
            if "smoker" in query.lower():
                group_col = "Social smoker"
            elif "drinker" in query.lower():
                group_col = "Social drinker"
            elif "education" in query.lower():
                group_col = "Education"
            elif "age" in query.lower():
                group_col = "Age"
            else:
                group_col = "Education"  # Default

        # Target field for comparison
        target_field = "Absenteeism time in hours"

        # Calculate comparison
        comparison = df.groupby(group_col)[target_field].agg(["mean", "count", "std"])
        comparison = comparison.round(2)

        result_data = {
            "type": "comparison",
            "group_by": group_col,
            "target": target_field,
            "data": comparison.to_dict(orient="index"),
        }

        return QueryResult(
            success=True,
            result_type="chart_data",
            data=result_data,
            message=f"Comparison of {target_field} by {group_col}",
            query_interpretation=f"Comparing {target_field} across different {group_col} groups",
            row_count=len(comparison),
        )

    async def _execute_trend(
        self, entities: ExtractedEntities, query: str
    ) -> QueryResult:
        """Execute a trend query - returns time-series data."""
        df = self.df.copy()

        # Default to monthly trend
        time_col = "Month of absence"
        target_field = "Absenteeism time in hours"

        # Calculate trend
        trend = df.groupby(time_col)[target_field].agg(["mean", "count", "sum"])
        trend = trend.round(2)

        # Month labels
        month_names = {
            1: "January", 2: "February", 3: "March", 4: "April",
            5: "May", 6: "June", 7: "July", 8: "August",
            9: "September", 10: "October", 11: "November", 12: "December",
            0: "Unknown"
        }

        result_data = {
            "type": "trend",
            "time_column": time_col,
            "target": target_field,
            "data": [
                {
                    "period": month_names.get(int(idx), str(idx)),
                    "period_num": int(idx),
                    "mean": row["mean"],
                    "count": int(row["count"]),
                    "total": row["sum"],
                }
                for idx, row in trend.iterrows()
            ],
        }

        return QueryResult(
            success=True,
            result_type="chart_data",
            data=result_data,
            message=f"Trend of {target_field} over months",
            query_interpretation=f"Analyzing {target_field} trend by month",
            row_count=len(trend),
        )

    async def _execute_predict(
        self, entities: ExtractedEntities, query: str
    ) -> QueryResult:
        """Handle prediction request - redirects to prediction endpoint."""
        return QueryResult(
            success=True,
            result_type="text",
            data={"redirect": "/predictions"},
            message="For predictions, please use the Predictions page where you can input employee details and get AI-powered predictions with explanations.",
            query_interpretation="Prediction request detected",
        )

    async def _execute_general(
        self, entities: ExtractedEntities, query: str
    ) -> QueryResult:
        """Execute general query using LLM."""
        # Gather some context data
        df = self.df
        context = f"""
Dataset Overview:
- Total records: {len(df)}
- Average absence: {df['Absenteeism time in hours'].mean():.2f} hours
- Max absence: {df['Absenteeism time in hours'].max()} hours
- Unique employees: {df['ID'].nunique()}

Top absence reasons (by frequency):
{df['Reason for absence'].value_counts().head(5).to_string()}

Age distribution:
- Mean: {df['Age'].mean():.1f} years
- Range: {df['Age'].min()} to {df['Age'].max()} years
"""

        try:
            # Try to use LLM
            client = get_ollama_client()
            if await client.is_available():
                prompt = build_nlp_query_prompt(query, context)
                response = await client.generate(prompt, temperature=0.3, max_tokens=200)

                return QueryResult(
                    success=True,
                    result_type="text",
                    data={"response": response},
                    message=response,
                    query_interpretation="General question answered by AI",
                )
        except Exception:
            pass

        # Fallback response
        return QueryResult(
            success=True,
            result_type="text",
            data={"response": context},
            message=f"Here's an overview of the dataset that might help answer your question:\n\n{context}",
            query_interpretation="Providing dataset overview (LLM unavailable)",
        )


# Singleton instance
_executor: QueryExecutor | None = None


def get_query_executor() -> QueryExecutor:
    """Get or create the query executor singleton."""
    global _executor
    if _executor is None:
        _executor = QueryExecutor()
    return _executor
