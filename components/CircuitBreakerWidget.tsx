/**
 * Circuit Breaker Status Widget
 * 
 * Admin dashboard component showing FPP circuit breaker state.
 * 
 * FEATURES:
 * - Real-time circuit state indicator
 * - Visual status (CLOSED/OPEN/HALF_OPEN)
 * - Statistics and health metrics
 * - Manual reset button (admin only)
 * - Auto-refresh every 5 seconds
 * 
 * SECURITY:
 * - Admin-only component
 * - Confirmation dialog for manual reset
 * - Read-only by default
 */

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { TIMING } from '@/lib/constants';

interface CircuitBreakerStats {
  circuit: {
    state: string;
    stateLabel: string;
    isFPPOnline: boolean;
    isFPPOffline: boolean;
    isTestingRecovery: boolean;
  };
  statistics: {
    currentFailureCount: number;
    currentSuccessCount: number;
    totalTransitions: number;
    timeSinceLastFailure: string;
    timeSinceStateChange: string;
    uptime: string;
    nextRetryIn: string | null;
    nextRetrySeconds: number | null;
  };
  health: {
    totalPolls: number;
    successfulPolls: number;
    failedPolls: number;
    uptimePercentage: number;
  };
  recommendations: string[];
}

export default function CircuitBreakerWidget() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<CircuitBreakerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch circuit breaker stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/circuit-breaker');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Failed to fetch circuit breaker stats');
      }
    } catch (error) {
      console.error('Error fetching circuit breaker stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manual reset circuit breaker
  const handleReset = async () => {
    if (!confirm('Are you sure you want to manually reset the circuit breaker?\n\nThis should only be done if FPP is back online but the circuit hasn\'t recovered automatically.')) {
      return;
    }

    setResetting(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/circuit-breaker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`✅ ${result.message}`);
        fetchStats(); // Refresh stats
      } else {
        setMessage(`❌ ${result.error || 'Reset failed'}`);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setResetting(false);
      setTimeout(() => setMessage(''), TIMING.MESSAGE_DISPLAY_DURATION);
    }
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchStats();
      const interval = setInterval(fetchStats, TIMING.POLL_INTERVAL_FAST);
      return () => clearInterval(interval);
    }
  }, [session]);

  // Only show to admins
  if (session?.user?.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Circuit Breaker Status</h3>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Determine status color and icon
  const getStatusColor = () => {
    if (stats.circuit.isFPPOnline) return 'bg-green-500';
    if (stats.circuit.isTestingRecovery) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusIcon = () => {
    if (stats.circuit.isFPPOnline) return '✅';
    if (stats.circuit.isTestingRecovery) return '🔄';
    return '🔴';
  };

  const statusColor = getStatusColor();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">FPP Circuit Breaker</h3>
        <div className={`${statusColor} w-3 h-3 rounded-full animate-pulse`}></div>
      </div>

      {/* Current State */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{getStatusIcon()}</span>
          <div>
            <p className="text-xl font-bold">{stats.circuit.state}</p>
            <p className="text-sm text-gray-600">{stats.circuit.stateLabel}</p>
          </div>
        </div>
      </div>

      {/* Health Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600 mb-1">Uptime</p>
          <p className="text-lg font-semibold">{stats.health.uptimePercentage.toFixed(1)}%</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600 mb-1">Total Polls</p>
          <p className="text-lg font-semibold">{stats.health.totalPolls}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600 mb-1">Successful</p>
          <p className="text-lg font-semibold text-green-600">{stats.health.successfulPolls}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600 mb-1">Failed</p>
          <p className="text-lg font-semibold text-red-600">{stats.health.failedPolls}</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="mb-6 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Failures:</span>
          <span className="font-semibold">{stats.statistics.currentFailureCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">State Changes:</span>
          <span className="font-semibold">{stats.statistics.totalTransitions}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Since State Change:</span>
          <span className="font-semibold">{stats.statistics.timeSinceStateChange}</span>
        </div>
        {stats.statistics.nextRetryIn && (
          <div className="flex justify-between">
            <span className="text-gray-600">Next Retry:</span>
            <span className="font-semibold text-orange-600">{stats.statistics.nextRetryIn}</span>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {stats.recommendations.length > 0 && (
        <div className="mb-6 p-3 bg-blue-50 rounded border border-blue-200">
          <p className="text-xs font-semibold text-blue-800 mb-2">Recommendations:</p>
          <ul className="text-xs text-blue-700 space-y-1">
            {stats.recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Manual Reset Button */}
      {stats.circuit.isFPPOffline && (
        <button
          onClick={handleReset}
          disabled={resetting}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          {resetting ? 'Resetting...' : '🔧 Manual Reset'}
        </button>
      )}

      {/* Message */}
      {message && (
        <div className={`mt-4 p-3 rounded ${message.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <p className="text-sm">{message}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Auto-refreshes every 5 seconds
        </p>
      </div>
    </div>
  );
}
