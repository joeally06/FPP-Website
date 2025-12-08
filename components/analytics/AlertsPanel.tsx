'use client';

import { useEffect, useState } from 'react';
import { TIMING } from '@/lib/constants';

interface Alert {
  type: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  value: number;
  threshold: number;
}

interface AlertData {
  stats: {
    total_pending: number;
    currently_playing: number;
    avg_wait_minutes: number | null;
    requests_per_minute: string;
  };
  alerts: Alert[];
  hasAlerts: boolean;
}

export default function AlertsPanel() {
  const [alertData, setAlertData] = useState<AlertData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/analytics/alerts');
      if (response.ok) {
        const data = await response.json();
        setAlertData(data);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Refresh alerts every 30 seconds
    const interval = setInterval(fetchAlerts, TIMING.POLL_INTERVAL_SLOW);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Queue Alerts</h2>
        <p className="text-gray-500">Loading alerts...</p>
      </div>
    );
  }

  if (!alertData) {
    return null;
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-100 border-red-500 text-red-900';
      case 'warning':
        return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      case 'info':
        return 'bg-blue-100 border-blue-500 text-blue-900';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-900';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📊';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Queue Status & Alerts</h2>
        <button
          onClick={fetchAlerts}
          className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Pending Requests</p>
          <p className="text-2xl font-bold text-blue-600">{alertData.stats.total_pending}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Currently Playing</p>
          <p className="text-2xl font-bold text-green-600">{alertData.stats.currently_playing}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Avg Wait Time</p>
          <p className="text-2xl font-bold text-purple-600">
            {alertData.stats.avg_wait_minutes ? `${alertData.stats.avg_wait_minutes}m` : 'N/A'}
          </p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Request Rate</p>
          <p className="text-2xl font-bold text-orange-600">{alertData.stats.requests_per_minute}/min</p>
        </div>
      </div>

      {/* Alerts */}
      {alertData.hasAlerts ? (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">Active Alerts:</h3>
          {alertData.alerts.map((alert, index) => (
            <div
              key={index}
              className={`border-l-4 p-3 rounded ${getAlertColor(alert.type)}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{getAlertIcon(alert.type)}</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{alert.message}</p>
                  <p className="text-xs opacity-75">
                    Threshold: {alert.threshold} | Current: {alert.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <p className="text-green-900 font-semibold">All systems normal - No alerts</p>
          </div>
        </div>
      )}
    </div>
  );
}
