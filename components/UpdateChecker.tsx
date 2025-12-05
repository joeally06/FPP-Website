'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { formatDateTime, getUtcNow } from '@/lib/time-utils';
import { AdminH2, AdminH3, AdminH4, AdminText, AdminTextSmall } from './admin/Typography';

interface UpdateStatus {
  status: 'idle' | 'starting' | 'downloading' | 'backing_up' | 'stopping' | 'updating' | 'installing' | 'building' | 'restarting' | 'verifying' | 'completed' | 'error' | 'up_to_date';
  message: string;
  timestamp: string;
  lastCheck?: string;
  currentCommit?: string;
  availableCommit?: string;
  logLines?: string[];
}

export default function UpdateChecker() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [hasUpdates, setHasUpdates] = useState(false);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [commitsAhead, setCommitsAhead] = useState(0);
  const [logOutput, setLogOutput] = useState<string[]>([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [autoReloadCountdown, setAutoReloadCountdown] = useState<number | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const installingRef = useRef<boolean>(false); // Track installing state for callbacks

  // Auto-scroll log output
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logOutput]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Get user-friendly status message
  const getStatusMessage = useCallback((statusStr: string): string => {
    const messages: Record<string, string> = {
      'idle': 'System ready',
      'starting': 'Starting update process...',
      'downloading': 'Downloading latest code from GitHub...',
      'backing_up': 'Backing up database and settings...',
      'stopping': 'Stopping services safely...',
      'updating': 'Pulling code updates...',
      'installing': 'Installing dependencies (npm install)...',
      'building': 'Building application (npm run build)...',
      'restarting': 'Restarting services (PM2)...',
      'verifying': 'Verifying deployment...',
      'completed': 'Update completed successfully! ✅',
      'success': 'Update completed successfully! ✅',
      'up_to_date': 'Already up to date ✅',
      'error': 'Update failed - check logs ❌',
      'failed': 'Update failed - check logs ❌',
    };
    return messages[statusStr] || statusStr;
  }, []);

  // Connect to SSE stream for live updates
  const connectToStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    console.log('[UpdateChecker] Connecting to update stream...');
    const eventSource = new EventSource('/api/admin/update-stream');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[UpdateChecker] Stream connected');
    };

    eventSource.addEventListener('log', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.isInitial) {
          setLogOutput(data.lines || []);
        } else {
          setLogOutput(prev => [...prev, ...(data.lines || [])]);
        }
      } catch (error) {
        console.error('[UpdateChecker] Failed to parse log event:', error);
      }
    });

    eventSource.addEventListener('status', (event) => {
      try {
        const data = JSON.parse(event.data);
        const statusLower = data.status?.toLowerCase() || 'idle';
        
        setStatus(prev => ({
          ...prev,
          status: statusLower as UpdateStatus['status'],
          message: getStatusMessage(statusLower),
          timestamp: data.timestamp || getUtcNow(),
        } as UpdateStatus));
      } catch (error) {
        console.error('[UpdateChecker] Failed to parse status event:', error);
      }
    });

    eventSource.addEventListener('complete', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[UpdateChecker] Update complete:', data);
        
        setInstalling(false);
        installingRef.current = false;
        
        if (data.success) {
          setStatus({
            status: 'completed',
            message: 'Update completed successfully! 🎉',
            timestamp: getUtcNow(),
          });
          
          // Start auto-reload countdown
          setAutoReloadCountdown(5);
          countdownIntervalRef.current = setInterval(() => {
            setAutoReloadCountdown(prev => {
              if (prev === null || prev <= 1) {
                if (countdownIntervalRef.current) {
                  clearInterval(countdownIntervalRef.current);
                }
                window.location.reload();
                return null;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setStatus({
            status: 'error',
            message: 'Update failed - check logs for details',
            timestamp: getUtcNow(),
          });
        }
        
        // Close stream
        eventSource.close();
        eventSourceRef.current = null;
      } catch (error) {
        console.error('[UpdateChecker] Failed to parse complete event:', error);
      }
    });

    eventSource.onerror = () => {
      // If we're installing and lose connection, the server is restarting
      // Use ref instead of state to avoid stale closure issue
      if (installingRef.current) {
        console.log('[UpdateChecker] SSE connection lost during update - server may be restarting');
        eventSource.close();
        eventSourceRef.current = null;
        setReconnecting(true);
        
        // Try to reconnect after a delay
        const attemptReconnect = (attempt: number) => {
          if (attempt > 30) { // Give up after 30 attempts (2.5 minutes)
            setReconnecting(false);
            setInstalling(false);
            installingRef.current = false;
            setStatus({
              status: 'completed',
              message: 'Update likely completed - please refresh the page',
              timestamp: getUtcNow(),
            });
            return;
          }
          
          setReconnectAttempt(attempt);
          
          // Try to fetch the status endpoint to see if server is back
          fetch('/api/admin/update-status', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
              const serverStatus = (data.status || '').toLowerCase();
              console.log('[UpdateChecker] Reconnect attempt', attempt, '- server status:', serverStatus);
              
              // Check for all completion states (completed, success, up_to_date)
              if (serverStatus === 'completed' || serverStatus === 'success' || serverStatus === 'up_to_date') {
                // Update completed!
                setReconnecting(false);
                setInstalling(false);
                installingRef.current = false;
                setStatus({
                  status: serverStatus === 'up_to_date' ? 'up_to_date' : 'completed',
                  message: serverStatus === 'up_to_date' 
                    ? 'Already up to date - no changes needed! ✅' 
                    : 'Update completed successfully! 🎉',
                  timestamp: getUtcNow(),
                });
                
                // Start auto-reload countdown
                setAutoReloadCountdown(5);
                countdownIntervalRef.current = setInterval(() => {
                  setAutoReloadCountdown(prev => {
                    if (prev === null || prev <= 1) {
                      if (countdownIntervalRef.current) {
                        clearInterval(countdownIntervalRef.current);
                      }
                      window.location.reload();
                      return null;
                    }
                    return prev - 1;
                  });
                }, 1000);
              } else if (serverStatus === 'failed' || serverStatus === 'error') {
                // Update failed
                setReconnecting(false);
                setInstalling(false);
                installingRef.current = false;
                setStatus({
                  status: 'error',
                  message: 'Update failed - check logs for details',
                  timestamp: getUtcNow(),
                });
              } else if (serverStatus === 'idle') {
                // Server came back but status is idle - update likely completed
                // This can happen if status file was cleared or server restarted cleanly
                console.log('[UpdateChecker] Server returned idle status - assuming update completed');
                setReconnecting(false);
                setInstalling(false);
                installingRef.current = false;
                setStatus({
                  status: 'completed',
                  message: 'Update completed - server restarted successfully! 🎉',
                  timestamp: getUtcNow(),
                });
                
                // Start auto-reload countdown
                setAutoReloadCountdown(5);
                countdownIntervalRef.current = setInterval(() => {
                  setAutoReloadCountdown(prev => {
                    if (prev === null || prev <= 1) {
                      if (countdownIntervalRef.current) {
                        clearInterval(countdownIntervalRef.current);
                      }
                      window.location.reload();
                      return null;
                    }
                    return prev - 1;
                  });
                }, 1000);
              } else {
                // Still in progress or unknown, try again
                reconnectTimeoutRef.current = setTimeout(() => attemptReconnect(attempt + 1), 5000);
              }
            })
            .catch(() => {
              // Server not responding yet, try again
              reconnectTimeoutRef.current = setTimeout(() => attemptReconnect(attempt + 1), 5000);
            });
        };
        
        // Wait 10 seconds before first reconnect attempt (server needs time to restart)
        reconnectTimeoutRef.current = setTimeout(() => attemptReconnect(1), 10000);
      } else {
        // Not installing, just close quietly
        eventSource.close();
        eventSourceRef.current = null;
      }
    };
  }, [installing, getStatusMessage]);

  // Fetch current update status
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/update-status', {
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        
        if (data.currentCommit && data.availableCommit) {
          setHasUpdates(data.currentCommit !== data.availableCommit);
        }

        if (data.logLines) {
          setLogOutput(data.logLines);
        }
      }
    } catch (error) {
      console.error('[UpdateChecker] Failed to fetch status:', error);
    }
  };

  // Check for updates
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
        
        setStatus({
          status: data.hasUpdates ? 'idle' : 'up_to_date',
          message: data.hasUpdates 
            ? `🎉 ${data.commitsAhead} new update${data.commitsAhead > 1 ? 's' : ''} available!` 
            : '✅ Your system is up to date',
          timestamp: getUtcNow(),
          lastCheck: getUtcNow(),
          currentCommit: data.currentCommit,
          availableCommit: data.remoteCommit
        });
      }
    } catch (error) {
      console.error('[UpdateChecker] Failed to check for updates:', error);
      setStatus({
        status: 'error',
        message: '❌ Failed to check for updates',
        timestamp: getUtcNow()
      });
    } finally {
      setChecking(false);
    }
  };

  // Install update
  const installUpdate = async () => {
    if (!confirm(
      '⚠️  System Update\n\n' +
      'This will:\n' +
      '1. Stop services and backup data\n' +
      '2. Download latest code from GitHub\n' +
      '3. Install dependencies and rebuild\n' +
      '4. Restart services\n\n' +
      'Expected downtime: 2-3 minutes\n' +
      'You\'ll see live progress below.\n\n' +
      'Continue?'
    )) {
      return;
    }

    setInstalling(true);
    installingRef.current = true;
    setShowTerminal(true);
    setLogOutput(['🚀 Starting update...', '']);

    try {
      const response = await fetch('/api/admin/update-install', {
        method: 'POST',
        cache: 'no-store'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus({
          status: 'starting',
          message: 'Update started - monitoring progress...',
          timestamp: getUtcNow()
        });
        
        // Connect to SSE stream for live updates
        connectToStream();
      } else {
        setStatus({
          status: 'error',
          message: data.error || 'Failed to start update',
          timestamp: getUtcNow()
        });
        setInstalling(false);
        installingRef.current = false;
      }
    } catch (error) {
      console.error('[UpdateChecker] Failed to install update:', error);
      setStatus({
        status: 'error',
        message: '❌ Failed to start update',
        timestamp: getUtcNow()
      });
      setInstalling(false);
      installingRef.current = false;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchStatus();
    checkForUpdates();
  }, []);

  // Get status display
  const getStatusDisplay = () => {
    if (!status) return { color: 'gray', icon: '⏳', text: 'Loading...' };
    
    const displays: Record<string, { color: string; icon: string; text: string }> = {
      'starting': { color: 'blue', icon: '🚀', text: 'Starting update...' },
      'downloading': { color: 'blue', icon: '📥', text: 'Downloading...' },
      'backing_up': { color: 'yellow', icon: '💾', text: 'Backing up...' },
      'stopping': { color: 'yellow', icon: '⏹️', text: 'Stopping services...' },
      'updating': { color: 'blue', icon: '🔄', text: 'Updating code...' },
      'installing': { color: 'yellow', icon: '📦', text: 'Installing deps...' },
      'building': { color: 'yellow', icon: '🔨', text: 'Building...' },
      'restarting': { color: 'yellow', icon: '♻️', text: 'Restarting...' },
      'verifying': { color: 'blue', icon: '✔️', text: 'Verifying...' },
      'completed': { color: 'green', icon: '✅', text: 'Complete!' },
      'up_to_date': { color: 'green', icon: '✅', text: 'Up to date' },
      'error': { color: 'red', icon: '❌', text: 'Failed' },
      'idle': { color: 'gray', icon: '⏸️', text: 'Idle' },
    };
    
    return displays[status.status] || { color: 'gray', icon: '⏸️', text: 'Idle' };
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

      {/* Update Available Banner */}
      {hasUpdates && !isUpdating && !installing && (
        <div className="p-6 bg-linear-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border-2 border-yellow-500/50">
          <div className="flex items-center gap-4">
            <span className="text-5xl">🚀</span>
            <div className="flex-1">
              <AdminH3 className="text-yellow-300 mb-1">
                Update Available!
              </AdminH3>
              <AdminTextSmall className="text-white/90">
                {commitsAhead} new update{commitsAhead > 1 ? 's' : ''} ready to install.
              </AdminTextSmall>
            </div>
            <button
              onClick={installUpdate}
              disabled={installing}
              className="px-8 py-4 bg-linear-to-r from-green-500 to-emerald-600 text-white text-xl font-bold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-2xl hover:shadow-green-500/50 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Install Now →
            </button>
          </div>
        </div>
      )}

      {/* Auto-reload Countdown */}
      {autoReloadCountdown !== null && (
        <div className="p-6 bg-linear-to-r from-green-500/30 to-emerald-500/30 rounded-xl border-2 border-green-500/50 text-center">
          <span className="text-4xl">✅</span>
          <AdminH3 className="text-green-300 mt-2">Update Complete!</AdminH3>
          <AdminText className="text-white mt-2">
            Page will reload in <span className="font-bold text-2xl text-green-400">{autoReloadCountdown}</span> seconds...
          </AdminText>
        </div>
      )}

      {/* Reconnecting Banner */}
      {reconnecting && (
        <div className="p-6 bg-linear-to-r from-blue-500/30 to-cyan-500/30 rounded-xl border-2 border-blue-500/50 text-center">
          <span className="text-4xl animate-spin inline-block">🔄</span>
          <AdminH3 className="text-blue-300 mt-2">Server Restarting...</AdminH3>
          <AdminText className="text-white mt-2">
            Reconnecting to server (attempt {reconnectAttempt}/30)...
          </AdminText>
          <AdminTextSmall className="text-white/60 mt-2">
            The update is completing. This page will refresh automatically when ready.
          </AdminTextSmall>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-blue-500/50 hover:bg-blue-500/70 text-white rounded-lg transition-all"
          >
            Refresh Now
          </button>
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
              Last checked: {formatDateTime(status.lastCheck, 'short')}
            </AdminTextSmall>
          )}
        </div>

        {/* Progress indicator */}
        {isUpdating && (
          <div className="mt-4">
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
              <div className="bg-linear-to-r from-blue-500 to-cyan-500 h-full rounded-full animate-pulse" style={{ width: '100%' }} />
            </div>
            <AdminTextSmall className="mt-2 text-center text-white/80">
              Please wait... Do not close this page.
            </AdminTextSmall>
          </div>
        )}

        {/* Commit info */}
        {status?.currentCommit && status?.availableCommit && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 bg-white/5 rounded-lg">
              <AdminTextSmall className="text-white/60 mb-1">Current</AdminTextSmall>
              <code className="text-white font-mono text-sm">
                {status.currentCommit.substring(0, 7)}
              </code>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <AdminTextSmall className="text-white/60 mb-1">Latest</AdminTextSmall>
              <code className="text-white font-mono text-sm">
                {status.availableCommit.substring(0, 7)}
              </code>
            </div>
          </div>
        )}
      </div>

      {/* Live Terminal Output */}
      {(showTerminal || logOutput.length > 0) && (
        <div className="rounded-xl border-2 border-white/20 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-black/50 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="text-white/70 text-sm font-mono ml-2">update.log</span>
            </div>
            {!isUpdating && (
              <button
                onClick={() => {
                  setShowTerminal(false);
                  setLogOutput([]);
                }}
                className="text-white/50 hover:text-white/80 text-sm"
              >
                Clear
              </button>
            )}
          </div>
          <div 
            ref={logContainerRef}
            className="bg-black/70 p-4 h-64 overflow-y-auto font-mono text-sm"
          >
            {logOutput.map((line, idx) => (
              <div 
                key={idx} 
                className={`${
                  line.includes('✅') || line.includes('SUCCESS') ? 'text-green-400' :
                  line.includes('❌') || line.includes('ERROR') || line.includes('FAILED') ? 'text-red-400' :
                  line.includes('⚠️') || line.includes('WARNING') ? 'text-yellow-400' :
                  line.includes('🚀') || line.includes('🔄') ? 'text-blue-400' :
                  'text-green-400/80'
                }`}
                style={{ textShadow: '0 0 5px rgba(34, 197, 94, 0.3)' }}
              >
                {line || '\u00A0'}
              </div>
            ))}
            {isUpdating && (
              <div className="text-green-400 animate-pulse">▊</div>
            )}
          </div>
        </div>
      )}

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
            className="flex-1 px-6 py-3 bg-linear-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {installing ? '⏳ Starting...' : '🚀 Install Update'}
          </button>
        )}
      </div>

      {/* Update Process Info */}
      <div className="p-4 bg-purple-500/20 rounded-lg border border-purple-500/30">
        <AdminH4 className="flex items-center gap-2 mb-3">
          <span>📋</span> Update Process
        </AdminH4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {['Check', 'Download', 'Install', 'Build', 'Restart'].map((step, idx) => (
            <div key={step} className="flex items-center gap-1 text-purple-100/80">
              <span className="text-purple-300">{idx + 1}.</span>
              <AdminTextSmall>{step}</AdminTextSmall>
            </div>
          ))}
        </div>
      </div>

      {/* Safety Info */}
      <div className="p-4 bg-amber-500/20 rounded-lg border border-amber-500/30">
        <AdminH4 className="flex items-center gap-2 mb-2">
          <span>🛡️</span> Update Safety
        </AdminH4>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
          <li><AdminTextSmall className="text-amber-100">✅ Database preserved</AdminTextSmall></li>
          <li><AdminTextSmall className="text-amber-100">✅ Settings unchanged</AdminTextSmall></li>
          <li><AdminTextSmall className="text-amber-100">✅ Auto-rollback on failure</AdminTextSmall></li>
          <li><AdminTextSmall className="text-amber-100">✅ ~2-3 min downtime</AdminTextSmall></li>
        </ul>
      </div>

      {/* Manual fallback */}
      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
        <AdminText className="text-white/80 text-sm">
          <strong>💡 Manual Update:</strong> SSH to server and run{' '}
          <code className="px-2 py-1 bg-black/30 rounded font-mono">./scripts/update-daemon.sh</code>
        </AdminText>
      </div>
    </div>
  );
}