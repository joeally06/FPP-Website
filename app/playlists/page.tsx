'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';

export default function Playlists() {
  const [playlists, setPlaylists] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
      // Success feedback without alert
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
      {error && (
        <div className="mb-6 backdrop-blur-md bg-red-500/20 border border-red-500/50 text-white px-6 py-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-sm text-white/80">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Controls Section */}
      <div className="backdrop-blur-md bg-white/10 rounded-xl p-6 shadow-2xl border border-white/20 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Search playlists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={fetchScheduledPlaylists}
              disabled={isRefreshing}
              className="backdrop-blur-sm bg-blue-500/80 hover:bg-blue-600 disabled:bg-gray-500/50 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            
            <button
              onClick={stopPlaylist}
              className="backdrop-blur-sm bg-red-500/80 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <span>⏹️</span>
              Stop All
            </button>
          </div>
        </div>
      </div>

      {/* Playlists Grid */}
      <div className="backdrop-blur-md bg-white/10 rounded-xl p-6 shadow-2xl border border-white/20">
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
              <div
                key={playlist}
                className="backdrop-blur-sm rounded-lg p-4 border-2 bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40 transition-all"
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
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
