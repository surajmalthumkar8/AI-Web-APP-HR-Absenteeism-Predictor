/**
 * NLP Query Page.
 *
 * Natural language interface for querying the absenteeism data.
 * Allows HR users to ask questions in plain English.
 */

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  Table,
  BarChart3,
  Hash,
  AlertCircle,
  User,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Header from '../components/layout/Header';
import { processNLPQuery, getQuerySuggestions } from '../api';
import type { NLPQueryResponse } from '../types';

// Result type icon component
function ResultTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'table':
      return <Table size={16} className="text-blue-500" />;
    case 'metric':
      return <Hash size={16} className="text-green-500" />;
    case 'chart_data':
      return <BarChart3 size={16} className="text-purple-500" />;
    default:
      return <MessageSquare size={16} className="text-gray-500" />;
  }
}

// Table result component - handles raw DataFrame data with various column names
interface RawRecord {
  id?: number;
  ID?: number;
  age?: number;
  Age?: number;
  service_time?: number;
  'Service time'?: number;
  reason_for_absence?: number;
  'Reason for absence'?: number;
  absenteeism_hours?: number;
  'Absenteeism time in hours'?: number;
}

function TableResult({ data }: { data: unknown[] }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p className="text-gray-500">No results found.</p>;
  }

  const records = data as RawRecord[];
  const displayRecords = records.slice(0, 10);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left p-3">ID</th>
            <th className="text-left p-3">Age</th>
            <th className="text-left p-3">Service</th>
            <th className="text-left p-3">Reason</th>
            <th className="text-right p-3">Absence Hours</th>
          </tr>
        </thead>
        <tbody>
          {displayRecords.map((record, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="p-3 flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                  <User size={12} className="text-gray-500" />
                </div>
                #{record.ID ?? record.id ?? '-'}
              </td>
              <td className="p-3">{record.Age ?? record.age ?? '-'}</td>
              <td className="p-3">{record['Service time'] ?? record.service_time ?? '-'} yrs</td>
              <td className="p-3 text-gray-600">
                {String(record['Reason for absence'] ?? record.reason_for_absence ?? '-')}
              </td>
              <td className="p-3 text-right font-semibold">
                {record['Absenteeism time in hours'] ?? record.absenteeism_hours ?? '-'}h
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {records.length > 10 && (
        <p className="text-sm text-gray-500 mt-2 text-center">
          Showing 10 of {records.length} results
        </p>
      )}
    </div>
  );
}

// Metric result component
function MetricResult({ data }: { data: { label: string; value: number; sample_size?: number } }) {
  return (
    <div className="text-center py-6">
      <p className="text-4xl font-bold text-gray-900">{data.value}</p>
      <p className="text-gray-500 mt-2">{data.label}</p>
      {data.sample_size && (
        <p className="text-sm text-gray-400 mt-1">Based on {data.sample_size} records</p>
      )}
    </div>
  );
}

// Chart result component
interface ChartDataInput {
  type: string;
  data?: unknown[];
  groups?: Record<string, number>;
}

interface TrendDataPoint {
  period: string;
  mean: number;
}

interface ComparisonData {
  type: string;
  data: Record<string, { mean: number }>;
}

function ChartResult({ data }: { data: ChartDataInput }) {
  let chartData: Array<{ name: string; value: number }> = [];

  if (data.type === 'grouped' && data.groups) {
    chartData = Object.entries(data.groups).map(([name, value]) => ({
      name: String(name),
      value: Number(value),
    }));
  } else if (data.type === 'trend' && Array.isArray(data.data)) {
    chartData = (data.data as TrendDataPoint[]).map((d) => ({
      name: d.period,
      value: d.mean,
    }));
  } else if (data.type === 'comparison') {
    const compData = data as unknown as ComparisonData;
    if (compData.data && typeof compData.data === 'object') {
      chartData = Object.entries(compData.data).map(([name, stats]) => ({
        name: String(name),
        value: stats.mean,
      }));
    }
  }

  if (chartData.length === 0) {
    return <p className="text-gray-500">Unable to visualize this data.</p>;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: number) => value.toFixed(2)} />
          <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function NLPQuery() {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<Array<{ query: string; response: NLPQueryResponse }>>([]);

  // Get suggestions
  const { data: suggestions } = useQuery({
    queryKey: ['query-suggestions'],
    queryFn: getQuerySuggestions,
  });

  // Query mutation
  const mutation = useMutation({
    mutationFn: processNLPQuery,
    onSuccess: (response) => {
      setHistory((prev) => [{ query, response }, ...prev]);
      setQuery('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      mutation.mutate(query.trim());
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
  };

  // Render result based on type
  const renderResult = (response: NLPQueryResponse) => {
    switch (response.result_type) {
      case 'table':
        return <TableResult data={response.data as unknown[]} />;
      case 'metric':
        return <MetricResult data={response.data as { label: string; value: number; sample_size?: number }} />;
      case 'chart_data':
        return <ChartResult data={response.data as ChartDataInput} />;
      case 'text':
        return (
          <p className="text-gray-700 leading-relaxed">
            {typeof response.data === 'object' && response.data !== null && 'response' in response.data
              ? String((response.data as { response: string }).response)
              : response.message}
          </p>
        );
      default:
        return <p className="text-gray-700">{response.message}</p>;
    }
  };

  return (
    <div>
      <Header
        title="Ask AI"
        subtitle="Query your absenteeism data using natural language"
      />

      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Query Input */}
          <div className="card mb-6">
            <form onSubmit={handleSubmit} className="flex gap-4">
              <div className="flex-1 relative">
                <MessageSquare
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question about your employees..."
                  className="input pl-12 pr-4"
                  disabled={mutation.isPending}
                />
              </div>
              <button
                type="submit"
                disabled={mutation.isPending || !query.trim()}
                className="btn-primary flex items-center gap-2"
              >
                {mutation.isPending ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Send size={20} />
                )}
                Ask
              </button>
            </form>

            {/* Suggestions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Sparkles size={14} />
                Try:
              </span>
              {(suggestions || []).slice(0, 4).map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Error State */}
          {mutation.isError && (
            <div className="card mb-6 bg-red-50 border-red-200">
              <div className="flex items-center gap-3 text-red-700">
                <AlertCircle size={20} />
                <p>Failed to process query. Please try again.</p>
              </div>
            </div>
          )}

          {/* Results History */}
          {history.length > 0 ? (
            <div className="space-y-6">
              {history.map((item, index) => (
                <div key={index} className="card">
                  {/* Query */}
                  <div className="flex items-start gap-3 mb-4 pb-4 border-b border-gray-200">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User size={16} className="text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.query}</p>
                    </div>
                  </div>

                  {/* Response */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Sparkles size={16} className="text-purple-600" />
                    </div>
                    <div className="flex-1">
                      {/* Metadata */}
                      <div className="flex items-center gap-3 mb-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <ResultTypeIcon type={item.response.result_type} />
                          {item.response.result_type}
                        </span>
                        <span>Intent: {item.response.intent}</span>
                        <span>Confidence: {(item.response.confidence * 100).toFixed(0)}%</span>
                      </div>

                      {/* Interpretation */}
                      <p className="text-sm text-gray-600 mb-4 italic">
                        {item.response.interpretation}
                      </p>

                      {/* Result Content */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        {renderResult(item.response)}
                      </div>

                      {/* Follow-up Suggestions */}
                      {item.response.suggestions.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="text-sm text-gray-500">Related:</span>
                          {item.response.suggestions.slice(0, 3).map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="card text-center py-16">
              <MessageSquare size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">
                Ask a Question
              </h3>
              <p className="text-gray-500 mt-2 max-w-md mx-auto">
                Use natural language to explore your employee absenteeism data.
                Try asking about trends, comparisons, or specific filters.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <span className="text-sm text-gray-500">Examples:</span>
                {[
                  'Show employees over 40',
                  "What's the average absence?",
                  'Compare smokers vs non-smokers',
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => handleSuggestionClick(example)}
                    className="text-sm px-3 py-1 bg-primary-50 hover:bg-primary-100 rounded-full text-primary-700 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
