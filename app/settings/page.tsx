'use client';

import { useState, useEffect } from 'react';
import AdminNavigation from '@/components/AdminNavigation';
import UpdateChecker from '@/components/UpdateChecker';
import { 
  AdminH1, 
  AdminH2, 
  AdminH3,
  AdminH4,
  AdminText, 
  AdminTextMuted,
  AdminTextSmall,
  AdminLabel,
  AdminValue,
  AdminSuccess,
  AdminError,
  AdminInfo
} from '@/components/admin/Typography';
import Link from 'next/link';

type SettingSection = 'themes' | 'santa' | 'monitoring' | 'database' | 'updates';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingSection>('themes');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <AdminNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <AdminH1>⚙️ Settings</AdminH1>
          <AdminText>
            Configure your light show system settings and preferences
          </AdminText>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 space-y-2">
              <button
                onClick={() => setActiveSection('updates')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all font-semibold ${
                  activeSection === 'updates'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                🔄 System Updates
              </button>
              <button
                onClick={() => setActiveSection('themes')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all font-semibold ${
                  activeSection === 'themes'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                🎨 Themes
              </button>
              <button
                onClick={() => setActiveSection('santa')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all font-semibold ${
                  activeSection === 'santa'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                🎅 Santa Letters
              </button>
              <button
                onClick={() => setActiveSection('monitoring')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all font-semibold ${
                  activeSection === 'monitoring'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                📡 Device Monitoring
              </button>
              <button
                onClick={() => setActiveSection('database')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all font-semibold ${
                  activeSection === 'database'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                💾 Database
              </button>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            {activeSection === 'updates' && <UpdateSettings />}
            {activeSection === 'themes' && <ThemeSettings />}
            {activeSection === 'santa' && <SantaLetterSettings />}
            {activeSection === 'monitoring' && <MonitoringSettings />}
            {activeSection === 'database' && <DatabaseSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}

function UpdateSettings() {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <UpdateChecker />
    </div>
  );
}

function ThemeSettings() {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <AdminH2>🎨 Theme Configuration</AdminH2>
      
      <AdminText className="mb-6">
        Customize the visual appearance of your jukebox page with different particle effects and color schemes.
      </AdminText>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-white font-semibold mb-2">🎄 Default Theme</div>
          <div className="text-white/60 text-sm">Standard particle effects</div>
        </div>
        
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-white font-semibold mb-2">❄️ Snow Theme</div>
          <div className="text-white/60 text-sm">Falling snow particles</div>
        </div>
        
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-white font-semibold mb-2">✨ Sparkle Theme</div>
          <div className="text-white/60 text-sm">Twinkling stars</div>
        </div>
        
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-white font-semibold mb-2">🎨 Custom</div>
          <div className="text-white/60 text-sm">Create your own</div>
        </div>
      </div>

      <Link
        href="/theme-settings"
        className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all font-semibold"
      >
        Manage Themes →
      </Link>
    </div>
  );
}

function SantaLetterSettings() {
  const [santaEnabled, setSantaEnabled] = useState(true);
  const [dailyLimit, setDailyLimit] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings?category=santa');
        const data = await response.json();
        
        if (data.settings) {
          setSantaEnabled(data.settings.santa_letters_enabled === 'true');
          setDailyLimit(parseInt(data.settings.santa_daily_limit || '1', 10));
        }
      } catch (error) {
        console.error('Failed to load Santa settings:', error);
        setMessage('❌ Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('⏳ Saving settings...');
      
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            santa_letters_enabled: santaEnabled.toString(),
            santa_daily_limit: dailyLimit.toString(),
          },
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Settings saved successfully!');
      } else {
        setMessage(`❌ Failed to save: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage('❌ Failed to save settings');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <AdminH2>🎅 Santa Letter Configuration</AdminH2>
        <p className="text-white/60 mt-4">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <AdminH2>🎅 Santa Letter Configuration</AdminH2>
      
      {message && (
        <div className="mb-6 mt-4 p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
          <AdminInfo>{message}</AdminInfo>
        </div>
      )}
      
      <div className="space-y-6 mt-6">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="santa-enabled"
            checked={santaEnabled}
            onChange={(e) => setSantaEnabled(e.target.checked)}
            className="w-5 h-5 rounded mt-1"
          />
          <div>
            <AdminLabel htmlFor="santa-enabled" className="cursor-pointer mb-0">
              Enable Santa Letter Submissions
            </AdminLabel>
            <AdminTextSmall className="mt-1">
              Allow visitors to submit letters to Santa via your website
            </AdminTextSmall>
          </div>
        </div>

        <div>
          <AdminLabel>Daily Letter Limit (per IP)</AdminLabel>
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={dailyLimit}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setDailyLimit(1);
                } else {
                  const num = parseInt(val, 10);
                  if (!isNaN(num) && num >= 1) {
                    setDailyLimit(num);
                  }
                }
              }}
              min={1}
              max={10}
              className="w-32 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
            />
            <AdminTextSmall>letters per day</AdminTextSmall>
          </div>
          <AdminTextSmall className="mt-1">
            Prevent spam while allowing genuine submissions
          </AdminTextSmall>
        </div>

        <div className="pt-4 border-t border-white/10">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {saving ? '⏳ Saving...' : '💾 Save Santa Settings'}
          </button>
        </div>

        <div>
          <AdminLabel>Queue Processing Status</AdminLabel>
          <div className="p-4 bg-green-500/20 rounded-lg border border-green-500/30">
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-2xl">✅</span>
              <AdminSuccess className="text-base">Queue processor active - checking every 90 seconds</AdminSuccess>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10">
          <Link
            href="/santa-letters"
            className="inline-block px-6 py-3 bg-gradient-to-r from-red-500 to-green-600 text-white rounded-lg hover:from-red-600 hover:to-green-700 transition-all font-semibold"
          >
            View Santa Letters →
          </Link>
        </div>
      </div>
    </div>
  );
}

function MonitoringSettings() {
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [startHour, setStartHour] = useState(16); // 4 PM
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(22); // 10 PM
  const [endMinute, setEndMinute] = useState(0);
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings?category=monitoring');
        const data = await response.json();
        
        if (data.settings) {
          setMonitoringEnabled(data.settings.monitoring_enabled === 'true');
          setStartHour(parseInt(data.settings.monitoring_start_hour || '16', 10));
          setStartMinute(parseInt(data.settings.monitoring_start_minute || '0', 10));
          setEndHour(parseInt(data.settings.monitoring_end_hour || '22', 10));
          setEndMinute(parseInt(data.settings.monitoring_end_minute || '0', 10));
          setIntervalMinutes(parseInt(data.settings.monitoring_interval_minutes || '5', 10));
        }
      } catch (error) {
        console.error('Failed to load monitoring settings:', error);
        setMessage('❌ Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('⏳ Saving settings...');
      
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            monitoring_enabled: monitoringEnabled.toString(),
            monitoring_start_hour: startHour.toString(),
            monitoring_start_minute: startMinute.toString(),
            monitoring_end_hour: endHour.toString(),
            monitoring_end_minute: endMinute.toString(),
            monitoring_interval_minutes: intervalMinutes.toString(),
          },
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Settings saved successfully! Changes will apply on next monitoring cycle.');
      } else {
        setMessage(`❌ Failed to save: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage('❌ Failed to save settings');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <AdminH2>📡 Device Monitoring Settings</AdminH2>
        <p className="text-white/60 mt-4">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <AdminH2>📡 Device Monitoring Settings</AdminH2>
      
      {message && (
        <div className="mb-6 mt-4 p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
          <AdminInfo>{message}</AdminInfo>
        </div>
      )}
      
      <div className="space-y-6 mt-6">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="monitoring-enabled"
            checked={monitoringEnabled}
            onChange={(e) => setMonitoringEnabled(e.target.checked)}
            className="w-5 h-5 rounded mt-1"
          />
          <div>
            <AdminLabel htmlFor="monitoring-enabled" className="cursor-pointer mb-0">
              Enable Device Monitoring
            </AdminLabel>
            <AdminTextSmall className="mt-1">
              Automatically check device status and send email alerts when offline
            </AdminTextSmall>
          </div>
        </div>

        <div>
          <AdminLabel>Monitoring Schedule</AdminLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <AdminTextSmall className="mb-2">Start Time</AdminTextSmall>
              <div className="flex gap-2">
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(parseInt(e.target.value, 10))}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{formatTime(i, 0).split(':')[0]} {formatTime(i, 0).split(' ')[1]}</option>
                  ))}
                </select>
                <select
                  value={startMinute}
                  onChange={(e) => setStartMinute(parseInt(e.target.value, 10))}
                  className="w-20 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                >
                  <option value={0}>:00</option>
                  <option value={15}>:15</option>
                  <option value={30}>:30</option>
                  <option value={45}>:45</option>
                </select>
              </div>
            </div>
            
            <div>
              <AdminTextSmall className="mb-2">End Time</AdminTextSmall>
              <div className="flex gap-2">
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(parseInt(e.target.value, 10))}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{formatTime(i, 0).split(':')[0]} {formatTime(i, 0).split(' ')[1]}</option>
                  ))}
                </select>
                <select
                  value={endMinute}
                  onChange={(e) => setEndMinute(parseInt(e.target.value, 10))}
                  className="w-20 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                >
                  <option value={0}>:00</option>
                  <option value={15}>:15</option>
                  <option value={30}>:30</option>
                  <option value={45}>:45</option>
                </select>
              </div>
            </div>
          </div>
          <AdminTextSmall className="mt-2">
            Current schedule: {formatTime(startHour, startMinute)} - {formatTime(endHour, endMinute)} CST
          </AdminTextSmall>
        </div>

        <div>
          <AdminLabel>Check Interval</AdminLabel>
          <div className="flex items-center gap-4">
            <select
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(parseInt(e.target.value, 10))}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
            >
              <option value={1}>1 minute</option>
              <option value={2}>2 minutes</option>
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
          </div>
          <AdminTextSmall className="mt-1">
            How often to ping devices during monitoring hours
          </AdminTextSmall>
        </div>

        <div className="pt-4 border-t border-white/10">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {saving ? '⏳ Saving...' : '💾 Save Monitoring Settings'}
          </button>
        </div>

        <div>
          <AdminLabel>Alert Email</AdminLabel>
          <input
            type="email"
            defaultValue="joeally5@gmail.com"
            disabled
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60"
          />
          <AdminTextSmall className="mt-1">
            Configure in .env.local as SMTP_USER
          </AdminTextSmall>
        </div>

        <div className="pt-4 border-t border-white/10">
          <Link
            href="/device-status"
            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all font-semibold"
          >
            View Device Monitor →
          </Link>
        </div>
      </div>
    </div>
  );
}

