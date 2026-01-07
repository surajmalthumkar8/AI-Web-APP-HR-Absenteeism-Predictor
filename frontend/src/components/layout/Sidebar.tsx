/**
 * Sidebar Navigation Component.
 *
 * Provides main navigation for the enterprise dashboard.
 */

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Brain,
  Users,
  BarChart3,
  MessageSquare,
  Settings,
  Activity,
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { to: '/predictions', icon: <Brain size={20} />, label: 'Predictions' },
  { to: '/employees', icon: <Users size={20} />, label: 'Employees' },
  { to: '/analytics', icon: <BarChart3 size={20} />, label: 'Analytics' },
  { to: '/query', icon: <MessageSquare size={20} />, label: 'Ask AI' },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="font-semibold text-lg">HR Analytics</h1>
            <p className="text-xs text-gray-400">AI Decision Support</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  )
                }
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white cursor-pointer">
          <Settings size={20} />
          <span className="font-medium">Settings</span>
        </div>
        <div className="px-4 py-2 text-xs text-gray-500">
          <p>Powered by XGBoost + Ollama</p>
          <p className="mt-1">v1.0.0</p>
        </div>
      </div>
    </aside>
  );
}
