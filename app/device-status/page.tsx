'use client';

import { useState, useEffect } from 'react';
import AdminNavigation from '@/components/AdminNavigation';

interface Device {
  id: string;
  name: string;
  type: string;
  ip: string;
  enabled: boolean;
  description: string;
}

interface DeviceStatus {
  device_id: string;
  is_online: boolean;
  last_checked: string;
  last_seen_online: string | null;
  consecutive_failures: number;
  last_notified: string | null;
}

export default function DeviceStatusPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [statuses, setStatuses] = useState<Record<string, DeviceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const loadDeviceStatuses = async () => {
    try {
      const response = await fetch('/api/devices/status');
      const data = await response.json();
      
      if (data.success) {
        setDevices(data.devices);
        
        // Convert statuses array to object keyed by device_id
        const statusMap: Record<string, DeviceStatus> = {};
        data.statuses.forEach((status: DeviceStatus) => {
          statusMap[status.device_id] = status;
        });
        setStatuses(statusMap);
      }
    } catch (error) {
      console.error('Error loading device statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      const response = await fetch('/api/devices/check');
      const data = await response.json();
      
      if (data.success) {
        // Reload statuses after check
        await loadDeviceStatuses();
      }
    } catch (error) {
      console.error('Error checking devices:', error);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    loadDeviceStatuses();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDeviceStatuses, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (deviceId: string) => {
    const status = statuses[deviceId];
    if (!status) return 'border-gray-600';
    return status.is_online ? 'border-green-500' : 'border-red-500';
  };

  const getStatusIcon = (deviceId: string) => {
    const status = statuses[deviceId];
    if (!status) return '⚪';
    return status.is_online ? '✅' : '❌';
  };

  const getStatusText = (deviceId: string) => {
    const status = statuses[deviceId];
    if (!status) return 'Unknown';
    return status.is_online ? 'ONLINE' : 'OFFLINE';
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const totalDevices = devices.filter(d => d.enabled).length;
  const onlineDevices = devices.filter(d => d.enabled && statuses[d.id]?.is_online).length;
  const offlineDevices = totalDevices - onlineDevices;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <AdminNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-white">
            <div className="text-2xl">Loading device status...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <AdminNavigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center gap-3">
            📡 Device Monitor
          </h1>
          <p className="text-white/80">
            Real-time monitoring of network devices. Auto-refreshes every 30 seconds.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
            <div className="text-white/60 text-sm mb-2">Total Devices</div>
            <div className="text-4xl font-bold text-white">{totalDevices}</div>
          </div>
          
          <div className="bg-green-500/20 backdrop-blur-md rounded-lg p-6 border border-green-500/30">
            <div className="text-green-200 text-sm mb-2">Online</div>
            <div className="text-4xl font-bold text-green-400">{onlineDevices}</div>
          </div>
          
          <div className="bg-red-500/20 backdrop-blur-md rounded-lg p-6 border border-red-500/30">
            <div className="text-red-200 text-sm mb-2">Offline</div>
            <div className="text-4xl font-bold text-red-400">{offlineDevices}</div>
          </div>
        </div>

        {/* Check Now Button */}
        <div className="mb-6">
          <button
            onClick={handleCheckNow}
            disabled={checking}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            {checking ? (
              <>
                <span className="animate-spin">⏳</span>
                Checking...
              </>
            ) : (
              <>
                🔍 Check Now
              </>
            )}
          </button>
        </div>

        {/* Device Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.filter(d => d.enabled).map((device) => {
            const status = statuses[device.id];
            const isOnline = status?.is_online || false;
            
            return (
              <div
                key={device.id}
                className={`
                  bg-white/10 backdrop-blur-md rounded-lg p-6 
                  border-2 ${getStatusColor(device.id)}
                  ${isOnline ? '' : 'animate-pulse'}
                  transition-all hover:shadow-xl
                `}
              >
                {/* Device Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {device.name}
                    </h3>
                    <p className="text-white/60 text-sm">{device.description}</p>
                  </div>
                  <div className="text-3xl">
                    {getStatusIcon(device.id)}
                  </div>
                </div>

                {/* Device Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Type:</span>
                    <span className="text-white font-mono">{device.type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">IP Address:</span>
                    <span className="text-white font-mono">{device.ip}</span>
                  </div>
                </div>

                {/* Status Info */}
                <div className={`
                  px-4 py-3 rounded-lg
                  ${isOnline ? 'bg-green-500/20' : 'bg-red-500/20'}
                `}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-white/80">Status:</span>
                    <span className={`
                      font-bold
                      ${isOnline ? 'text-green-400' : 'text-red-400'}
                    `}>
                      {getStatusText(device.id)}
                    </span>
                  </div>

                  {!isOnline && status && status.consecutive_failures > 0 && (
                    <div className="text-sm text-red-300 mb-2">
                      ⚠️ {status.consecutive_failures} consecutive failure{status.consecutive_failures > 1 ? 's' : ''}
                    </div>
                  )}

                  {status && (
                    <>
                      <div className="text-xs text-white/60 mt-2">
                        Last Checked: {formatTimestamp(status.last_checked)}
                      </div>
                      {status.last_seen_online && (
                        <div className="text-xs text-white/60">
                          Last Online: {formatTimestamp(status.last_seen_online)}
                        </div>
                      )}
                      {status.last_notified && (
                        <div className="text-xs text-yellow-300 mt-1">
                          📧 Alerted: {formatTimestamp(status.last_notified)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {devices.filter(d => d.enabled).length === 0 && (
          <div className="text-center py-12 text-white/60">
            No enabled devices to monitor.
          </div>
        )}
      </div>
    </div>
  );
}