function DatabaseSettings() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/database/maintenance');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch database stats:', error);
      setMessage('❌ Failed to load database statistics');
    } finally {
      setLoading(false);
    }
  };

  const runMaintenance = async (action: string) => {
    try {
      setLoading(true);
      setMessage(`⏳ Running ${action} maintenance...`);
      
      const response = await fetch('/api/database/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ ${action.charAt(0).toUpperCase() + action.slice(1)} maintenance completed successfully`);
        await fetchStats(); // Refresh stats
      } else {
        setMessage(`❌ Maintenance failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Maintenance error:', error);
      setMessage('❌ Maintenance operation failed');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 5000); // Clear message after 5 seconds
    }
  };

  // Load stats on component mount
  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <AdminH2>💾 Database Management</AdminH2>
      
      {message && (
        <div className="mb-6 p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
          <AdminInfo>{message}</AdminInfo>
        </div>
      )}

      <div className="space-y-6">
        {/* Database Statistics */}
        <div>
          <AdminH3>📊 Database Statistics</AdminH3>
          {loading && !stats ? (
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <AdminTextMuted>Loading statistics...</AdminTextMuted>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <AdminTextSmall className="mb-1">Database Size</AdminTextSmall>
                <AdminValue>
                  {stats.approximateSizeMB?.toFixed(2) || '0'} MB
                </AdminValue>
              </div>
              
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <AdminTextSmall className="mb-1">Journal Mode</AdminTextSmall>
                <AdminValue>{stats.journalMode || 'Unknown'}</AdminValue>
              </div>
              
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <AdminTextSmall className="mb-1">Page Views</AdminTextSmall>
                <AdminValue>{stats.pageViews?.count?.toLocaleString() || '0'}</AdminValue>
              </div>
              
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <AdminTextSmall className="mb-1">Visitors</AdminTextSmall>
                <AdminValue>{stats.visitors?.count?.toLocaleString() || '0'}</AdminValue>
              </div>
              
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <AdminTextSmall className="mb-1">Song Requests</AdminTextSmall>
                <AdminValue>{stats.jukeboxQueue?.count?.toLocaleString() || '0'}</AdminValue>
              </div>
              
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <AdminTextSmall className="mb-1">Santa Letters</AdminTextSmall>
                <AdminValue>{stats.santaLetters?.count?.toLocaleString() || '0'}</AdminValue>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <AdminTextMuted>No statistics available</AdminTextMuted>
            </div>
          )}
        </div>

        {/* Maintenance Actions */}
        <div>
          <AdminH3>🔧 Maintenance Operations</AdminH3>
          <div className="space-y-3">
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <AdminH4>Quick Maintenance</AdminH4>
                  <AdminTextSmall>
                    Analyze database statistics for query optimization (fast, ~1 second)
                  </AdminTextSmall>
                </div>
                <button
                  onClick={() => runMaintenance('quick')}
                  disabled={loading}
                  className="ml-4 px-4 py-2 bg-blue-500/80 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Run Quick
                </button>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <AdminH4>Full Maintenance</AdminH4>
                  <AdminTextSmall>
                    ANALYZE, REINDEX, and VACUUM database (slow, ~30-60 seconds)
                  </AdminTextSmall>
                </div>
                <button
                  onClick={() => runMaintenance('full')}
                  disabled={loading}
                  className="ml-4 px-4 py-2 bg-purple-500/80 hover:bg-purple-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Run Full
                </button>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <AdminH4>Archive Old Data</AdminH4>
                  <AdminTextSmall>
                    Remove page views older than 1 year and device status older than 90 days
                  </AdminTextSmall>
                </div>
                <button
                  onClick={() => runMaintenance('archive')}
                  disabled={loading}
                  className="ml-4 px-4 py-2 bg-orange-500/80 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Archive
                </button>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <AdminH4>Integrity Check</AdminH4>
                  <AdminTextSmall>
                    Verify database integrity and check for corruption
                  </AdminTextSmall>
                </div>
                <button
                  onClick={() => runMaintenance('integrity')}
                  disabled={loading}
                  className="ml-4 px-4 py-2 bg-green-500/80 hover:bg-green-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Check
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Automated Maintenance Info */}
        <div className="p-4 bg-green-500/20 rounded-lg border border-green-500/30">
          <AdminH4>✅ Automated Maintenance Active</AdminH4>
          <ul className="space-y-1">
            <li><AdminTextSmall>• Quick maintenance runs daily (every 24 hours)</AdminTextSmall></li>
            <li><AdminTextSmall>• Full maintenance runs weekly (every 7 days)</AdminTextSmall></li>
            <li><AdminTextSmall>• Data archival is MANUAL ONLY (use button above)</AdminTextSmall></li>
            <li><AdminTextSmall>• WAL mode enabled for better performance</AdminTextSmall></li>
            <li><AdminTextSmall>• 64MB cache size for faster queries</AdminTextSmall></li>
            <li><AdminTextSmall>• 30+ indexes created for optimal performance</AdminTextSmall></li>
          </ul>
        </div>

        <button
          onClick={fetchStats}
          disabled={loading}
          className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔄 Refresh Statistics
        </button>
      </div>
    </div>
  );
}
