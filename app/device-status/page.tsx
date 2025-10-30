'use client';

import { useState, useEffect } from 'react';
import AdminNavigation from '@/components/AdminNavigation';

interface Device {
  id: string;
  name: string;
  type: string;
  ip: string;
  enabled: boolean;
  description: string | null;
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    type: '',
    ip: '',
    enabled: true,
    description: '',
  });

  // Get unique device types from existing devices
  const getUniqueTypes = () => {
    const types = new Set(devices.map(d => d.type));
    return Array.from(types).sort();
  };

  // Format type for display (capitalize first letter)
  const formatType = (type: string) => {
    if (!type) return '';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

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

  function openAddModal() {
    setFormData({
      id: '',
      name: '',
      type: '',
      ip: '',
      enabled: true,
      description: '',
    });
    setShowAddModal(true);
  }

  function openEditModal(device: Device) {
    setSelectedDevice(device);
    setFormData({
      id: device.id,
      name: device.name,
      type: device.type,
      ip: device.ip,
      enabled: device.enabled,
      description: device.description || '',
    });
    setShowEditModal(true);
  }

  function openDeleteModal(device: Device) {
    setSelectedDevice(device);
    setShowDeleteModal(true);
  }

  async function handleAddDevice() {
    try {
      const response = await fetch('/api/devices/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to add device');
        return;
      }

      setShowAddModal(false);
      await loadDeviceStatuses();
    } catch (error) {
      console.error('Failed to add device:', error);
      alert('Failed to add device');
    }
  }

  async function handleUpdateDevice() {
    try {
      const response = await fetch('/api/devices/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to update device');
        return;
      }

      setShowEditModal(false);
      await loadDeviceStatuses();
    } catch (error) {
      console.error('Failed to update device:', error);
      alert('Failed to update device');
    }
  }

  async function handleDeleteDevice() {
    if (!selectedDevice) return;

    try {
      const response = await fetch(`/api/devices/manage?id=${selectedDevice.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to delete device');
        return;
      }

      setShowDeleteModal(false);
      await loadDeviceStatuses();
    } catch (error) {
      console.error('Failed to delete device:', error);
      alert('Failed to delete device');
    }
  }

  useEffect(() => {
    loadDeviceStatuses();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDeviceStatuses, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device || !device.enabled) return 'border-gray-600';
    
    const status = statuses[deviceId];
    if (!status) return 'border-gray-600';
    return status.is_online ? 'border-green-500' : 'border-red-500';
  };

  const getStatusIcon = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device || !device.enabled) return '⏸️';
    
    const status = statuses[deviceId];
    if (!status) return '⚪';
    return status.is_online ? '✅' : '❌';
  };

  const getStatusText = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device || !device.enabled) return 'DISABLED';
    
    const status = statuses[deviceId];
    if (!status) return 'Unknown';
    return status.is_online ? 'ONLINE' : 'OFFLINE';
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const totalDevices = devices.length;
  const enabledDevices = devices.filter(d => d.enabled);
  const onlineDevices = enabledDevices.filter(d => statuses[d.id]?.is_online).length;
  const offlineDevices = enabledDevices.length - onlineDevices;

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
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              📡 Device Monitor
            </h1>
            <div className="flex gap-3">
              <button
                onClick={openAddModal}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-semibold transition-all hover:from-blue-600 hover:to-cyan-700 flex items-center gap-2"
              >
                ➕ Add Device
              </button>
              <button
                onClick={handleCheckNow}
                disabled={checking}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
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
          </div>
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

        {/* Check Now Button - Removed, now in header */}

        {/* Device Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device) => {
            const status = statuses[device.id];
            const isOnline = status?.is_online || false;
            
            return (
              <div
                key={device.id}
                className={`
                  bg-white/10 backdrop-blur-md rounded-lg p-6 
                  border-2 ${getStatusColor(device.id)}
                  ${!device.enabled ? 'opacity-60' : isOnline ? '' : 'animate-pulse'}
                  transition-all hover:shadow-xl relative
                `}
              >
                {/* Action Buttons */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={() => openEditModal(device)}
                    className="w-8 h-8 bg-blue-500/80 hover:bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm transition-colors"
                    title="Edit Device"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => openDeleteModal(device)}
                    className="w-8 h-8 bg-red-500/80 hover:bg-red-600 rounded-lg flex items-center justify-center text-white text-sm transition-colors"
                    title="Delete Device"
                  >
                    🗑️
                  </button>
                </div>

                {/* Device Header */}
                <div className="flex items-start justify-between mb-4 pr-20">
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
                    <span className="text-white font-medium">{formatType(device.type)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">IP Address:</span>
                    <span className="text-white font-mono">{device.ip}</span>
                  </div>
                </div>

                {/* Status Info */}
                <div className={`
                  px-4 py-3 rounded-lg
                  ${!device.enabled ? 'bg-gray-500/20' : isOnline ? 'bg-green-500/20' : 'bg-red-500/20'}
                `}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-white/80">Status:</span>
                    <span className={`
                      font-bold
                      ${!device.enabled ? 'text-gray-400' : isOnline ? 'text-green-400' : 'text-red-400'}
                    `}>
                      {getStatusText(device.id)}
                    </span>
                  </div>

                  {!isOnline && device.enabled && status && status.consecutive_failures > 0 && (
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

        {devices.length === 0 && (
          <div className="text-center py-12 text-white/60">
            <p className="text-xl mb-4">No devices configured yet.</p>
            <button
              onClick={openAddModal}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-semibold transition-all hover:from-blue-600 hover:to-cyan-700"
            >
              ➕ Add Your First Device
            </button>
          </div>
        )}

        {/* Add Device Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl p-8 max-w-md w-full border-2 border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">Add New Device</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm mb-2">Device ID (lowercase, no spaces)</label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({...formData, id: e.target.value.toLowerCase().replace(/\s/g, '-')})}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-blue-400"
                    placeholder="fpp-new-controller"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2">Device Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-blue-400"
                    placeholder="New FPP Controller"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-blue-400"
                  >
                    <option value="">Select a type...</option>
                    <option value="fpp">FPP Controller</option>
                    <option value="falcon">Falcon Controller</option>
                    <option value="projector">Projector</option>
                    <option value="switch">Network Switch</option>
                    <option value="router">Router</option>
                    <option value="camera">Camera</option>
                    <option value="ups">UPS</option>
                    <option value="nas">NAS Storage</option>
                    <option value="server">Server</option>
                    {getUniqueTypes()
                      .filter(type => !['fpp', 'falcon', 'projector', 'switch', 'router', 'camera', 'ups', 'nas', 'server'].includes(type))
                      .map(type => (
                        <option key={type} value={type}>{formatType(type)}</option>
                      ))
                    }
                  </select>
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2">IP Address</label>
                  <input
                    type="text"
                    value={formData.ip}
                    onChange={(e) => setFormData({...formData, ip: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white font-mono focus:outline-none focus:border-blue-400"
                    placeholder="192.168.5.10"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-blue-400"
                    placeholder="Garage light controller"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
                    className="w-5 h-5 rounded"
                  />
                  <label htmlFor="enabled" className="text-white/80">Enable monitoring</label>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDevice}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-lg transition-all"
                >
                  Add Device
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Device Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl p-8 max-w-md w-full border-2 border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">Edit Device</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm mb-2">Device ID</label>
                  <input
                    type="text"
                    value={formData.id}
                    disabled
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/50 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2">Device Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-blue-400"
                  >
                    <option value="">Select a type...</option>
                    <option value="fpp">FPP Controller</option>
                    <option value="falcon">Falcon Controller</option>
                    <option value="projector">Projector</option>
                    <option value="switch">Network Switch</option>
                    <option value="router">Router</option>
                    <option value="camera">Camera</option>
                    <option value="ups">UPS</option>
                    <option value="nas">NAS Storage</option>
                    <option value="server">Server</option>
                    {getUniqueTypes()
                      .filter(type => !['fpp', 'falcon', 'projector', 'switch', 'router', 'camera', 'ups', 'nas', 'server'].includes(type))
                      .map(type => (
                        <option key={type} value={type}>{formatType(type)}</option>
                      ))
                    }
                  </select>
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2">IP Address</label>
                  <input
                    type="text"
                    value={formData.ip}
                    onChange={(e) => setFormData({...formData, ip: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white font-mono focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enabled-edit"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
                    className="w-5 h-5 rounded"
                  />
                  <label htmlFor="enabled-edit" className="text-white/80">Enable monitoring</label>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateDevice}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-lg transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedDevice && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-red-900 to-purple-900 rounded-2xl p-8 max-w-md w-full border-2 border-red-500/50">
              <h2 className="text-2xl font-bold text-white mb-4">Delete Device?</h2>
              <p className="text-white/80 mb-6">
                Are you sure you want to delete <strong>{selectedDevice.name}</strong>?
                This action cannot be undone.
              </p>
              
              <div className="bg-white/10 rounded-lg p-4 mb-6">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/70">Device:</span>
                    <span className="text-white font-medium">{selectedDevice.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">IP:</span>
                    <span className="text-white font-mono">{selectedDevice.ip}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Type:</span>
                    <span className="text-white font-medium">{formatType(selectedDevice.type)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteDevice}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
