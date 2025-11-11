'use client';

import { useState, useEffect } from 'react';
import { AdminH2, AdminH3, AdminH4, AdminText, AdminWarning, AdminSuccess, AdminTextSmall } from './admin/Typography';

interface UpdateStatus {
  status: 'idle' | 'starting' | 'downloading' | 'backing_up' | 'stopping' | 'updating' | 'installing' | 'building' | 'restarting' | 'verifying' | 'completed' | 'error' | 'up_to_date';
  message: string;
  timestamp: string;
  lastCheck?: string;
  currentCommit?: string;
  availableCommit?: string;
  logLines?: string[];
}

interface UpdateCheckerProps {
  onInstallClick?: () => void;
}

export default function UpdateChecker({ onInstallClick }: UpdateCheckerProps) {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [hasUpdates, setHasUpdates] = useState(false);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [commitsAhead, setCommitsAhead] = useState(0);

  // Fetch current update status from the server
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/update-status', {
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        
        // Check if updates are available
        if (data.currentCommit && data.availableCommit) {
          const updatesAvailable = data.currentCommit !== data.availableCommit;
          setHasUpdates(updatesAvailable);
        }

        // If update completed, reload page in 3 seconds
        if (data.status === 'completed' && installing) {
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        }
      }
    } catch (error) {
      console.error('[UpdateChecker] Failed to fetch status:', error);
    }
  };

  // Check for updates manually
  const checkForUpdates = async () => {
    setChecking(true);

    try {
      const response = await fetch('/api/admin/update-check', {
        method: 'POST',
        cache: 'no-store'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setHasUpdates(data.hasUpdates);
        setCommitsAhead(data.commitsAhead || 0);
        
        // Update status with commit info
        setStatus({
          status: data.hasUpdates ? 'idle' : 'up_to_date',
          message: data.hasUpdates 
            ? `🎉 ${data.commitsAhead} new update${data.commitsAhead > 1 ? 's' : ''} available!` 
            : '✅ Your system is up to date',
          timestamp: new Date().toISOString(),
          lastCheck: new Date().toISOString(),
          currentCommit: data.currentCommit,
          availableCommit: data.remoteCommit
        });
      }
    } catch (error) {
      console.error('[UpdateChecker] Failed to check for updates:', error);
      setStatus({
        status: 'error',
        message: '❌ Failed to check for updates',
        timestamp: new Date().toISOString()
      });
    } finally {
      setChecking(false);
    }
  };

  // Trigger update installation
  const installUpdate = async () => {
    if (!confirm(
      '⚠️  IMPORTANT: System Update Process\n\n' +
      'This update will:\n' +
      '1. Stop PM2 services (safely closes database)\n' +
      '2. Backup your database and configuration\n' +
      '3. Pull latest code from GitHub\n' +
      '4. Update dependencies (npm install)\n' +
      '5. Rebuild the application (npm run build)\n' +
      '6. Restart PM2 services\n\n' +
      'Expected downtime: 2-3 minutes\n' +
      'This page will track progress in real-time.\n\n' +
      '✅ Database safely closed and backed up\n' +
      '✅ Automatic rollback if anything fails\n\n' +
      'Continue with update?'
    )) {
      return;
    }

    setInstalling(true);
    
    // Open live update modal if provided
    if (onInstallClick) {
      onInstallClick();
    }

    try {
      const response = await fetch('/api/admin/update-install', {
        method: 'POST',
        cache: 'no-store'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus({
          status: 'starting',
          message: '🚀 Update started! Monitoring progress...',
          timestamp: new Date().toISOString()
        });
      } else {
        setStatus({
          status: 'error',
          message: '❌ Failed to start update',
          timestamp: new Date().toISOString()
        });
        setInstalling(false);
      }
    } catch (error) {
      console.error('[UpdateChecker] Failed to install update:', error);
      setStatus({
        status: 'error',
        message: '❌ Failed to install update',
        timestamp: new Date().toISOString()
      });
      setInstalling(false);
    }
  };

  // Auto-fetch status on mount and every 30 seconds
  useEffect(() => {
    fetchStatus();
    checkForUpdates(); // Also check for updates on mount
    
    const statusInterval = setInterval(fetchStatus, 30000); // 30 seconds
    
    return () => clearInterval(statusInterval);
  }, []);

  // Poll more frequently when installing
  useEffect(() => {
    if (!installing) return;

    const pollInterval = setInterval(fetchStatus, 2000);
    
    return () => clearInterval(pollInterval);
  }, [installing]);

  // Get status color and icon
  const getStatusDisplay = () => {
    if (!status) return { color: 'gray', icon: '⏳', text: 'Loading...' };
    
    switch (status.status) {
      case 'starting':
        return { color: 'blue', icon: '🚀', text: 'Starting update...' };
      case 'downloading':
        return { color: 'blue', icon: '📥', text: 'Downloading from GitHub...' };
      case 'backing_up':
        return { color: 'yellow', icon: '💾', text: 'Backing up database...' };
      case 'stopping':
        return { color: 'yellow', icon: '⏹️', text: 'Stopping services...' };
      case 'updating':
        return { color: 'blue', icon: '🔄', text: 'Pulling code updates...' };
      case 'installing':
        return { color: 'yellow', icon: '📦', text: 'Installing dependencies...' };
      case 'building':
        return { color: 'yellow', icon: '🔨', text: 'Building application...' };
      case 'restarting':
        return { color: 'yellow', icon: '♻️', text: 'Restarting services...' };
      case 'verifying':
        return { color: 'blue', icon: '✔️', text: 'Verifying deployment...' };
      case 'completed':
        return { color: 'green', icon: '✅', text: 'Update completed!' };
      case 'up_to_date':
        return { color: 'green', icon: '✅', text: 'System up to date' };
      case 'error':
        return { color: 'red', icon: '❌', text: 'Update failed' };
      default:
        return { color: 'gray', icon: '⏸️', text: 'Idle' };
    }
  };

  const statusDisplay = getStatusDisplay();
  const isUpdating = ['starting', 'downloading', 'backing_up', 'stopping', 'updating', 'installing', 'building', 'restarting', 'verifying'].includes(status?.status || '');

  return (
    <div className="space-y-6">
      <div>
        <AdminH2>🔄 System Updates</AdminH2>
        <AdminTextSmall>
          Keep your FPP Control Center up to date with the latest features and fixes
        </AdminTextSmall>
      </div>

      {/* Prominent Update Available Banner */}
      {hasUpdates && !isUpdating && (
        <div className="p-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border-2 border-yellow-500/50 animate-pulse">
          <div className="flex items-center gap-4">
            <span className="text-5xl">🚀</span>
            <div className="flex-1">
              <AdminH3 className="text-yellow-300 mb-1">
                Update Available!
              </AdminH3>
              <AdminTextSmall className="text-white/90">
                {commitsAhead} new update{commitsAhead > 1 ? 's' : ''} ready to install. Click the button to update now.
              </AdminTextSmall>
            </div>
            <button
              onClick={installUpdate}
              disabled={installing}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xl font-bold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-2xl hover:shadow-green-500/50 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {installing ? '⏳ Starting...' : 'Install Now →'}
            </button>
          </div>
        </div>
      )}

      {/* Current Status Card */}
      <div className={`p-6 rounded-xl border-2 ${
        statusDisplay.color === 'green' ? 'bg-green-500/20 border-green-500/50' :
        statusDisplay.color === 'yellow' ? 'bg-yellow-500/20 border-yellow-500/50' :
        statusDisplay.color === 'blue' ? 'bg-blue-500/20 border-blue-500/50' :
        statusDisplay.color === 'red' ? 'bg-red-500/20 border-red-500/50' :
        'bg-white/10 border-white/20'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{statusDisplay.icon}</span>
            <div>
              <AdminH3 className="mb-1">{statusDisplay.text}</AdminH3>
              <AdminTextSmall className="text-white/80">
                {status?.message || 'No status available'}
              </AdminTextSmall>
            </div>
          </div>
          
          {status?.lastCheck && (
            <AdminTextSmall className="text-white/60">
              Last checked: {new Date(status.lastCheck).toLocaleTimeString()}
            </AdminTextSmall>
          )}
        </div>

        {/* Progress indicator for active updates */}
        {isUpdating && (
          <div className="mt-4">
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full animate-pulse" style={{ width: '100%' }} />
            </div>
            <AdminTextSmall className="mt-2 text-center text-white/80">
              Please wait... This may take 2-3 minutes
            </AdminTextSmall>
          </div>
        )}

        {/* Log lines */}
        {status?.logLines && status.logLines.length > 0 && (
          <div className="mt-4 p-3 bg-black/30 rounded-lg border border-white/10 max-h-40 overflow-y-auto">
            <AdminTextSmall className="font-mono text-white/70">
              {status.logLines.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </AdminTextSmall>
          </div>
        )}

        {/* Commit info */}
        {status?.currentCommit && status?.availableCommit && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 bg-white/5 rounded-lg">
              <AdminTextSmall className="text-white/60 mb-1">Current Version</AdminTextSmall>
              <code className="text-white font-mono text-sm">
                {status.currentCommit.substring(0, 7)}
              </code>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <AdminTextSmall className="text-white/60 mb-1">Latest Version</AdminTextSmall>
              <code className="text-white font-mono text-sm">
                {status.availableCommit.substring(0, 7)}
              </code>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={checkForUpdates}
          disabled={checking || isUpdating}
          className="flex-1 px-6 py-3 bg-blue-500/80 hover:bg-blue-600 text-white rounded-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {checking ? '🔄 Checking...' : '🔍 Check for Updates'}
        </button>
        
        {hasUpdates && !isUpdating && (
          <button
            onClick={installUpdate}
            disabled={installing}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {installing ? '⏳ Starting...' : '🚀 Install Update'}
          </button>
        )}
      </div>

      {/* Automatic Update Schedule Info */}
      <div className="p-4 bg-green-500/20 rounded-lg border border-green-500/30">
        <AdminSuccess className="font-semibold mb-2">✅ Automatic Update Schedule</AdminSuccess>
        <AdminTextSmall className="text-green-100">
          The update daemon runs automatically <strong>every 6 hours</strong> (12am, 6am, 12pm, 6pm) via PM2 cron. 
          It checks GitHub for new commits and safely updates if available. You can also trigger updates manually 
          using the button above or by clicking "Install Update" when available.
        </AdminTextSmall>
        <AdminTextSmall className="mt-2 text-green-100/80">
          💡 <em>Note:</em> If logs show "Already up to date", this means you already have the latest version - the system is working correctly!
        </AdminTextSmall>
      </div>

      {/* Update Process Info */}
      <div className="p-4 bg-purple-500/20 rounded-lg border border-purple-500/30">
        <AdminH4 className="flex items-center gap-2 mb-3">
          <span>📋</span> Update Process
        </AdminH4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-purple-300">1️⃣</span>
            <AdminTextSmall className="text-purple-100">
              <strong>Check:</strong> Compare local code with GitHub master branch
            </AdminTextSmall>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-300">2️⃣</span>
            <AdminTextSmall className="text-purple-100">
              <strong>Download:</strong> Pull latest code from GitHub (git pull)
            </AdminTextSmall>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-300">3️⃣</span>
            <AdminTextSmall className="text-purple-100">
              <strong>Install:</strong> Update dependencies (npm install)
            </AdminTextSmall>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-300">4️⃣</span>
            <AdminTextSmall className="text-purple-100">
              <strong>Build:</strong> Compile application (npm run build)
            </AdminTextSmall>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-300">5️⃣</span>
            <AdminTextSmall className="text-purple-100">
              <strong>Restart:</strong> Reload services (pm2 restart)
            </AdminTextSmall>
          </div>
        </div>
      </div>

      {/* Safety Info */}
      <div className="p-4 bg-amber-500/20 rounded-lg border border-amber-500/30">
        <AdminH4 className="flex items-center gap-2 mb-2">
          <span>🛡️</span> Update Safety
        </AdminH4>
        <ul className="space-y-1">
          <li><AdminTextSmall className="text-amber-100">✅ All data is preserved (database not affected)</AdminTextSmall></li>
          <li><AdminTextSmall className="text-amber-100">✅ Settings remain unchanged</AdminTextSmall></li>
          <li><AdminTextSmall className="text-amber-100">✅ Only code and dependencies are updated</AdminTextSmall></li>
          <li><AdminTextSmall className="text-amber-100">✅ Automatic rollback if build fails</AdminTextSmall></li>
          <li><AdminTextSmall className="text-amber-100">✅ ~2-3 minute downtime during update</AdminTextSmall></li>
        </ul>
      </div>

      {/* Manual fallback */}
      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
        <AdminText className="text-white/80 text-sm">
          <strong>💡 Manual Update:</strong> SSH to server and run <code className="px-2 py-1 bg-black/30 rounded font-mono">./scripts/run-update.sh</code>
        </AdminText>
        <AdminTextSmall className="mt-2 text-white/60">
          For the safest updates during busy periods, use manual SSH method.
        </AdminTextSmall>
      </div>
    </div>
  );
}