'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import GlassCard from '@/components/ui/GlassCard';
import { glassStyles } from '@/lib/theme';

export default function Sequences() {
  const [sequences, setSequences] = useState<string[]>([]);
  const [currentSequence, setCurrentSequence] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { data: session, status: sessionStatus} = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const router = useRouter();

  // Redirect non-admins to jukebox page
  useEffect(() => {
    if (sessionStatus !== 'loading' && !isAdmin) {
      router.push('/jukebox');
    }
  }, [isAdmin, sessionStatus, router]);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      // Fetch status for current sequence
      const statusResponse = await fetch('/api/fppd/status');
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        setCurrentSequence(status.current_sequence || null);
      }

      // First, get scheduled playlists
      const scheduleResponse = await fetch('/api/web/schedule');
      if (!scheduleResponse.ok) throw new Error('Failed to fetch schedule');
      const schedule = await scheduleResponse.json();
      
      const playlistNames = new Set<string>();
      schedule.forEach((entry: any) => {
        if (entry.playlist) {
          playlistNames.add(entry.playlist);
        }
      });

      // Then, get sequences from each scheduled playlist
      const sequenceSet = new Set<string>();
      for (const playlistName of playlistNames) {
        try {
          const playlistResponse = await fetch(`/api/web/playlist/${encodeURIComponent(playlistName)}`);
          if (playlistResponse.ok) {
            const playlist = await playlistResponse.json();
            // Extract from leadIn
            if (playlist.leadIn) {
              playlist.leadIn.forEach((item: any) => {
                if (item.sequenceName) {
                  sequenceSet.add(item.sequenceName);
                }
              });
            }
            // Extract from mainPlaylist
            if (playlist.mainPlaylist) {
              playlist.mainPlaylist.forEach((item: any) => {
                if (item.sequenceName) {
                  sequenceSet.add(item.sequenceName);
                }
              });
            }
          }
        } catch (err) {
          console.error(`Failed to fetch playlist ${playlistName}:`, err);
        }
      }

      setSequences(Array.from(sequenceSet));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
      // Auto-refresh current sequence status every 2 seconds for real-time updates
      const interval = setInterval(async () => {
        try {
          const statusResponse = await fetch('/api/fppd/status');
          if (statusResponse.ok) {
            const status = await statusResponse.json();
            setCurrentSequence(status.current_sequence || null);
          }
        } catch (err) {
          console.error('Failed to refresh current sequence:', err);
        }
      }, 2000);
      return () => clearInterval(interval);
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

  const startSequence = async (name: string) => {
    try {
      const response = await fetch('/api/web/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'Start Sequence',
          args: [name]
        })
      });
      let data;
      try {
        data = await response.json();
      } catch {
        data = { Status: response.ok ? 'OK' : 'ERROR' };
      }
      if (data.Status !== 'OK') throw new Error(data.Message || 'Failed to start sequence');
      // Show success message instead of alert
      setTimeout(() => fetchData(), 500);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const stopSequence = async () => {
    try {
      const response = await fetch('/api/web/sequence/current/stop', { method: 'GET' });
      let data;
      try {
        data = await response.json();
      } catch {
        data = { Status: response.ok ? 'OK' : 'ERROR' };
      }
      if (data.Status !== 'OK') throw new Error(data.Message || 'Failed to stop sequence');
      setTimeout(() => fetchData(), 500);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const filteredSequences = sequences.filter(seq => 
    seq.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout 
      title="🎵 Sequence Control" 
      subtitle="Manage and control your light sequences"
    >
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
                placeholder="🔍 Search sequences..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={glassStyles.input + " w-full px-4 py-3"}
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={fetchData}
              disabled={isRefreshing}
              className={`${glassStyles.button} px-6 py-3 font-semibold flex items-center gap-2`}
            >
              <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            
            <button
              onClick={stopSequence}
              disabled={!currentSequence}
              className="backdrop-blur-sm bg-red-500/80 hover:bg-red-600 disabled:bg-gray-500/50 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed flex items-center gap-2 border border-white/20"
            >
              <span>⏹️</span>
              Stop Current
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Currently Playing Banner */}
      {currentSequence && (
        <GlassCard className="bg-gradient-to-r from-green-500/80 to-emerald-600/80 p-6 mb-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">▶️</span>
            </div>
            <div>
              <p className="text-sm text-white/80">Now Playing</p>
              <p className="text-2xl font-bold text-white">{currentSequence}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Sequences Grid */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span>🎼</span>
            Available Sequences
          </h2>
          <span className="text-white/70 text-sm">
            {filteredSequences.length} of {sequences.length} sequences
          </span>
        </div>

        {filteredSequences.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/60 text-lg">
              {searchTerm ? 'No sequences match your search' : 'No sequences found in scheduled playlists'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSequences.map((sequence) => {
              const isPlaying = currentSequence === sequence;
              return (
                <GlassCard
                  key={sequence}
                  hover={!isPlaying}
                  className={`
                    p-4
                    ${isPlaying 
                      ? 'bg-green-500/30 border-green-400 shadow-lg shadow-green-500/50' 
                      : ''
                    }
                  `}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                      ${isPlaying ? 'bg-green-500/50 animate-pulse' : 'bg-white/10'}
                    `}>
                      <span className="text-xl">{isPlaying ? '▶️' : '🎵'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate" title={sequence}>
                        {sequence}
                      </p>
                      {isPlaying && (
                        <p className="text-green-300 text-xs mt-1 font-semibold">Currently Playing</p>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => startSequence(sequence)}
                    disabled={isPlaying}
                    className={`
                      w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all
                      ${isPlaying
                        ? 'bg-gray-500/50 text-white/50 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl'
                      }
                    `}
                  >
                    {isPlaying ? '▶️ Playing' : '▶️ Start Sequence'}
                  </button>
                </GlassCard>
              );
            })}
          </div>
        )}
      </GlassCard>
    </AdminLayout>
  );
}
