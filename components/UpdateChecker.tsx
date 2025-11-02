'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UpdateInfo {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  currentBranch: string;
  changelog: string[];
  lastChecked: string;
}

export default function UpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateLog, setUpdateLog] = useState<string>('');
  const [showLog, setShowLog] = useState(false);

  // Check for updates on mount
  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    setChecking(true);
    setError(null);
    
    try {
      const response = await fetch('/api/system/check-updates');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.details || 'Failed to check for updates');
      }
      
      const data = await response.json();
      setUpdateInfo(data);
    } catch (err: any) {
      console.error('Update check error:', err);
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  const performUpdate = async () => {
    if (!confirm('This will update the application and restart the server. Continue?')) {
      return;
    }
    
    setUpdating(true);
    setError(null);
    setUpdateLog('Starting update process...\n');
    setShowLog(true);
    
    try {
      const response = await fetch('/api/system/update', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUpdateLog((prev) => prev + '\n✅ Update completed successfully!\n');
        setUpdateLog((prev) => prev + (data.output || ''));
        setUpdateLog((prev) => prev + '\n🔄 Server will restart in 5 seconds...\n');
        
        // Reload page after 5 seconds
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      } else {
        throw new Error(data.details || data.error || 'Update failed');
      }
      
    } catch (err: any) {
      console.error('Update error:', err);
      setError(err.message);
      setUpdateLog((prev) => prev + `\n❌ Error: ${err.message}\n`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white">System Updates</h3>
          <p className="text-gray-400 text-sm mt-1">
            Check for and install updates from GitHub
          </p>
        </div>
        <button
          onClick={checkForUpdates}
          disabled={checking || updating}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 
                     rounded-lg text-white font-medium transition-colors"
        >
          {checking ? (
            <>
              <span className="inline-block animate-spin mr-2">⟳</span>
              Checking...
            </>
          ) : (
            'Check for Updates'
          )}
        </button>
      </div>

      {/* Current Version Info */}
      {updateInfo && (
        <div className="mb-4 p-4 bg-gray-900 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Current Version:</span>
              <span className="ml-2 text-white font-mono">{updateInfo.currentVersion}</span>
            </div>
            <div>
              <span className="text-gray-400">Branch:</span>
              <span className="ml-2 text-white font-mono">{updateInfo.currentBranch}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-400">Last Checked:</span>
              <span className="ml-2 text-white">
                {new Date(updateInfo.lastChecked).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Update Available Banner */}
      <AnimatePresence>
        {updateInfo?.updateAvailable && !updating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-4 bg-green-900/20 border border-green-700 rounded-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">🎉</span>
                  <h4 className="text-lg font-semibold text-green-400">
                    Update Available!
                  </h4>
                </div>
                <p className="text-gray-300 mb-3">
                  Version <span className="font-mono">{updateInfo.latestVersion}</span> is available
                </p>
                
                {/* Changelog */}
                {updateInfo.changelog.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-semibold text-gray-400 mb-2">What's New:</h5>
                    <ul className="space-y-1 max-h-48 overflow-y-auto">
                      {updateInfo.changelog.map((change, idx) => (
                        <li key={idx} className="text-sm text-gray-300 font-mono">
                          • {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <button
                onClick={performUpdate}
                disabled={updating}
                className="ml-4 px-6 py-2 bg-green-600 hover:bg-green-700 
                         disabled:bg-gray-600 rounded-lg text-white font-medium 
                         transition-colors whitespace-nowrap"
              >
                {updating ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⟳</span>
                    Updating...
                  </>
                ) : (
                  'Install Update'
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Up to Date */}
      {updateInfo && !updateInfo.updateAvailable && !updating && (
        <div className="mb-4 p-4 bg-gray-900 border border-gray-700 rounded-lg">
          <div className="flex items-center">
            <span className="text-2xl mr-3">✅</span>
            <div>
              <h4 className="font-semibold text-white">You're up to date!</h4>
              <p className="text-sm text-gray-400">
                Running the latest version ({updateInfo.currentVersion})
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Update Log */}
      {showLog && updateLog && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4 p-4 bg-black rounded-lg overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-sm font-semibold text-gray-400">Update Log:</h5>
            <button
              onClick={() => setShowLog(false)}
              className="text-gray-500 hover:text-gray-300"
            >
              ✕
            </button>
          </div>
          <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
            {updateLog}
          </pre>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <div className="flex items-start">
            <span className="text-2xl mr-2">⚠️</span>
            <div>
              <h4 className="font-semibold text-red-400 mb-1">Error</h4>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Update Instructions */}
      <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
        <h5 className="text-sm font-semibold text-gray-400 mb-2">Manual Update</h5>
        <p className="text-sm text-gray-400 mb-3">
          If automatic update fails, run this command on your server:
        </p>
        <code className="block p-3 bg-black rounded text-sm text-green-400 font-mono">
          ./update.sh
        </code>
      </div>
    </div>
  );
}
