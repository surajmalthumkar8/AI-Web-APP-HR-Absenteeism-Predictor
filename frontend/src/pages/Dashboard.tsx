/**
 * Dashboard Page.
 *
 * Executive overview with KPIs, trends, and at-risk employees.
 * This is the main landing page for HR managers.
 */

import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Clock,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import Header from '../components/layout/Header';
import { getDashboardSummary, getMonthlyTrends, getStatsByReason } from '../api';

// Stat card component
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color: string;
}

function StatCard({ title, value, icon, trend, color }: StatCardProps) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <div className="flex items-center mt-2 text-sm">
              {trend.isPositive ? (
                <ArrowUpRight size={16} className="text-green-500" />
              ) : (
                <ArrowDownRight size={16} className="text-red-500" />
              )}
              <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
                {trend.value}%
              </span>
              <span className="text-gray-500 ml-1">vs last period</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  // Fetch dashboard data
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['monthly-trends'],
    queryFn: getMonthlyTrends,
  });

  const { data: reasonStats, isLoading: reasonsLoading } = useQuery({
    queryKey: ['stats-by-reason'],
    queryFn: getStatsByReason,
  });

  // Top 5 absence reasons for pie chart
  const topReasons = reasonStats?.slice(0, 5).map((r) => ({
    name: r.reason_description.length > 20
      ? r.reason_description.slice(0, 20) + '...'
      : r.reason_description,
    value: r.total_hours,
  })) || [];

  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Overview of employee absenteeism patterns and predictions"
      />

      <div className="p-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Records"
            value={summaryLoading ? '...' : summary?.total_records.toLocaleString() || 0}
            icon={<Users className="text-white" size={24} />}
            color="bg-primary-500"
          />
          <StatCard
            title="Unique Employees"
            value={summaryLoading ? '...' : summary?.unique_employees || 0}
            icon={<Users className="text-white" size={24} />}
            color="bg-green-500"
          />
          <StatCard
            title="Avg Absence Hours"
            value={summaryLoading ? '...' : `${summary?.average_absence_hours.toFixed(1)}h`}
            icon={<Clock className="text-white" size={24} />}
            color="bg-yellow-500"
          />
          <StatCard
            title="At-Risk Employees"
            value={summaryLoading ? '...' : summary?.at_risk_count || 0}
            icon={<AlertTriangle className="text-white" size={24} />}
            trend={{ value: summary?.at_risk_percentage || 0, isPositive: false }}
            color="bg-red-500"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Trend Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Monthly Absence Trends
            </h3>
            <div className="h-64">
              {trendsLoading ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Loading...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                      name="Avg Hours"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top Absence Reasons */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top Absence Reasons
            </h3>
            <div className="h-64">
              {reasonsLoading ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Loading...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topReasons}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {topReasons.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `${value.toFixed(1)} hours`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {topReasons.map((reason, index) => (
                <div key={reason.name} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index] }}
                  />
                  <span className="text-gray-600">{reason.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Key Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500">Total Absence Hours</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.total_absence_hours.toLocaleString() || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Median Absence</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.median_absence_hours || 0}h
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Max Absence</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.max_absence_hours || 0}h
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">At-Risk Rate</p>
              <p className="text-2xl font-bold text-red-600">
                {summary?.at_risk_percentage || 0}%
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/predictions" className="card hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                <TrendingUp className="text-primary-600" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Make Prediction</h4>
                <p className="text-sm text-gray-500">Get AI-powered absence predictions</p>
              </div>
            </div>
          </a>
          <a href="/employees" className="card hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="text-green-600" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">View Employees</h4>
                <p className="text-sm text-gray-500">Browse employee records</p>
              </div>
            </div>
          </a>
          <a href="/query" className="card hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <AlertTriangle className="text-purple-600" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Ask AI</h4>
                <p className="text-sm text-gray-500">Query data in natural language</p>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
