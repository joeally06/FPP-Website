'use client';

import { useEffect, useState } from 'react';

interface BannerConfig {
  countdownEnabled: boolean;
  countdownHeading: string;
  countdownSubtitle: string;
  countdownBgColor: string;
  countdownTextColor: string;
  countdownBorderColor: string;
  offSeasonEnabled: boolean;
  offSeasonHeading: string;
  offSeasonSubtitle: string;
  offSeasonBgColor: string;
  offSeasonTextColor: string;
  offSeasonBorderColor: string;
  offlineEnabled: boolean;
  offlineHeading: string;
  offlineSubtitle: string;
  offlineBgColor: string;
  offlineTextColor: string;
  offlineBorderColor: string;
}

const COLOR_PRESETS = [
  {
    name: 'Blue',
    bgColor: 'bg-linear-to-r from-blue-600/30 to-blue-700/30',
    textColor: 'text-white',
    borderColor: 'border-blue-500/50',
  },
  {
    name: 'Purple',
    bgColor: 'bg-linear-to-r from-purple-600/30 to-purple-700/30',
    textColor: 'text-white',
    borderColor: 'border-purple-500/50',
  },
  {
    name: 'Red',
    bgColor: 'bg-linear-to-r from-red-600/30 to-red-700/30',
    textColor: 'text-white',
    borderColor: 'border-red-500/50',
  },
  {
    name: 'Green',
    bgColor: 'bg-linear-to-r from-green-600/30 to-green-700/30',
    textColor: 'text-white',
    borderColor: 'border-green-500/50',
  },
  {
    name: 'Yellow',
    bgColor: 'bg-linear-to-r from-yellow-600/30 to-yellow-700/30',
    textColor: 'text-white',
    borderColor: 'border-yellow-500/50',
  },
  {
    name: 'Orange',
    bgColor: 'bg-linear-to-r from-orange-600/30 to-orange-700/30',
    textColor: 'text-white',
    borderColor: 'border-orange-500/50',
  },
  {
    name: 'Slate',
    bgColor: 'bg-linear-to-r from-slate-700/30 to-slate-800/30',
    textColor: 'text-white',
    borderColor: 'border-slate-600/50',
  },
  {
    name: 'Christmas',
    bgColor: 'bg-linear-to-r from-red-600/30 via-green-600/30 to-red-600/30',
    textColor: 'text-white',
    borderColor: 'border-red-500/50',
  },
  {
    name: 'Halloween',
    bgColor: 'bg-linear-to-r from-orange-600/30 via-purple-600/30 to-orange-600/30',
    textColor: 'text-white',
    borderColor: 'border-orange-500/50',
  },
];

