'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import Toast from '@/components/Toast';
import GlassCard from '@/components/ui/GlassCard';
import { glassStyles } from '@/lib/theme';

export default function Playlists() {
  const [playlists, setPlaylists] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const router = useRouter();

  // Redirect non-admins to jukebox page
  useEffect(() => {
    if (sessionStatus !== 'loading' && !isAdmin) {
      router.push('/jukebox');
    }
  }, [isAdmin, sessionStatus, router]);

  const fetchScheduledPlaylists = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/web/schedule');
      if (!response.ok) throw new Error('Failed to fetch schedule');
      const schedule = await response.json();
      // Extract unique playlist names from schedule entries
      const playlistSet = new Set<string>();
      schedule.forEach((entry: any) => {
        if (entry.playlist) {
          playlistSet.add(entry.playlist);
        }
      });
      setPlaylists(Array.from(playlistSet));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchScheduledPlaylists();
    }
  }, [isAdmin]);

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

  const startPlaylist = async (name: string) => {
    try {
      const response = await fetch('/api/web/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'Start Playlist At Item',
          args: [name, 1, true, false]
        })
      });
      let data;
      try {
        data = await response.json();
      } catch {
        data = { Status: response.ok ? 'OK' : 'ERROR' };
      }
      if (data.Status !== 'OK') throw new Error(data.Message || 'Failed to start playlist');
      
      // Show success toast
      setToast({
        message: `🎵 ${name} has started!`,
        type: 'success',
        isVisible: true
      });
    } catch (err) {
      setToast({
        message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        type: 'error',
        isVisible: true
      });
    }
  };

  const stopPlaylist = async () => {
    try {
      const response = await fetch('/api/web/playlists/stop', { method: 'GET' });
      let data;
      try {
        data = await response.json();
      } catch {
        data = { Status: response.ok ? 'OK' : 'ERROR' };
      }
      if (data.Status !== 'OK') throw new Error(data.Message || 'Failed to stop playlist');
      
      // Show success toast
      setToast({
        message: '⏹️ All playlists have stopped!',
        type: 'success',
        isVisible: true
      });
    } catch (err) {
      setToast({
        message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        type: 'error',
        isVisible: true
      });
    }
  };

  const filteredPlaylists = playlists.filter(playlist => 
    playlist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout 
      title="📋 Playlist Control" 
      subtitle="Manage and control your playlists"
    >
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
      
      {error && (
        <GlassCard className="mb-6 bg-red-500/20 border-red-500/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-white">Error</p>
              <p className="text-sm text-white/80">{error}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Controls Section */}
      <GlassCard className="p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Search playlists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={glassStyles.input + " w-full px-4 py-3"}
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={fetchScheduledPlaylists}
              disabled={isRefreshing}
              className={`${glassStyles.button} px-6 py-3 font-semibold flex items-center gap-2`}
            >
              <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            
            <button
              onClick={stopPlaylist}
              className="backdrop-blur-sm bg-red-500/80 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2 border border-white/20"
            >
              <span>⏹️</span>
              Stop All
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Playlists Grid */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span>🎼</span>
            Scheduled Playlists
          </h2>
          <span className="text-white/70 text-sm">
            {filteredPlaylists.length} of {playlists.length} playlists
          </span>
        </div>

        <p className="text-white/60 text-sm mb-6">
          Only playlists currently scheduled in FPP are shown.
        </p>

        {filteredPlaylists.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/60 text-lg">
              {searchTerm ? 'No playlists match your search' : 'No playlists found in schedule'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlaylists.map((playlist) => (
              <GlassCard
                key={playlist}
                hover
                className="p-4"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500/50 to-blue-500/50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">📋</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate" title={playlist}>
                      {playlist}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => startPlaylist(playlist)}
                  className="w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl"
                >
                  ▶️ Start Playlist
                </button>
              </GlassCard>
            ))}
          </div>
        )}
      </GlassCard>
    </AdminLayout>
  );
}
