/**
 * Analytics Page.
 *
 * Deep-dive analytics with feature importance, distributions, and correlations.
 */

import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import Header from '../components/layout/Header';
import {
  getFeatureImportance,
  getAbsenceDistribution,
  getStatsByEducation,
  getWeekdayTrends,
} from '../api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Analytics() {
  // Fetch all analytics data
  const { data: featureImportance, isLoading: fiLoading } = useQuery({
    queryKey: ['feature-importance'],
    queryFn: getFeatureImportance,
  });

  const { data: distribution, isLoading: distLoading } = useQuery({
    queryKey: ['absence-distribution'],
    queryFn: getAbsenceDistribution,
  });

  const { data: educationStats, isLoading: eduLoading } = useQuery({
    queryKey: ['stats-by-education'],
    queryFn: getStatsByEducation,
  });

  const { data: weekdayTrends, isLoading: weekdayLoading } = useQuery({
    queryKey: ['weekday-trends'],
    queryFn: getWeekdayTrends,
  });

  // Prepare feature importance data (top 10)
  const fiData = featureImportance?.slice(0, 10).map((f) => ({
    name: f.feature.length > 20 ? f.feature.slice(0, 20) + '...' : f.feature,
    value: f.importance * 100, // Convert to percentage
    fullName: f.feature,
  })) || [];

  // Prepare distribution data
  const distData = distribution?.buckets.map((b) => ({
    range: `${b.range_start}-${b.range_end === 100 ? '40+' : b.range_end}`,
    count: b.count,
    percentage: b.percentage,
  })) || [];

  // Prepare education stats data
  const eduData = educationStats?.map((e) => ({
    name: e.education_label,
    avgHours: e.average_hours,
    count: e.record_count,
  })) || [];

  return (
    <div>
      <Header
        title="Analytics"
        subtitle="Deep-dive into absenteeism patterns and model insights"
      />

      <div className="p-8">
        {/* Feature Importance Section */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Feature Importance
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Which factors have the most impact on absenteeism predictions
          </p>
          <div className="h-80">
            {fiLoading ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                Loading...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fiData} layout="vertical" margin={{ left: 40, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded-lg shadow-lg">
                            <p className="font-medium">{data.fullName}</p>
                            <p className="text-sm text-gray-600">
                              Importance: {data.value.toFixed(2)}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Absence Distribution */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Absence Hours Distribution
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              How absence hours are distributed across the workforce
            </p>
            <div className="h-64">
              {distLoading ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Loading...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === 'count' ? value : `${value}%`,
                        name === 'count' ? 'Records' : 'Percentage',
                      ]}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            {distribution && (
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {distribution.stats.mean.toFixed(1)}h
                  </p>
                  <p className="text-sm text-gray-500">Mean</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {distribution.stats.median.toFixed(1)}h
                  </p>
                  <p className="text-sm text-gray-500">Median</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {distribution.stats.std.toFixed(1)}h
                  </p>
                  <p className="text-sm text-gray-500">Std Dev</p>
                </div>
              </div>
            )}
          </div>

          {/* By Education Level */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Absence by Education Level
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Average absence hours across education levels
            </p>
            <div className="h-64">
              {eduLoading ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Loading...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={eduData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="avgHours"
                      nameKey="name"
                      label={({ name, avgHours }) => `${name}: ${avgHours.toFixed(1)}h`}
                      labelLine={false}
                    >
                      {eduData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)} hours`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {eduData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-gray-600">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weekday Trends */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Absence by Day of Week
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Which days have the highest absence rates
          </p>
          <div className="h-64">
            {weekdayLoading ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                Loading...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weekdayTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(2)} hours`, 'Avg Absence']}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Model Performance Info */}
        <div className="card mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Model Information
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500">Algorithm</p>
              <p className="text-lg font-semibold text-gray-900">XGBoost</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Features</p>
              <p className="text-lg font-semibold text-gray-900">
                {featureImportance?.length || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Training Records</p>
              <p className="text-lg font-semibold text-gray-900">740</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Explainability</p>
              <p className="text-lg font-semibold text-gray-900">SHAP</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