export default function BannerSettings() {
  const [config, setConfig] = useState<BannerConfig>({
    countdownEnabled: true,
    countdownHeading: '⏰ Next Show Starting Soon',
    countdownSubtitle: 'Show starts in {time}',
    countdownBgColor: 'bg-linear-to-r from-blue-600/30 to-blue-700/30',
    countdownTextColor: 'text-white',
    countdownBorderColor: 'border-blue-500/50',
    offSeasonEnabled: false,
    offSeasonHeading: '🎭 The show is currently off-season',
    offSeasonSubtitle: 'Check back later for more shows!',
    offSeasonBgColor: 'bg-linear-to-r from-purple-600/30 to-purple-700/30',
    offSeasonTextColor: 'text-white',
    offSeasonBorderColor: 'border-purple-500/50',
    offlineEnabled: true,
    offlineHeading: 'Show is Currently Inactive',
    offlineSubtitle: 'Song requests will be available when the show starts',
    offlineBgColor: 'bg-linear-to-r from-slate-700/30 to-slate-800/30',
    offlineTextColor: 'text-white',
    offlineBorderColor: 'border-slate-600/50',
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/jukebox/banner-config')
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => console.error('Failed to load banner config:', err));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/jukebox/banner-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setMessage('✅ Banner settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const data = await response.json();
        setMessage(`❌ ${data.error || 'Failed to save settings'}`);
      }
    } catch (error) {
      console.error('Error saving banner config:', error);
      setMessage('❌ Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const applyColorPreset = (
    type: 'countdown' | 'offSeason' | 'offline',
    preset: { bgColor: string; textColor: string; borderColor: string }
  ) => {
    setConfig({
      ...config,
      [`${type}BgColor`]: preset.bgColor,
      [`${type}TextColor`]: preset.textColor,
      [`${type}BorderColor`]: preset.borderColor,
    });
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">🎨 Banner Configuration</h3>
        <p className="text-white/60 text-sm mb-4">
          Configure all three jukebox banners. Only ONE banner displays at a time based on priority:
        </p>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
          <p className="text-white/90 text-sm font-medium">
            <span className="font-bold text-blue-300">Priority Order:</span> 
            <br />
            1️⃣ <strong>Countdown Banner</strong> (when show is about to start)
            <br />
            2️⃣ <strong>Off-Season Banner</strong> (when manually enabled)
            <br />
            3️⃣ <strong>Offline Banner</strong> (when FPP is not playing)
          </p>
        </div>
      </div>

      {/* Countdown Banner */}
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white">1️⃣ Countdown Banner</h4>
          <button
            onClick={() => setConfig({ ...config, countdownEnabled: !config.countdownEnabled })}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              config.countdownEnabled ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                config.countdownEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Heading</label>
            <input
              type="text"
              value={config.countdownHeading}
              onChange={(e) => setConfig({ ...config, countdownHeading: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Subtitle <span className="text-white/40">(use {'{time}'} for countdown)</span>
            </label>
            <input
              type="text"
              value={config.countdownSubtitle}
              onChange={(e) => setConfig({ ...config, countdownSubtitle: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Color Theme</label>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyColorPreset('countdown', preset)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${preset.bgColor} ${preset.textColor} ${preset.borderColor} border-2 hover:scale-105`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-white/60 mb-2">Preview:</p>
            <div
              className={`${config.countdownBgColor} ${config.countdownTextColor} ${config.countdownBorderColor} border-2 rounded-lg p-4 text-center`}
            >
              <h5 className="text-lg font-bold mb-1">{config.countdownHeading}</h5>
              <p className="text-sm">{config.countdownSubtitle.replace('{time}', '15 minutes')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Off-Season Banner */}
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white">2️⃣ Off-Season Banner</h4>
          <button
            onClick={() => setConfig({ ...config, offSeasonEnabled: !config.offSeasonEnabled })}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              config.offSeasonEnabled ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                config.offSeasonEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Heading</label>
            <input
              type="text"
              value={config.offSeasonHeading}
              onChange={(e) => setConfig({ ...config, offSeasonHeading: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Subtitle</label>
            <input
              type="text"
              value={config.offSeasonSubtitle}
              onChange={(e) => setConfig({ ...config, offSeasonSubtitle: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Color Theme</label>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyColorPreset('offSeason', preset)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${preset.bgColor} ${preset.textColor} ${preset.borderColor} border-2 hover:scale-105`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-white/60 mb-2">Preview:</p>
            <div
              className={`${config.offSeasonBgColor} ${config.offSeasonTextColor} ${config.offSeasonBorderColor} border-2 rounded-lg p-4 text-center`}
            >
              <h5 className="text-lg font-bold mb-1">{config.offSeasonHeading}</h5>
              <p className="text-sm">{config.offSeasonSubtitle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Offline Banner */}
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white">3️⃣ Offline Banner</h4>
          <button
            onClick={() => setConfig({ ...config, offlineEnabled: !config.offlineEnabled })}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              config.offlineEnabled ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                config.offlineEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Heading</label>
            <input
              type="text"
              value={config.offlineHeading}
              onChange={(e) => setConfig({ ...config, offlineHeading: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Subtitle</label>
            <input
              type="text"
              value={config.offlineSubtitle}
              onChange={(e) => setConfig({ ...config, offlineSubtitle: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Color Theme</label>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyColorPreset('offline', preset)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${preset.bgColor} ${preset.textColor} ${preset.borderColor} border-2 hover:scale-105`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-white/60 mb-2">Preview:</p>
            <div
              className={`${config.offlineBgColor} ${config.offlineTextColor} ${config.offlineBorderColor} border-2 rounded-lg p-4 text-center`}
            >
              <h5 className="text-lg font-bold mb-1">{config.offlineHeading}</h5>
              <p className="text-sm">{config.offlineSubtitle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      {message && (
        <div className={`p-3 rounded-lg ${message.startsWith('✅') ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
          {message}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
      >
        {saving ? '💾 Saving All Banners...' : '💾 Save All Banner Settings'}
      </button>
    </div>
  );
}
