'use client';

import React, { useState, useEffect } from 'react';

interface GameSettings {
  enabled: boolean;
  initialSpeed: number;
  speedIncrease: number;
  spawnInterval: number;
  spawnDecrease: number;
  minSpawnInterval: number;
}

const DEFAULT_PRESETS = {
  easy: {
    initialSpeed: 0.3,
    speedIncrease: 0.1,
    spawnInterval: 3000,
    spawnDecrease: 100,
    minSpawnInterval: 1200
  },
  normal: {
    initialSpeed: 0.5,
    speedIncrease: 0.15,
    spawnInterval: 2000,
    spawnDecrease: 150,
    minSpawnInterval: 800
  },
  hard: {
    initialSpeed: 0.8,
    speedIncrease: 0.2,
    spawnInterval: 1200,
    spawnDecrease: 200,
    minSpawnInterval: 500
  },
  expert: {
    initialSpeed: 1.2,
    speedIncrease: 0.3,
    spawnInterval: 800,
    spawnDecrease: 300,
    minSpawnInterval: 300
  }
};

export default function GameSettings() {
  const [settings, setSettings] = useState<GameSettings>({
    enabled: true,
    initialSpeed: 0.5,
    speedIncrease: 0.15,
    spawnInterval: 2000,
    spawnDecrease: 150,
    minSpawnInterval: 800
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/games/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch game settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/games/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Game settings saved successfully!' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset: keyof typeof DEFAULT_PRESETS) => {
    setSettings({
      ...settings,
      ...DEFAULT_PRESETS[preset]
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Game Settings</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Configure the difficulty and behavior of the Christmas ornament catcher game
        </p>
      </div>

      {/* Enable/Disable Game */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white">
            Enable Game
          </label>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Show the "Play Game" button on jukebox banners
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Difficulty Presets */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-900 dark:text-white">
          Quick Presets
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.keys(DEFAULT_PRESETS).map((preset) => (
            <button
              key={preset}
              onClick={() => applyPreset(preset as keyof typeof DEFAULT_PRESETS)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium capitalize"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Advanced Settings</h3>
        
        {/* Initial Speed */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900 dark:text-white">
            Initial Speed: {settings.initialSpeed.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={settings.initialSpeed}
            onChange={(e) => setSettings({ ...settings, initialSpeed: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <p className="text-xs text-gray-600 dark:text-gray-400">
            How fast objects fall at the beginning (0.1 = very slow, 2.0 = very fast)
          </p>
        </div>

        {/* Speed Increase */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900 dark:text-white">
            Speed Increase Per Level: {settings.speedIncrease.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.05"
            value={settings.speedIncrease}
            onChange={(e) => setSettings({ ...settings, speedIncrease: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <p className="text-xs text-gray-600 dark:text-gray-400">
            How much faster objects fall with each difficulty level (0 = no increase, 0.5 = rapid increase)
          </p>
        </div>

        {/* Spawn Interval */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900 dark:text-white">
            Initial Spawn Interval: {settings.spawnInterval}ms
          </label>
          <input
            type="range"
            min="500"
            max="5000"
            step="100"
            value={settings.spawnInterval}
            onChange={(e) => setSettings({ ...settings, spawnInterval: parseInt(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <p className="text-xs text-gray-600 dark:text-gray-400">
            How often new objects spawn at the beginning (500ms = very fast, 5000ms = very slow)
          </p>
        </div>

        {/* Spawn Decrease */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900 dark:text-white">
            Spawn Decrease Per Level: {settings.spawnDecrease}ms
          </label>
          <input
            type="range"
            min="0"
            max="500"
            step="25"
            value={settings.spawnDecrease}
            onChange={(e) => setSettings({ ...settings, spawnDecrease: parseInt(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <p className="text-xs text-gray-600 dark:text-gray-400">
            How much faster objects spawn with each level (0 = no change, 500ms = rapid increase)
          </p>
        </div>

        {/* Minimum Spawn Interval */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900 dark:text-white">
            Minimum Spawn Interval: {settings.minSpawnInterval}ms
          </label>
          <input
            type="range"
            min="200"
            max="2000"
            step="100"
            value={settings.minSpawnInterval}
            onChange={(e) => setSettings({ ...settings, minSpawnInterval: parseInt(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Fastest possible spawn rate at high levels (200ms = insane, 2000ms = manageable)
          </p>
        </div>
      </div>

      {/* Preview Calculation */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">📊 Difficulty Preview</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div>
            <p className="text-blue-700 dark:text-blue-400 font-medium">Level 1 (Score: 0)</p>
            <p className="text-blue-600 dark:text-blue-300">Speed: {settings.initialSpeed.toFixed(2)}</p>
            <p className="text-blue-600 dark:text-blue-300">Spawn: {settings.spawnInterval}ms</p>
          </div>
          <div>
            <p className="text-blue-700 dark:text-blue-400 font-medium">Level 5 (Score: 400)</p>
            <p className="text-blue-600 dark:text-blue-300">Speed: {(settings.initialSpeed + (4 * settings.speedIncrease)).toFixed(2)}</p>
            <p className="text-blue-600 dark:text-blue-300">Spawn: {Math.max(settings.spawnInterval - (4 * settings.spawnDecrease), settings.minSpawnInterval)}ms</p>
          </div>
          <div>
            <p className="text-blue-700 dark:text-blue-400 font-medium">Level 10 (Score: 900)</p>
            <p className="text-blue-600 dark:text-blue-300">Speed: {(settings.initialSpeed + (9 * settings.speedIncrease)).toFixed(2)}</p>
            <p className="text-blue-600 dark:text-blue-300">Spawn: {Math.max(settings.spawnInterval - (9 * settings.spawnDecrease), settings.minSpawnInterval)}ms</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex-1">
          {message && (
            <div
              className={`text-sm ${
                message.type === 'success'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
