/**
 * Header Component.
 *
 * Top bar with page title and status indicators.
 */

import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
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
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Check LLM status
  const { data: llmStatus, isLoading: llmLoading } = useQuery({
    queryKey: ['llm-status'],
    queryFn: getLLMStatus,
    refetchInterval: 60000, // Refresh every minute
  });

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-6">
          {/* API Status */}
          <div className="flex items-center gap-2">
            {healthLoading ? (
              <Loader2 size={16} className="animate-spin text-gray-400" />
            ) : health?.model_loaded ? (
              <CheckCircle size={16} className="text-green-500" />
            ) : (
              <XCircle size={16} className="text-red-500" />
            )}
            <span className="text-sm text-gray-600">
              Model: {health?.model_loaded ? 'Ready' : 'Not Loaded'}
            </span>
          </div>

          {/* LLM Status */}
          <div className="flex items-center gap-2">
            {llmLoading ? (
              <Loader2 size={16} className="animate-spin text-gray-400" />
            ) : llmStatus?.model_ready ? (
              <CheckCircle size={16} className="text-green-500" />
            ) : (
              <XCircle size={16} className="text-yellow-500" />
            )}
            <span className="text-sm text-gray-600">
              LLM: {llmStatus?.model_ready ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
