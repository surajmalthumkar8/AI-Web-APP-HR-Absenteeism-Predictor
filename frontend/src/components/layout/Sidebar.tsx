/**
 * Sidebar Navigation Component.
 *
 * Modern, engaging navigation panel for HR Analytics dashboard.
 */

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Brain,
  Users,
  BarChart3,
  MessageSquare,
  Settings,
  Sparkles,
  TrendingUp,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  badgeColor?: string;
}

const mainNavItems: NavItem[] = [
  { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { to: '/predictions', icon: <Brain size={20} />, label: 'AI Predictions', badge: 'ML', badgeColor: 'bg-violet-500' },
  { to: '/employees', icon: <Users size={20} />, label: 'Employees' },
  { to: '/analytics', icon: <BarChart3 size={20} />, label: 'Analytics' },
  { to: '/query', icon: <MessageSquare size={20} />, label: 'Ask AI', badge: 'NEW', badgeColor: 'bg-emerald-500' },
];

const secondaryNavItems: NavItem[] = [
  { to: '/settings', icon: <Settings size={18} />, label: 'Settings' },
  { to: '/help', icon: <HelpCircle size={18} />, label: 'Help & Support' },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white flex flex-col overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-24 w-48 h-48 bg-cyan-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-12 w-48 h-48 bg-emerald-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* Logo/Brand */}
      <div className="relative p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Sparkles size={22} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
              <Zap size={8} className="text-white" />
            </div>
          </div>
          <div>
            <h1 className="font-bold text-lg bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              HR Analytics
            </h1>
            <p className="text-[11px] text-slate-500 font-medium tracking-wide">AI DECISION SUPPORT</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="relative flex-1 p-4 overflow-y-auto">
        <div className="mb-6">
          <p className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Main Menu</p>
          <ul className="space-y-1">
            {mainNavItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={clsx(
                        'p-2 rounded-lg transition-all duration-200',
                        isActive
                          ? 'bg-white/20'
                          : 'bg-slate-800/50 group-hover:bg-slate-700/50'
                      )}>
                        {item.icon}
                      </span>
                      <span className="font-medium flex-1">{item.label}</span>
                      {item.badge && (
                        <span className={clsx(
                          'px-2 py-0.5 text-[10px] font-bold rounded-full',
                          item.badgeColor || 'bg-slate-700',
                          'text-white'
                        )}>
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight
                        size={16}
                        className={clsx(
                          'transition-all duration-200',
                          isActive ? 'opacity-100' : 'opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0'
                        )}
                      />
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick Stats Card */}
        <div className="mb-6 p-4 bg-gradient-to-br from-slate-800/50 to-slate-800/30 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-emerald-400" />
            <span className="text-xs font-semibold text-slate-300">Quick Stats</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Model Accuracy</span>
                <span className="text-emerald-400 font-semibold">94.2%</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full w-[94%] bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Data Quality</span>
                <span className="text-cyan-400 font-semibold">98.5%</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full w-[98%] bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Navigation */}
        <div>
          <p className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Support</p>
          <ul className="space-y-1">
            {secondaryNavItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm',
                      isActive
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
                    )
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* User Profile / Footer */}
      <div className="relative p-4 border-t border-white/5">
        {/* AI Status */}
        <div className="mb-3 px-3 py-2 bg-slate-800/50 rounded-lg flex items-center gap-2">
          <div className="relative">
            <Shield size={16} className="text-violet-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-300">LLM Status</p>
            <p className="text-[10px] text-emerald-400">Online & Ready</p>
          </div>
        </div>

        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800/50 transition-colors cursor-pointer group">
          <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-orange-500/20">
            HR
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">HR Manager</p>
            <p className="text-[11px] text-slate-500">Admin Access</p>
          </div>
          <LogOut size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
        </div>

        {/* Version */}
        <div className="mt-3 px-3 flex items-center justify-between text-[10px] text-slate-600">
          <span>Powered by XGBoost + LLM</span>
          <span className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-500">v1.0</span>
        </div>
      </div>
    </aside>
  );
}
