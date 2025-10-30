'use client';

import { useState } from 'react';
import AdminNavigation from '@/components/AdminNavigation';
import Link from 'next/link';

type SettingSection = 'general' | 'themes' | 'santa' | 'monitoring';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingSection>('general');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <AdminNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">⚙️ Settings</h1>
          <p className="text-white/80">
            Configure your light show system settings and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 space-y-2">
              <button
                onClick={() => setActiveSection('general')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all font-semibold ${
                  activeSection === 'general'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                🔧 General
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
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            {activeSection === 'general' && <GeneralSettings />}
            {activeSection === 'themes' && <ThemeSettings />}
            {activeSection === 'santa' && <SantaLetterSettings />}
            {activeSection === 'monitoring' && <MonitoringSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}

function GeneralSettings() {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <h2 className="text-2xl font-bold text-white mb-6">🔧 General Settings</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-white font-semibold mb-2">Application Timezone</label>
          <input
            type="text"
            value="America/Chicago (Central Time)"
            disabled
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60"
          />
          <p className="text-white/60 text-sm mt-1">
            Configure in .env.local as NEXT_PUBLIC_TIMEZONE
          </p>
        </div>

        <div>
          <label className="block text-white font-semibold mb-2">FPP Controller URL</label>
          <input
            type="text"
            defaultValue="http://192.168.5.2:80"
            disabled
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60"
          />
          <p className="text-white/60 text-sm mt-1">
            Configure in .env.local as FPP_URL
          </p>
        </div>

        <div>
          <label className="block text-white font-semibold mb-2">Ollama LLM URL</label>
          <input
            type="text"
            defaultValue="http://192.168.2.186:11434"
            disabled
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60"
          />
          <p className="text-white/60 text-sm mt-1">
            Configure in .env.local as OLLAMA_URL
          </p>
        </div>

        <div className="p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
          <p className="text-white text-sm">
            ℹ️ <strong>Note:</strong> Most settings are configured via environment variables in .env.local for security
          </p>
        </div>
      </div>
    </div>
  );
}

function ThemeSettings() {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <h2 className="text-2xl font-bold text-white mb-6">🎨 Theme Configuration</h2>
      
      <p className="text-white/80 mb-6">
        Customize the visual appearance of your jukebox page with different particle effects and color schemes.
      </p>

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
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <h2 className="text-2xl font-bold text-white mb-6">🎅 Santa Letter Configuration</h2>
      
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="santa-enabled"
            defaultChecked
            className="w-5 h-5 rounded mt-1"
          />
          <div>
            <label htmlFor="santa-enabled" className="text-white font-semibold block">
              Enable Santa Letter Submissions
            </label>
            <p className="text-white/60 text-sm mt-1">
              Allow visitors to submit letters to Santa via your website
            </p>
          </div>
        </div>

        <div>
          <label className="block text-white font-semibold mb-2">Daily Letter Limit (per IP)</label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              defaultValue={1}
              min={1}
              max={10}
              className="w-32 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
            />
            <span className="text-white/60 text-sm">letters per day</span>
          </div>
          <p className="text-white/60 text-sm mt-1">
            Prevent spam while allowing genuine submissions
          </p>
        </div>

        <div>
          <label className="block text-white font-semibold mb-2">Queue Processing Status</label>
          <div className="p-4 bg-green-500/20 rounded-lg border border-green-500/30">
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-2xl">✅</span>
              <span className="text-white">Queue processor active - checking every 90 seconds</span>
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
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <h2 className="text-2xl font-bold text-white mb-6">📡 Device Monitoring Settings</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-white font-semibold mb-2">Monitoring Schedule</label>
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="text-white mb-2">Show Hours: 4:00 PM - 10:00 PM CST</div>
            <div className="text-white/60 text-sm">
              Email alerts only sent during these hours when devices go offline
            </div>
          </div>
        </div>

        <div>
          <label className="block text-white font-semibold mb-2">Check Interval</label>
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="text-white mb-2">Every 5 minutes</div>
            <div className="text-white/60 text-sm">
              Devices are pinged every 5 minutes during monitoring hours
            </div>
          </div>
        </div>

        <div>
          <label className="block text-white font-semibold mb-2">Alert Email</label>
          <input
            type="email"
            defaultValue="joeally5@gmail.com"
            disabled
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60"
          />
          <p className="text-white/60 text-sm mt-1">
            Configure in .env.local as SMTP_USER
          </p>
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
