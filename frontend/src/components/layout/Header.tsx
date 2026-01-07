/**
 * Header Component.
 *
 * Modern top bar with page title, search, and status indicators.
 */

import { useQuery } from '@tanstack/react-query';
import {
  XCircle,
  Loader2,
  Search,
  Bell,
  Cpu,
  Wifi,
} from 'lucide-react';
import { getHealth, getLLMStatus } from '../../api';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  // Check API health
  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 30000,
  });

  // Check LLM status
  const { data: llmStatus, isLoading: llmLoading } = useQuery({
    queryKey: ['llm-status'],
    queryFn: getLLMStatus,
    refetchInterval: 60000,
  });

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors w-64">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-sm text-gray-600 placeholder-gray-400 w-full"
            />
            <kbd className="hidden lg:inline-flex items-center px-2 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 rounded">
              ⌘K
            </kbd>
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-2">
            {/* Model Status */}
            <div className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all
              ${healthLoading
                ? 'bg-gray-100 text-gray-500'
                : health?.model_loaded
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }
            `}>
              {healthLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : health?.model_loaded ? (
                <Cpu size={12} />
              ) : (
                <XCircle size={12} />
              )}
              <span className="hidden sm:inline">ML Model</span>
              {!healthLoading && (
                <span className={`w-1.5 h-1.5 rounded-full ${health?.model_loaded ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              )}
            </div>

            {/* LLM Status */}
            <div className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all
              ${llmLoading
                ? 'bg-gray-100 text-gray-500'
                : llmStatus?.model_ready
                  ? 'bg-violet-50 text-violet-700 border border-violet-100'
                  : 'bg-amber-50 text-amber-700 border border-amber-100'
              }
            `}>
              {llmLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : llmStatus?.model_ready ? (
                <Wifi size={12} />
              ) : (
                <XCircle size={12} />
              )}
              <span className="hidden sm:inline">LLM</span>
              {!llmLoading && (
                <span className={`w-1.5 h-1.5 rounded-full ${llmStatus?.model_ready ? 'bg-violet-500 animate-pulse' : 'bg-amber-500'}`}></span>
              )}
            </div>
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <Bell size={20} className="text-gray-500" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  );
}
