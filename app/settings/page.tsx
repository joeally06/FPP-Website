'use client';

import { useState, useEffect } from 'react';
import AdminNavigation from '@/components/AdminNavigation';
import UpdateChecker from '@/components/UpdateChecker';
import LiveUpdateModal from '@/components/LiveUpdateModal';
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

type SettingSection = 'themes' | 'santa' | 'monitoring' | 'database' | 'updates' | 'youtube';

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
              <button
                onClick={() => setActiveSection('youtube')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all font-semibold ${
                  activeSection === 'youtube'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                🎬 YouTube Videos
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
            {activeSection === 'youtube' && <YouTubeVideoSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}

function UpdateSettings() {
  const [showLiveUpdateModal, setShowLiveUpdateModal] = useState(false);
  
  return (
    <>
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <UpdateChecker onInstallClick={() => setShowLiveUpdateModal(true)} />
      </div>
      
      <LiveUpdateModal
        isOpen={showLiveUpdateModal}
        onClose={() => setShowLiveUpdateModal(false)}
      />
    </>
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
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [startHour, setStartHour] = useState(16); // 4 PM
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(22); // 10 PM
  const [endMinute, setEndMinute] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/devices/schedule');
        const data = await response.json();
        
        if (data.success && data.schedule) {
          const schedule = data.schedule;
          setMonitoringEnabled(Boolean(schedule.enabled));
          
          // Parse start time (HH:MM format)
          if (schedule.start_time) {
            const [h, m] = schedule.start_time.split(':');
            setStartHour(parseInt(h, 10));
            setStartMinute(parseInt(m, 10));
          }
          
          // Parse end time (HH:MM format)
          if (schedule.end_time) {
            const [h, m] = schedule.end_time.split(':');
            setEndHour(parseInt(h, 10));
            setEndMinute(parseInt(m, 10));
          }
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
      
      // Format times as HH:MM
      const start_time = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
      const end_time = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      
      const response = await fetch('/api/devices/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: monitoringEnabled,
          start_time,
          end_time,
          timezone: 'America/Chicago'
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Monitoring settings saved successfully! Changes are active now.');
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

        <div className="pt-4 border-t border-white/10">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {saving ? '⏳ Saving...' : '💾 Save Monitoring Settings'}
          </button>
        </div>

        <div className="p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
          <AdminH4>ℹ️ How Device Monitoring Works</AdminH4>
          <ul className="space-y-1 mt-2">
            <li><AdminTextSmall>• Monitoring runs automatically during the scheduled time window</AdminTextSmall></li>
            <li><AdminTextSmall>• Devices are checked every 5 minutes when enabled</AdminTextSmall></li>
            <li><AdminTextSmall>• Email alerts are sent when devices go offline</AdminTextSmall></li>
            <li><AdminTextSmall>• Configure devices on the Device Status page</AdminTextSmall></li>
          </ul>
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
        credentials: 'include', // Ensure session cookies are sent
        body: JSON.stringify({ action }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle authentication and other HTTP errors
        setMessage(`❌ Maintenance failed: ${data.error || 'Unknown error'}`);
        return;
      }
      
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

function YouTubeVideoSettings() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    youtubeUrl: '',
    description: ''
  });

  // Load videos on mount
  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/youtube-videos');
      const data = await response.json();
      
      if (data.success) {
        setVideos(data.videos || []);
      } else {
        setMessage(`❌ Failed to load videos: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to load videos:', error);
      setMessage('❌ Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', youtubeUrl: '', description: '' });
    setEditingVideo(null);
    setShowAddForm(false);
  };

  const handleAddVideo = async () => {
    if (!formData.youtubeUrl.trim()) {
      setMessage('❌ YouTube URL is required');
      return;
    }

    try {
      setSaving(true);
      setMessage('⏳ Adding video...');

      const response = await fetch('/api/admin/youtube-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeUrl: formData.youtubeUrl.trim(),
          title: formData.title.trim() || undefined,
          description: formData.description.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ Video added successfully!');
        resetForm();
        await loadVideos();
      } else {
        setMessage(`❌ Failed to add video: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to add video:', error);
      setMessage('❌ Failed to add video');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleEditVideo = async () => {
    if (!editingVideo) return;

    try {
      setSaving(true);
      setMessage('⏳ Updating video...');

      const response = await fetch(`/api/admin/youtube-videos/${editingVideo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim() || undefined,
          description: formData.description.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ Video updated successfully!');
        resetForm();
        await loadVideos();
      } else {
        setMessage(`❌ Failed to update video: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to update video:', error);
      setMessage('❌ Failed to update video');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleDeleteVideo = async (videoId: number) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      setSaving(true);
      setMessage('⏳ Deleting video...');

      const response = await fetch(`/api/admin/youtube-videos/${videoId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ Video deleted successfully!');
        await loadVideos();
      } else {
        setMessage(`❌ Failed to delete video: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to delete video:', error);
      setMessage('❌ Failed to delete video');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const startEdit = (video: any) => {
    setEditingVideo(video);
    setFormData({
      title: video.title || '',
      youtubeUrl: `https://www.youtube.com/watch?v=${video.youtube_id}`,
      description: video.description || ''
    });
    setShowAddForm(true);
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <AdminH2>🎬 YouTube Video Management</AdminH2>
        <p className="text-white/60 mt-4">Loading videos...</p>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <AdminH2>🎬 YouTube Video Management</AdminH2>
      
      <AdminText className="mb-6">
        Manage YouTube videos available for playback on the jukebox page. Videos are publicly accessible for all visitors.
      </AdminText>

      {message && (
        <div className="mb-6 p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
          <AdminInfo>{message}</AdminInfo>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="mb-6 p-6 bg-white/5 rounded-lg border border-white/10">
          <AdminH3>{editingVideo ? '✏️ Edit Video' : '➕ Add New Video'}</AdminH3>
          
          <div className="space-y-4 mt-4">
            <div>
              <AdminLabel>YouTube URL *</AdminLabel>
              <input
                type="url"
                value={formData.youtubeUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                placeholder="https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID"
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
                disabled={editingVideo !== null} // Can't change URL when editing
              />
              <AdminTextSmall className="mt-1">
                {editingVideo ? 'URL cannot be changed when editing' : 'Paste the full YouTube URL'}
              </AdminTextSmall>
            </div>

            <div>
              <AdminLabel>Title (Optional)</AdminLabel>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Custom title (leave empty to use YouTube title)"
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
              />
              <AdminTextSmall className="mt-1">
                Leave empty to automatically use the YouTube video title
              </AdminTextSmall>
            </div>

            <div>
              <AdminLabel>Description (Optional)</AdminLabel>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description for this video"
                rows={3}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 resize-vertical"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={editingVideo ? handleEditVideo : handleAddVideo}
                disabled={saving}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '⏳ Saving...' : (editingVideo ? '💾 Update Video' : '➕ Add Video')}
              </button>
              
              <button
                onClick={resetForm}
                className="px-6 py-2 bg-gray-500/80 hover:bg-gray-600 text-white rounded-lg transition-all font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Videos List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <AdminH3>📹 Available Videos ({videos.length})</AdminH3>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all font-semibold"
            >
              ➕ Add Video
            </button>
          )}
        </div>

        {videos.length === 0 ? (
          <div className="p-8 bg-white/5 rounded-lg border border-white/10 text-center">
            <AdminTextMuted>No videos added yet</AdminTextMuted>
            <AdminTextSmall className="mt-2">
              Click "Add Video" to add your first YouTube video for the jukebox
            </AdminTextSmall>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.map((video) => (
              <div key={video.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-start gap-3">
                  {video.thumbnail_url && (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-20 h-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <AdminH4 className="truncate">{video.title}</AdminH4>
                    <AdminTextSmall className="text-white/60">
                      {video.youtube_id}
                    </AdminTextSmall>
                    {video.description && (
                      <AdminTextSmall className="mt-1 block">
                        {video.description}
                      </AdminTextSmall>
                    )}
                    <AdminTextSmall className="mt-1 text-white/40">
                      Added {new Date(video.created_at).toLocaleDateString()}
                    </AdminTextSmall>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => startEdit(video)}
                    className="px-3 py-1 bg-yellow-500/80 hover:bg-yellow-600 text-white rounded text-sm font-semibold transition-all"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDeleteVideo(video.id)}
                    disabled={saving}
                    className="px-3 py-1 bg-red-500/80 hover:bg-red-600 text-white rounded text-sm font-semibold transition-all disabled:opacity-50"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="mt-6 p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
        <AdminH4>ℹ️ How It Works</AdminH4>
        <ul className="space-y-1 mt-2">
          <li><AdminTextSmall>• Videos are publicly accessible on the jukebox page</AdminTextSmall></li>
          <li><AdminTextSmall>• Visitors can select and watch any video you've added</AdminTextSmall></li>
          <li><AdminTextSmall>• YouTube handles all video streaming and playback</AdminTextSmall></li>
          <li><AdminTextSmall>• Titles and thumbnails are automatically fetched from YouTube</AdminTextSmall></li>
          <li><AdminTextSmall>• Only you (admin) can add, edit, or delete videos</AdminTextSmall></li>
        </ul>
      </div>
    </div>
  );
}
