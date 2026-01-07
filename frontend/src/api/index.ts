/**
 * API Client for HR Absenteeism Predictor.
 *
 * Centralized HTTP client using Axios with:
 * - Base URL configuration
 * - Error handling
 * - Request/response interceptors
 * - Type-safe API methods
 */

import axios from 'axios';
import type {
  Employee,
  EmployeeListResponse,
  PredictionInput,
  PredictionResult,
  DashboardSummary,
  TrendPoint,
  FeatureImportance,
  NLPQueryResponse,
  AbsenceReason,
  DistributionBucket,
} from '../types';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds for LLM requests
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log errors in development
    if (import.meta.env.DEV) {
      console.error('API Error:', error.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// Health & Status
// ============================================================================

export const getHealth = async () => {
  const response = await api.get<{
    status: string;
    model_loaded: boolean;
    version: string;
  }>('/health');
  return response.data;
};

// ============================================================================
// Predictions
// ============================================================================

export const predictSingle = async (input: PredictionInput): Promise<PredictionResult> => {
  const response = await api.post<PredictionResult>('/predictions/single', input);
  return response.data;
};

export const predictBatch = async (employees: PredictionInput[]) => {
  const response = await api.post<{
    predictions: PredictionResult[];
    summary: {
      total_employees: number;
      average_predicted_hours: number;
      max_predicted_hours: number;
      risk_distribution: Record<string, number>;
    };
  }>('/predictions/batch', { employees });
  return response.data;
};

export const getModelInfo = async () => {
  const response = await api.get<{
    metrics: {
      training: { mae: number; rmse: number; r2: number };
      test: { mae: number; rmse: number; r2: number };
    };
    feature_importance: Record<string, number>;
    feature_count: number;
    risk_thresholds: Record<string, number>;
  }>('/predictions/model-info');
  return response.data;
};

// ============================================================================
// Employees
// ============================================================================

export interface EmployeeFilters {
  page?: number;
  page_size?: number;
  min_age?: number;
  max_age?: number;
  min_absence?: number;
  max_absence?: number;
  reason?: number;
  education?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export const getEmployees = async (filters: EmployeeFilters = {}): Promise<EmployeeListResponse> => {
  const response = await api.get<EmployeeListResponse>('/employees', { params: filters });
  return response.data;
};

export const getAtRiskEmployees = async (threshold = 10, page = 1, pageSize = 20) => {
  const response = await api.get<EmployeeListResponse>('/employees/at-risk', {
    params: { threshold, page, page_size: pageSize },
  });
  return response.data;
};

export const getEmployeeRecords = async (employeeId: number) => {
  const response = await api.get<{
    summary: {
      employee_id: number;
      total_records: number;
      total_absence_hours: number;
      average_absence_hours: number;
      age: number;
      service_time: number;
    };
    records: Employee[];
  }>(`/employees/${employeeId}`);
  return response.data;
};

export const getAbsenceReasons = async (): Promise<AbsenceReason[]> => {
  const response = await api.get<{ reasons: AbsenceReason[] }>('/employees/reasons/list');
  return response.data.reasons;
};

// ============================================================================
// Analytics
// ============================================================================

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const response = await api.get<DashboardSummary>('/analytics/summary');
  return response.data;
};

export const getMonthlyTrends = async (): Promise<TrendPoint[]> => {
  const response = await api.get<{ metric: string; data: TrendPoint[] }>('/analytics/trends/monthly');
  return response.data.data;
};

export const getWeekdayTrends = async (): Promise<TrendPoint[]> => {
  const response = await api.get<{ metric: string; data: TrendPoint[] }>('/analytics/trends/weekday');
  return response.data.data;
};

export const getAbsenceDistribution = async () => {
  const response = await api.get<{
    field: string;
    buckets: DistributionBucket[];
    stats: { mean: number; median: number; std: number; min: number; max: number };
  }>('/analytics/distribution/absence');
  return response.data;
};

export const getStatsByReason = async () => {
  const response = await api.get<{
    by_reason: Array<{
      reason_code: number;
      reason_description: string;
      average_hours: number;
      total_hours: number;
      record_count: number;
      unique_employees: number;
    }>;
  }>('/analytics/by-reason');
  return response.data.by_reason;
};

export const getStatsByEducation = async () => {
  const response = await api.get<{
    by_education: Array<{
      education_level: number;
      education_label: string;
      average_hours: number;
      total_hours: number;
      record_count: number;
      unique_employees: number;
    }>;
  }>('/analytics/by-education');
  return response.data.by_education;
};

export const getFeatureImportance = async (): Promise<FeatureImportance[]> => {
  const response = await api.get<{
    feature_importance: FeatureImportance[];
    total_features: number;
  }>('/analytics/feature-importance');
  return response.data.feature_importance;
};

export const getCorrelations = async () => {
  const response = await api.get<{
    columns: string[];
    correlations: Array<{ x: string; y: string; value: number }>;
  }>('/analytics/correlations');
  return response.data;
};

// ============================================================================
// NLP Query
// ============================================================================

export const processNLPQuery = async (query: string): Promise<NLPQueryResponse> => {
  const response = await api.post<NLPQueryResponse>('/nlp/query', { query });
  return response.data;
};

export const getQuerySuggestions = async (): Promise<string[]> => {
  const response = await api.get<{ suggestions: string[] }>('/nlp/suggestions');
  return response.data.suggestions;
};

export const getLLMStatus = async () => {
  const response = await api.get<{
    available: boolean;
    models: string[];
    configured_model: string;
    model_ready: boolean;
  }>('/nlp/llm-status');
  return response.data;
};

export const getQueryExamples = async () => {
  const response = await api.get<{
    examples: Array<{
      query: string;
      description: string;
      expected_result_type: string;
    }>;
  }>('/nlp/examples');
  return response.data.examples;
};

export default api;
