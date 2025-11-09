'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import PlaylistControls from '@/components/PlaylistControls';
import { useFPPConnection } from '@/contexts/FPPConnectionContext';

interface Status {
  status_name: string;
  current_playlist: { playlist: string; count: string; index: string };
  current_sequence: string;
  volume: number;
  mode_name: string;
}

export default function Home() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status: sessionStatus } = useSession();
  const { isOnline } = useFPPConnection();
  const isAdmin = session?.user?.role === 'admin';
  const router = useRouter();

  // Redirect non-admins to jukebox page
  useEffect(() => {
    if (sessionStatus !== 'loading' && !isAdmin) {
      router.push('/jukebox');
    }
  }, [isAdmin, sessionStatus, router]);

  useEffect(() => {
    const fetchStatus = async () => {
      // Skip if FPP is offline
      if (!isOnline) {
        return;
      }

      try {
        const response = await fetch('/api/fppd/status');
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
          setError(null);
        } else {
          setError('Failed to fetch FPP status');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    if (isAdmin) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, isOnline]);

  // Show loading while checking authentication
  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // Non-admins will be redirected
  if (!isAdmin) {
    return null;
  }

  const getStatusColor = (statusName: string) => {
    if (statusName === 'playing') return 'from-green-500 to-emerald-600';
    if (statusName === 'idle') return 'from-blue-500 to-cyan-600';
    if (statusName === 'stopped') return 'from-gray-500 to-slate-600';
    return 'from-purple-500 to-pink-600';
  };

  return (
    <AdminLayout 
      title="🎮 FPP Control Center" 
      subtitle="Monitor and control your Falcon Player"
    >
      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className={`backdrop-blur-md bg-gradient-to-br ${status && isOnline ? getStatusColor(status.status_name) : 'from-gray-500 to-slate-600'} rounded-xl p-6 shadow-2xl border border-white/20 transform transition-all hover:scale-105`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">Status</span>
            <span className="text-3xl">🎯</span>
          </div>
          <p className="text-3xl font-bold text-white capitalize">
            {!isOnline ? 'Offline' : (status?.status_name || '...')}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${!isOnline ? 'bg-amber-400 animate-pulse' : (status?.status_name === 'playing' ? 'bg-green-400 animate-pulse' : 'bg-white/50')}`}></div>
            <span className="text-xs text-white/70">{!isOnline ? 'FPP Disconnected' : 'Live Status'}</span>
          </div>
        </div>

        <div className="backdrop-blur-md bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl p-6 shadow-2xl border border-white/20 transform transition-all hover:scale-105">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">Mode</span>
            <span className="text-3xl">⚙️</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {!isOnline ? 'N/A' : (status?.mode_name || '...')}
          </p>
        </div>

        <div className="backdrop-blur-md bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-6 shadow-2xl border border-white/20 transform transition-all hover:scale-105">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">Playlist</span>
            <span className="text-3xl">📋</span>
          </div>
          <p className="text-xl font-bold text-white truncate">
            {!isOnline ? 'Offline' : (status?.current_playlist?.playlist || 'None')}
          </p>
          {status?.current_playlist?.index && isOnline && (
            <p className="text-sm text-white/70 mt-1">
              Track {status.current_playlist.index} of {status.current_playlist.count}
            </p>
          )}
        </div>

        <div className="backdrop-blur-md bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl p-6 shadow-2xl border border-white/20 transform transition-all hover:scale-105">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">Volume</span>
            <span className="text-3xl">🔊</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {!isOnline ? '--' : (status?.volume || 0)}%
          </p>
        </div>
      </div>

      {/* Now Playing Card */}
      {status?.current_sequence && (
        <div className="backdrop-blur-md bg-white/10 rounded-xl p-8 shadow-2xl border border-white/20 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-2xl">▶️</span>
            </div>
            <div>
              <h2 className="text-sm text-white/70">Now Playing</h2>
              <p className="text-2xl font-bold text-white">{status.current_sequence}</p>
            </div>
          </div>
        </div>
      )}

      {/* Volume Control */}
      {status && (
        <div className="backdrop-blur-md bg-white/10 rounded-xl p-8 shadow-2xl border border-white/20 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-4xl">🎚️</span>
            <div>
              <h2 className="text-2xl font-bold text-white">Volume Control</h2>
              <p className="text-white/70">
                {!isOnline ? 'Unavailable - FPP Offline' : 'Adjust the system volume'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <span className="text-white/70">🔇</span>
            <input
              type="range"
              min="0"
              max="100"
              value={status.volume}
              disabled={!isOnline}
              onChange={async (e) => {
                if (!isOnline) return;
                const vol = parseInt(e.target.value);
                try {
                  await fetch(`/api/web/system/volume`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ volume: vol })
                  });
                  setStatus({ ...status, volume: vol });
                } catch (err) {
                  alert('Failed to set volume');
                }
              }}
              className={`flex-1 h-3 bg-white/20 rounded-full appearance-none slider ${
                !isOnline ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
              style={{
                background: isOnline 
                  ? `linear-gradient(to right, #10b981 0%, #10b981 ${status.volume}%, rgba(255,255,255,0.2) ${status.volume}%, rgba(255,255,255,0.2) 100%)`
                  : 'rgba(255,255,255,0.1)'
              }}
            />
            <span className="text-white/70">🔊</span>
            <span className="text-2xl font-bold text-white w-16 text-right">
              {!isOnline ? '--' : status.volume}%
            </span>
          </div>
        </div>
      )}

      {/* Playlist & Sequence Controls */}
      <div className="mb-8">
        <PlaylistControls />
      </div>

      {/* Quick Actions */}
      <div className="backdrop-blur-md bg-white/10 rounded-xl p-8 shadow-2xl border border-white/20">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <span>⚡</span> Quick Actions
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => router.push('/media')}
            className="backdrop-blur-sm bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-3 border-2 border-purple-300/50"
          >
            <span className="text-2xl">📚</span>
            <span>Media Library</span>
          </button>
          
          <button
            onClick={() => router.push('/models')}
            className="backdrop-blur-sm bg-amber-500/80 hover:bg-amber-600 text-white px-6 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-3"
          >
            <span className="text-2xl">�</span>
            <span>Models</span>
          </button>
          
          <button
            onClick={() => router.push('/jukebox')}
            className="backdrop-blur-sm bg-green-500/80 hover:bg-green-600 text-white px-6 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-3"
          >
            <span className="text-2xl">🎶</span>
            <span>Jukebox</span>
          </button>
          
          <button
            onClick={() => router.push('/admin')}
            className="backdrop-blur-sm bg-indigo-500/80 hover:bg-indigo-600 text-white px-6 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-3"
          >
            <span className="text-2xl">📊</span>
            <span>Analytics</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        
        .slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
      `}</style>
    </AdminLayout>
  );
}
