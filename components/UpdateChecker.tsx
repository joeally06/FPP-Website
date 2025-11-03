'use client';

import { useState, useEffect } from 'react';
import { AdminH2, AdminText, AdminWarning, AdminSuccess, AdminTextSmall } from './admin/Typography';

export default function UpdateChecker() {
  const [checking, setChecking] = useState(false);
  const [hasUpdates, setHasUpdates] = useState(false);
  const [commits, setCommits] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const checkForUpdates = async () => {
    setChecking(true);
    setMessage('');

    try {
      const response = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' }),
      });

      const data = await response.json();

      if (data.success) {
        setHasUpdates(data.hasUpdates);
        setCommits(data.commits || []);
        
        if (data.hasUpdates) {
          setMessage('🎉 Updates available!');
        } else {
          setMessage('✅ You are running the latest version');
        }
      } else {
        setMessage(`❌ Failed to check: ${data.error}`);
      }
    } catch (error) {
      console.error('Update check error:', error);
      setMessage('❌ Failed to check for updates');
    } finally {
      setChecking(false);
    }
  };

  const triggerUpdate = async () => {
    if (!confirm(
      '⚠️ This will:\n\n' +
      '1. Stop the server (brief downtime)\n' +
      '2. Safely close database\n' +
      '3. Backup database\n' +
      '4. Pull latest code\n' +
      '5. Update dependencies\n' +
      '6. Run database migrations\n' +
      '7. Restart the server\n\n' +
      'Expected downtime: 2-3 minutes\n' +
      'The page will reload automatically when complete.\n\n' +
      'Continue?'
    )) {
      return;
    }

    setIsUpdating(true);
    setMessage('⏳ Update scheduled... Server will restart in ~30 seconds');

    try {
      const response = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger' }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('🔄 Update in progress... Server stopping in 30 seconds...');
        setHasUpdates(false);
        
        // Start polling to detect when server is back
        setTimeout(() => {
          setMessage('🔄 Server updating... Checking for completion...');
          
          const pollInterval = setInterval(async () => {
            try {
              const pingResponse = await fetch('/api/health');
              if (pingResponse.ok) {
                clearInterval(pollInterval);
                setMessage('✅ Update complete! Reloading page...');
                setTimeout(() => window.location.reload(), 2000);
              }
            } catch {
              // Server still down, keep polling
              console.log('Server still updating...');
            }
          }, 5000); // Check every 5 seconds

          // Timeout after 10 minutes
          setTimeout(() => {
            clearInterval(pollInterval);
            setMessage('⚠️ Update taking longer than expected. Please refresh manually or check server logs.');
            setIsUpdating(false);
          }, 10 * 60 * 1000);
          
        }, 30000); // Start checking after 30 seconds
        
      } else {
        setMessage(`❌ Failed to trigger update: ${data.error}`);
        setIsUpdating(false);
      }
    } catch (error) {
      console.error('Update trigger error:', error);
      setMessage('❌ Failed to trigger update');
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <AdminH2>🔄 System Updates</AdminH2>

      {message && (
        <div className={`p-4 rounded-lg border ${
          message.includes('❌') 
            ? 'bg-red-500/20 border-red-500/30' 
            : message.includes('⏳') || message.includes('🔄')
            ? 'bg-blue-500/20 border-blue-500/30'
            : message.includes('⚠️')
            ? 'bg-amber-500/20 border-amber-500/30'
            : 'bg-green-500/20 border-green-500/30'
        }`}>
          <AdminText className="text-white">{message}</AdminText>
        </div>
      )}

      {hasUpdates && commits.length > 0 && (
        <div className="p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
          <AdminText className="font-semibold text-white mb-2">Recent Changes:</AdminText>
          <ul className="space-y-1">
            {commits.map((commit, index) => (
              <li key={index} className="text-sm text-white/80 font-mono">
                • {commit}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Safety Warning */}
      <div className="p-4 bg-amber-500/20 rounded-lg border border-amber-500/30">
        <AdminWarning className="font-semibold mb-2">⚠️ Database-Safe Update Process</AdminWarning>
        <ul className="space-y-1">
          <li><AdminTextSmall className="text-amber-100">• Server stops completely (closes database safely)</AdminTextSmall></li>
          <li><AdminTextSmall className="text-amber-100">• Database backed up before any changes</AdminTextSmall></li>
          <li><AdminTextSmall className="text-amber-100">• No risk of corruption during update</AdminTextSmall></li>
          <li><AdminTextSmall className="text-amber-100">• Automatic rollback on failure</AdminTextSmall></li>
          <li><AdminTextSmall className="text-amber-100">• Expected downtime: 2-3 minutes</AdminTextSmall></li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={checkForUpdates}
          disabled={checking || isUpdating}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {checking ? '⏳ Checking...' : '🔍 Check for Updates'}
        </button>

        {hasUpdates && !isUpdating && (
          <button
            onClick={triggerUpdate}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-semibold animate-pulse"
          >
            📥 Install Update
          </button>
        )}

        {isUpdating && (
          <div className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            Updating...
          </div>
        )}
      </div>

      {/* Manual fallback */}
      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
        <AdminText className="text-white/80 text-sm">
          <strong>💡 Manual Update:</strong> SSH to server and run <code className="px-2 py-1 bg-black/30 rounded font-mono">./update.sh</code>
        </AdminText>
        <AdminTextSmall className="mt-2 text-white/60">
          For the safest updates during busy periods, use manual SSH method.
        </AdminTextSmall>
      </div>

      {/* Update Watcher Status */}
      <div className="p-4 bg-green-500/20 rounded-lg border border-green-500/30">
        <AdminSuccess className="font-semibold mb-2">✅ Update Watcher Service</AdminSuccess>
        <AdminTextSmall className="text-green-100">
          The update watcher monitors for update requests every 30 seconds. When you click "Install Update", the watcher safely stops the server, closes the database, and runs the full update process automatically.
        </AdminTextSmall>
      </div>
    </div>
  );
}