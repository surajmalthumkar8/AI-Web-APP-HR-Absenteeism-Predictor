/**
 * Dashboard Page.
 *
 * Executive overview with KPIs, trends, and at-risk employees.
 * Modern, engaging design for HR managers.
 */

import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Activity,
  Target,
  Sparkles,
  ChevronRight,
  BarChart3,
  Brain,
  MessageSquare,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import Header from '../components/layout/Header';
import { getDashboardSummary, getMonthlyTrends, getStatsByReason, getWeekdayTrends } from '../api';

// Animated stat card with gradient
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  gradient: string;
  iconBg: string;
  delay?: number;
}

function StatCard({ title, value, icon, trend, gradient, iconBg }: StatCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${gradient}`}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8">
        <div className={`w-full h-full rounded-full ${iconBg} opacity-20`}></div>
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className={`p-3 rounded-xl ${iconBg} bg-opacity-30 backdrop-blur-sm`}>
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${trend.isPositive ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'}`}>
              {trend.isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {trend.value}%
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
}

// Progress ring component
function ProgressRing({ percentage, color, size = 120 }: { percentage: number; color: string; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-gray-200"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-gray-700">{percentage}%</span>
      </div>
    </div>
  );
}

// Quick action card
function ActionCard({ href, icon, title, description, color, hoverColor }: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  hoverColor: string;
}) {
  return (
    <a
      href={href}
      className={`group relative overflow-hidden rounded-xl p-6 bg-white border-2 border-transparent hover:border-${hoverColor}-200 shadow-sm hover:shadow-lg transition-all duration-300`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
      <div className="relative z-10 flex items-center gap-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 group-hover:text-gray-700">{title}</h4>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <ChevronRight className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" size={20} />
      </div>
    </a>
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

  const { data: weekdayTrends } = useQuery({
    queryKey: ['weekday-trends'],
    queryFn: getWeekdayTrends,
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
    fullName: r.reason_description,
  })) || [];

  const CHART_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  // Calculate health score (inverse of at-risk percentage)
  const healthScore = summary ? Math.round(100 - (summary.at_risk_percentage || 0)) : 0;

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <Header
        title="Dashboard"
        subtitle="HR Analytics & Workforce Insights"
      />

      <div className="p-6 lg:p-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-2xl p-6 lg:p-8 text-white shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-purple-200 text-sm mb-2">
                  <Calendar size={16} />
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <h2 className="text-2xl lg:text-3xl font-bold">{getGreeting()}, HR Manager!</h2>
                <p className="text-purple-200 mt-2">Here's your workforce overview for today</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-4xl font-bold">{summary?.unique_employees || 0}</div>
                  <div className="text-purple-200 text-sm">Active Employees</div>
                </div>
                <div className="h-12 w-px bg-purple-400/30"></div>
                <div className="text-center">
                  <div className="text-4xl font-bold">{summary?.total_records?.toLocaleString() || 0}</div>
                  <div className="text-purple-200 text-sm">Total Records</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Absence Hours"
            value={summaryLoading ? '...' : summary?.total_absence_hours?.toLocaleString() || '0'}
            icon={<Clock className="text-white" size={24} />}
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
            iconBg="bg-blue-400"
          />
          <StatCard
            title="Average Absence"
            value={summaryLoading ? '...' : `${summary?.average_absence_hours?.toFixed(1) || '0'}h`}
            icon={<Activity className="text-white" size={24} />}
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            iconBg="bg-emerald-400"
          />
          <StatCard
            title="Max Absence"
            value={summaryLoading ? '...' : `${summary?.max_absence_hours || '0'}h`}
            icon={<AlertTriangle className="text-white" size={24} />}
            gradient="bg-gradient-to-br from-amber-500 to-orange-600"
            iconBg="bg-amber-400"
          />
          <StatCard
            title="At-Risk Employees"
            value={summaryLoading ? '...' : summary?.at_risk_count || 0}
            icon={<Users className="text-white" size={24} />}
            trend={{ value: summary?.at_risk_percentage || 0, isPositive: false }}
            gradient="bg-gradient-to-br from-rose-500 to-pink-600"
            iconBg="bg-rose-400"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Monthly Trend Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Monthly Absence Trends</h3>
                <p className="text-sm text-gray-500">Average hours by month</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-xs text-blue-600 font-medium">Avg Hours</span>
              </div>
            </div>
            <div className="h-72">
              {trendsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-pulse text-gray-400">Loading chart...</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      tickFormatter={(value) => value?.slice(0, 3) || ''}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      fill="url(#colorValue)"
                      name="Avg Hours"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Workforce Health Score */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Workforce Health</h3>
            <p className="text-sm text-gray-500 mb-6">Overall attendance score</p>
            <div className="flex flex-col items-center">
              <ProgressRing
                percentage={healthScore}
                color={healthScore >= 80 ? 'text-emerald-500' : healthScore >= 60 ? 'text-amber-500' : 'text-rose-500'}
                size={140}
              />
              <div className="mt-4 text-center">
                <p className={`text-sm font-semibold ${healthScore >= 80 ? 'text-emerald-600' : healthScore >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : 'Needs Attention'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Based on at-risk rate</p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Healthy</span>
                <span className="font-semibold text-emerald-600">{summary ? summary.unique_employees - summary.at_risk_count : 0}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-500">At Risk</span>
                <span className="font-semibold text-rose-600">{summary?.at_risk_count || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Second Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Absence Reasons - Donut */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Top Absence Reasons</h3>
                <p className="text-sm text-gray-500">Distribution by hours</p>
              </div>
              <Target className="text-gray-400" size={20} />
            </div>
            <div className="flex items-center gap-6">
              <div className="w-48 h-48">
                {reasonsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-pulse text-gray-400">Loading...</div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topReasons}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {topReasons.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => `${value.toFixed(0)} hours`}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex-1 space-y-3">
                {topReasons.map((reason, index) => (
                  <div key={reason.name} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CHART_COLORS[index] }}
                    />
                    <span className="text-sm text-gray-600 truncate flex-1" title={reason.fullName}>
                      {reason.name}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {reason.value.toFixed(0)}h
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Weekday Breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Absence by Weekday</h3>
                <p className="text-sm text-gray-500">Average hours per day</p>
              </div>
              <BarChart3 className="text-gray-400" size={20} />
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Bar dataKey="value" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Avg Hours" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Key Insights */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-yellow-400" size={20} />
            <h3 className="text-lg font-semibold">Key Insights</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-2xl font-bold text-cyan-400">{summary?.median_absence_hours || 0}h</div>
              <div className="text-slate-300 text-sm mt-1">Median Absence Duration</div>
              <div className="text-xs text-slate-400 mt-2">50% of absences are below this</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-2xl font-bold text-emerald-400">
                {summary ? ((summary.unique_employees - summary.at_risk_count) / summary.unique_employees * 100).toFixed(0) : 0}%
              </div>
              <div className="text-slate-300 text-sm mt-1">Healthy Attendance Rate</div>
              <div className="text-xs text-slate-400 mt-2">Employees with low absence</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-2xl font-bold text-amber-400">
                {summary ? (summary.total_absence_hours / summary.unique_employees).toFixed(1) : 0}h
              </div>
              <div className="text-slate-300 text-sm mt-1">Avg per Employee</div>
              <div className="text-xs text-slate-400 mt-2">Total hours / employees</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionCard
              href="/predictions"
              icon={<Brain size={24} />}
              title="AI Predictions"
              description="Get ML-powered absence forecasts"
              color="from-violet-500 to-purple-600"
              hoverColor="purple"
            />
            <ActionCard
              href="/employees"
              icon={<Users size={24} />}
              title="Employee Records"
              description="Browse and filter workforce data"
              color="from-emerald-500 to-teal-600"
              hoverColor="emerald"
            />
            <ActionCard
              href="/query"
              icon={<MessageSquare size={24} />}
              title="Ask AI Assistant"
              description="Query data in natural language"
              color="from-cyan-500 to-blue-600"
              hoverColor="cyan"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
