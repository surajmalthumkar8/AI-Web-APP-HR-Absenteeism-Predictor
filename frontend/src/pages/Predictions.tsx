/**
 * Predictions Page.
 *
 * Interactive form for making absenteeism predictions with
 * AI-generated explanations and SHAP-based feature importance.
 */

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Brain,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import Header from '../components/layout/Header';
import { predictSingle, getAbsenceReasons } from '../api';
import type { PredictionInput, PredictionResult, RiskLevel } from '../types';

// Form validation schema
const predictionSchema = z.object({
  reason_for_absence: z.number().min(0).max(28),
  month_of_absence: z.number().min(1).max(12),
  day_of_week: z.number().min(2).max(6),
  seasons: z.number().min(1).max(4),
  transportation_expense: z.number().min(0),
  distance_from_residence: z.number().min(0),
  service_time: z.number().min(0),
  age: z.number().min(18).max(70),
  workload_average: z.number().min(0),
  hit_target: z.number().min(0).max(100),
  disciplinary_failure: z.number().min(0).max(1),
  education: z.number().min(1).max(4),
  son: z.number().min(0),
  social_drinker: z.number().min(0).max(1),
  social_smoker: z.number().min(0).max(1),
  pet: z.number().min(0),
  weight: z.number().min(0),
  height: z.number().min(0),
  bmi: z.number().min(0),
});

// Risk level badge component
function RiskBadge({ level }: { level: RiskLevel }) {
  const styles = {
    low: 'badge-low',
    medium: 'badge-medium',
    high: 'badge-high',
    critical: 'badge-critical',
  };

  return (
    <span className={styles[level]}>
      {level.toUpperCase()}
    </span>
  );
}

// Form field component
interface FormFieldProps {
  label: string;
  name: string;
  type?: 'number' | 'select';
  options?: { value: number; label: string }[];
  register: ReturnType<typeof useForm>['register'];
  error?: string;
  helpText?: string;
}

