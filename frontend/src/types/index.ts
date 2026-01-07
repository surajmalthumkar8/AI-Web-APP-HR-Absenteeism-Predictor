/**
 * TypeScript types for the HR Absenteeism Predictor application.
 *
 * Why centralized types:
 * - Single source of truth for data structures
 * - Enables type checking across components
 * - Documents API contracts
 * - IDE autocomplete support
 */

// Risk levels used throughout the application
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// Employee record from the API
export interface Employee {
  id: number;
  reason_for_absence: number;
  reason_description: string;
  month_of_absence: number;
  day_of_week: number;
  seasons: number;
  transportation_expense: number;
  distance_from_residence: number;
  service_time: number;
  age: number;
  workload_average: number;
  hit_target: number;
  disciplinary_failure: number;
  education: number;
  son: number;
  social_drinker: number;
  social_smoker: number;
  pet: number;
  weight: number;
  height: number;
  bmi: number;
  absenteeism_hours: number;
}

// Paginated employee list response
export interface EmployeeListResponse {
  employees: Employee[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Input for making predictions
export interface PredictionInput {
  reason_for_absence: number;
  month_of_absence: number;
  day_of_week: number;
  seasons: number;
  transportation_expense: number;
  distance_from_residence: number;
  service_time: number;
  age: number;
  workload_average: number;
  hit_target: number;
  disciplinary_failure: number;
  education: number;
  son: number;
  social_drinker: number;
  social_smoker: number;
  pet: number;
  weight: number;
  height: number;
  bmi: number;
}

// Factor contributing to a prediction
export interface FeatureFactor {
  feature: string;
  contribution: number;
  direction: string;
  description: string;
}

// Prediction response from API
export interface PredictionResult {
  predicted_hours: number;
  risk_level: RiskLevel;
  confidence_interval: [number, number];
  feature_contributions: Record<string, number>;
  top_factors: FeatureFactor[];
  explanation: string;
  explanation_source: 'llm' | 'fallback';
  timestamp: string;
}

// Dashboard summary stats
export interface DashboardSummary {
  total_records: number;
  unique_employees: number;
  total_absence_hours: number;
  average_absence_hours: number;
  median_absence_hours: number;
  max_absence_hours: number;
  at_risk_count: number;
  at_risk_percentage: number;
}

// Trend data point
export interface TrendPoint {
  period: string;
  period_num: number;
  value: number;
  count: number;
}

// Feature importance entry
export interface FeatureImportance {
  feature: string;
  importance: number;
}

// NLP query response
export interface NLPQueryResponse {
  success: boolean;
  intent: string;
  confidence: number;
  result_type: 'table' | 'metric' | 'chart_data' | 'text';
  data: unknown;
  message: string;
  interpretation: string;
  suggestions: string[];
}

// Absence reason
export interface AbsenceReason {
  code: number;
  description: string;
}

// Distribution bucket
export interface DistributionBucket {
  range_start: number;
  range_end: number;
  count: number;
  percentage: number;
}

// Stats by category (reason, education, etc.)
export interface CategoryStats {
  average_hours: number;
  total_hours: number;
  record_count: number;
  unique_employees: number;
}