function FormField({ label, name, type = 'number', options, register, error, helpText }: FormFieldProps) {
  return (
    <div>
      <label className="label">{label}</label>
      {type === 'select' ? (
        <select
          {...register(name, { valueAsNumber: true })}
          className="input"
        >
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="number"
          step="any"
          {...register(name, { valueAsNumber: true })}
          className="input"
        />
      )}
      {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export default function Predictions() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);

  // Fetch absence reasons for dropdown
  const { data: reasons } = useQuery({
    queryKey: ['absence-reasons'],
    queryFn: getAbsenceReasons,
  });

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PredictionInput>({
    resolver: zodResolver(predictionSchema),
    defaultValues: {
      reason_for_absence: 23,
      month_of_absence: 7,
      day_of_week: 3,
      seasons: 1,
      transportation_expense: 250,
      distance_from_residence: 30,
      service_time: 10,
      age: 35,
      workload_average: 250,
      hit_target: 95,
      disciplinary_failure: 0,
      education: 2,
      son: 1,
      social_drinker: 1,
      social_smoker: 0,
      pet: 0,
      weight: 75,
      height: 170,
      bmi: 26,
    },
  });

  // Prediction mutation
  const mutation = useMutation({
    mutationFn: predictSingle,
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const onSubmit = (data: PredictionInput) => {
    mutation.mutate(data);
  };

  // Prepare feature importance data for chart
  const featureChartData = result?.top_factors.map((f) => ({
    name: f.feature.length > 15 ? f.feature.slice(0, 15) + '...' : f.feature,
    value: f.contribution,
    fullName: f.feature,
    description: f.description,
  })) || [];

  return (
    <div>
      <Header
        title="Predictions"
        subtitle="Get AI-powered absenteeism predictions with explainable insights"
      />

      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Prediction Form */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Brain size={20} className="text-primary-600" />
              Employee Details
            </h3>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Fields */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Absence Reason"
                  name="reason_for_absence"
                  type="select"
                  options={reasons?.map((r) => ({
                    value: r.code,
                    label: `${r.code}: ${r.description}`,
                  })) || []}
                  register={register}
                  error={errors.reason_for_absence?.message}
                />
                <FormField
                  label="Age"
                  name="age"
                  register={register}
                  error={errors.age?.message}
                  helpText="18-70 years"
                />
                <FormField
                  label="Service Time (years)"
                  name="service_time"
                  register={register}
                  error={errors.service_time?.message}
                />
                <FormField
                  label="Education Level"
                  name="education"
                  type="select"
                  options={[
                    { value: 1, label: '1: High School' },
                    { value: 2, label: '2: Graduate' },
                    { value: 3, label: '3: Postgraduate' },
                    { value: 4, label: '4: Master/Doctor' },
                  ]}
                  register={register}
                  error={errors.education?.message}
                />
                <FormField
                  label="Month"
                  name="month_of_absence"
                  type="select"
                  options={[
                    { value: 1, label: 'January' },
                    { value: 2, label: 'February' },
                    { value: 3, label: 'March' },
                    { value: 4, label: 'April' },
                    { value: 5, label: 'May' },
                    { value: 6, label: 'June' },
                    { value: 7, label: 'July' },
                    { value: 8, label: 'August' },
                    { value: 9, label: 'September' },
                    { value: 10, label: 'October' },
                    { value: 11, label: 'November' },
                    { value: 12, label: 'December' },
                  ]}
                  register={register}
                  error={errors.month_of_absence?.message}
                />
                <FormField
                  label="Day of Week"
                  name="day_of_week"
                  type="select"
                  options={[
                    { value: 2, label: 'Monday' },
                    { value: 3, label: 'Tuesday' },
                    { value: 4, label: 'Wednesday' },
                    { value: 5, label: 'Thursday' },
                    { value: 6, label: 'Friday' },
                  ]}
                  register={register}
                  error={errors.day_of_week?.message}
                />
              </div>

              {/* Advanced Fields Toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showAdvanced ? 'Hide' : 'Show'} Advanced Fields
              </button>

              {/* Advanced Fields */}
              {showAdvanced && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <FormField
                    label="BMI"
                    name="bmi"
                    register={register}
                    error={errors.bmi?.message}
                  />
                  <FormField
                    label="Weight (kg)"
                    name="weight"
                    register={register}
                    error={errors.weight?.message}
                  />
                  <FormField
                    label="Height (cm)"
                    name="height"
                    register={register}
                    error={errors.height?.message}
                  />
                  <FormField
                    label="Season"
                    name="seasons"
                    type="select"
                    options={[
                      { value: 1, label: 'Summer' },
                      { value: 2, label: 'Autumn' },
                      { value: 3, label: 'Winter' },
                      { value: 4, label: 'Spring' },
                    ]}
                    register={register}
                    error={errors.seasons?.message}
                  />
                  <FormField
                    label="Transportation Expense ($)"
                    name="transportation_expense"
                    register={register}
                    error={errors.transportation_expense?.message}
                  />
                  <FormField
                    label="Distance to Work (km)"
                    name="distance_from_residence"
                    register={register}
                    error={errors.distance_from_residence?.message}
                  />
                  <FormField
                    label="Workload Average"
                    name="workload_average"
                    register={register}
                    error={errors.workload_average?.message}
                  />
                  <FormField
                    label="Hit Target (%)"
                    name="hit_target"
                    register={register}
                    error={errors.hit_target?.message}
                  />
                  <FormField
                    label="Disciplinary Failure"
                    name="disciplinary_failure"
                    type="select"
                    options={[
                      { value: 0, label: 'No' },
                      { value: 1, label: 'Yes' },
                    ]}
                    register={register}
                    error={errors.disciplinary_failure?.message}
                  />
                  <FormField
                    label="Children"
                    name="son"
                    register={register}
                    error={errors.son?.message}
                  />
                  <FormField
                    label="Social Drinker"
                    name="social_drinker"
                    type="select"
                    options={[
                      { value: 0, label: 'No' },
                      { value: 1, label: 'Yes' },
                    ]}
                    register={register}
                    error={errors.social_drinker?.message}
                  />
                  <FormField
                    label="Social Smoker"
                    name="social_smoker"
                    type="select"
                    options={[
                      { value: 0, label: 'No' },
                      { value: 1, label: 'Yes' },
                    ]}
                    register={register}
                    error={errors.social_smoker?.message}
                  />
                  <FormField
                    label="Pets"
                    name="pet"
                    register={register}
                    error={errors.pet?.message}
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={mutation.isPending}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain size={20} />
                    Generate Prediction
                  </>
                )}
              </button>

              {mutation.isError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle size={16} />
                  Failed to generate prediction. Please try again.
                </div>
              )}
            </form>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {result ? (
              <>
                {/* Prediction Result Card */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Prediction Result
                    </h3>
                    <RiskBadge level={result.risk_level} />
                  </div>

                  <div className="text-center py-6">
                    <p className="text-5xl font-bold text-gray-900">
                      {result.predicted_hours}
                    </p>
                    <p className="text-gray-500 mt-2">Predicted Absence Hours</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Confidence: {result.confidence_interval[0]} - {result.confidence_interval[1]} hours
                    </p>
                  </div>
                </div>

                {/* AI Explanation Card */}
                <div className="card">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle size={20} className="text-green-500" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      AI Explanation
                    </h3>
                    <span className="text-xs text-gray-400">
                      ({result.explanation_source === 'llm' ? 'LLM Generated' : 'Template'})
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    {result.explanation}
                  </p>
                </div>

                {/* Feature Importance Chart */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Key Contributing Factors
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={featureChartData}
                        layout="vertical"
                        margin={{ left: 20, right: 20 }}
                      >
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 11 }}
                          width={100}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-3 border rounded-lg shadow-lg">
                                  <p className="font-medium">{data.fullName}</p>
                                  <p className="text-sm text-gray-600">{data.description}</p>
                                  <p className="text-sm font-medium mt-1">
                                    Impact: {data.value > 0 ? '+' : ''}{data.value.toFixed(2)} hours
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine x={0} stroke="#9ca3af" />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {featureChartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.value > 0 ? '#ef4444' : '#10b981'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <Info size={12} />
                    Red bars increase absence, green bars decrease it
                  </p>
                </div>
              </>
            ) : (
              <div className="card flex flex-col items-center justify-center h-96 text-center">
                <Brain size={48} className="text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">
                  No Prediction Yet
                </h3>
                <p className="text-gray-500 mt-2 max-w-sm">
                  Fill in the employee details and click "Generate Prediction" to get
                  AI-powered absence predictions with explanations.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
