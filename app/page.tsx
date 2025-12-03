'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { useFPPConnection } from '@/contexts/FPPConnectionContext';
import { Play, Square, SkipForward, SkipBack, Repeat, Shuffle, Pause, RotateCcw } from 'lucide-react';

interface Status {
  status_name: string;
  current_playlist: { playlist: string; count: string; index: string };
  current_sequence: string;
  volume: number;
  mode_name: string;
}

interface Playlist {
  name: string;
}

interface Sequence {
  name: string;
}

interface PlaylistDetails {
  name?: string;
  mainPlaylist?: Array<{
    sequenceName?: string;
    type?: string;
  }>;
  leadIn?: Array<{
    sequenceName?: string;
    type?: string;
  }>;
  leadOut?: Array<{
    sequenceName?: string;
    type?: string;
  }>;
  [key: string]: any;
}

export default function Home() {
  const [status, setStatus] = useState<Status | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistDetails, setPlaylistDetails] = useState<Map<string, PlaylistDetails>>(new Map());
  const [allSequences, setAllSequences] = useState<Sequence[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('');
  const [selectedSequence, setSelectedSequence] = useState<string>('');
  const [repeat, setRepeat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
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
    const fetchData = async () => {
      if (!isOnline || !isAdmin) return;

      try {
        // Fetch status
        const statusRes = await fetch('/api/fppd/status');
        if (statusRes.ok) {
          const data = await statusRes.json();
          setStatus(data);
          if (data.current_playlist?.playlist) {
            setSelectedPlaylist(data.current_playlist.playlist);
          }
          setError(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    // Initial fetch
    fetchData();
    // Poll every 5 seconds for status updates
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [isAdmin, isOnline]);

  // Fetch playlists and sequences once on mount
  useEffect(() => {
    const fetchStaticData = async () => {
      if (!isOnline || !isAdmin) return;

      try {
        // Fetch playlists (only once)
        const playlistsRes = await fetch('/api/fpp/playlists/list');
        if (playlistsRes.ok) {
          const data = await playlistsRes.json();
          setPlaylists(data || []);
          if (data.length > 0 && !selectedPlaylist) {
            setSelectedPlaylist(data[0].name);
          }
        }

        // Fetch all sequences (for standalone playback)
        const sequencesRes = await fetch('/api/fpp/sequences/list');
        if (sequencesRes.ok) {
          const data = await sequencesRes.json();
          setAllSequences(data || []);
        }
      } catch (err) {
        console.error('Failed to fetch static data:', err);
      }
    };

    fetchStaticData();
  }, [isAdmin, isOnline]);

  // Fetch playlist details when playlist is selected
  useEffect(() => {
    const fetchPlaylistDetails = async () => {
      if (!selectedPlaylist || !isOnline) {
        return;
      }

      // Check if we already have this playlist's details
      if (playlistDetails.has(selectedPlaylist)) {
        return;
      }

      try {
        // Fetch playlist details from our API route
        const response = await fetch(`/api/fpp/playlists/${encodeURIComponent(selectedPlaylist)}`);
        if (response.ok) {
          const data = await response.json();
          console.log('Playlist details:', data);
          setPlaylistDetails(prev => new Map(prev).set(selectedPlaylist, data));
        } else {
          console.error('Failed to fetch playlist details:', response.status);
        }
      } catch (err) {
        console.error('Failed to fetch playlist details:', err);
      }
    };

    fetchPlaylistDetails();
  }, [selectedPlaylist, isOnline, playlistDetails]);

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

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const sendCommand = async (command: string, args: any[]) => {
    setLoading(true);
    try {
      const response = await fetch('/api/fpp/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, args }),
      });

      if (response.ok) {
        showMessage('success', `Command sent: ${command}`);
      } else {
        const error = await response.json();
        showMessage('error', error.error || 'Command failed');
      }
    } catch (error) {
      showMessage('error', 'Network error');
      console.error('Command error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Playlist Controls
  const startPlaylist = () => {
    if (!selectedPlaylist) {
      showMessage('error', 'Please select a playlist');
      return;
    }
    // If a sequence is selected, start from that sequence
    if (selectedSequence) {
      startSequence();
    } else {
      // Otherwise start the playlist from the beginning
      sendCommand('Start Playlist', [selectedPlaylist, repeat, false]);
    }
  };

  const stopPlaylist = () => sendCommand('Stop Gracefully', [false]);
  const stopNow = () => sendCommand('Stop Now', []);
  const nextItem = () => sendCommand('Next Playlist Item', []);
  const prevItem = () => sendCommand('Prev Playlist Item', []);
  const startRandom = () => {
    if (!selectedPlaylist) {
      showMessage('error', 'Please select a playlist');
      return;
    }
    sendCommand('Start Playlist At Random Item', [selectedPlaylist, repeat, false]);
  };
  const togglePauseResume = () => {
    if (status?.status_name === 'playing') {
      sendCommand('Pause Playlist', []);
    } else {
      sendCommand('Resume Playlist', []);
    }
  };
  const restartItem = () => sendCommand('Restart Playlist Item', []);

  // Get sequences from current playlist
  const getPlaylistSequences = () => {
    if (!selectedPlaylist) return [];
    const details = playlistDetails.get(selectedPlaylist);
    if (!details) return [];

    const sequences: Array<{ name: string; type: string; section: string }> = [];

    // Add leadIn sequences first (these come before mainPlaylist in FPP)
    if (details.leadIn && Array.isArray(details.leadIn)) {
      details.leadIn.forEach((item: any) => {
        if (item.sequenceName) {
          sequences.push({ name: item.sequenceName, type: item.type || 'sequence', section: 'Lead In' });
        }
      });
    }

    // Add mainPlaylist sequences
    if (details.mainPlaylist && Array.isArray(details.mainPlaylist)) {
      details.mainPlaylist.forEach((item: any) => {
        if (item.sequenceName) {
          sequences.push({ name: item.sequenceName, type: item.type || 'sequence', section: 'Main' });
        }
      });
    }

    // Add leadOut sequences last
    if (details.leadOut && Array.isArray(details.leadOut)) {
      details.leadOut.forEach((item: any) => {
        if (item.sequenceName) {
          sequences.push({ name: item.sequenceName, type: item.type || 'sequence', section: 'Lead Out' });
        }
      });
    }

    return sequences;
  };

  // Sequence Controls
  const startSequence = () => {
    if (!selectedSequence) {
      showMessage('error', 'Please select a sequence');
      return;
    }
    
    // Find the index of the selected sequence in the playlist
    const sequences = getPlaylistSequences();
    const sequenceIndex = sequences.findIndex(seq => seq.name === selectedSequence);
    
    if (sequenceIndex === -1) {
      showMessage('error', 'Sequence not found in playlist');
      return;
    }
    
    // FPP uses 1-based indexing for Start Playlist At Item (item 1 is the first item)
    const fppIndex = sequenceIndex + 1;
    console.log('Starting playlist item:', fppIndex, 'in playlist:', selectedPlaylist);
    sendCommand('Start Playlist At Item', [selectedPlaylist, fppIndex, false, false]);
    
    // Clear selection after starting so user can start playlist from beginning if desired
    setSelectedSequence('');
  };

  const stopSequence = () => {
    if (!selectedSequence) {
      showMessage('error', 'Please select a sequence');
      return;
    }
    const sequenceName = selectedSequence.replace(/\.fseq$/i, '');
    sendCommand('FSEQ Effect Stop', [sequenceName]);
  };

  const stopAllEffects = () => sendCommand('Effects Stop', []);

  const handleVolumeChange = async (vol: number) => {
    if (!isOnline || !status) return;
    try {
      await fetch(`/api/web/system/volume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume: vol })
      });
      setStatus({ ...status, volume: vol });
    } catch (err) {
      showMessage('error', 'Failed to set volume');
    }
  };

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
      {/* Compact Status Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className={`backdrop-blur-md bg-gradient-to-br ${status && isOnline ? getStatusColor(status.status_name) : 'from-gray-500 to-slate-600'} rounded-xl p-4 shadow-xl border border-white/20 transform transition-all hover:scale-105`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs font-medium mb-1">Status</p>
              <p className="text-2xl font-bold text-white capitalize">
                {!isOnline ? 'Offline' : (status?.status_name || '...')}
              </p>
            </div>
            <span className="text-3xl">🎯</span>
          </div>
        </div>

        <div className="backdrop-blur-md bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl p-4 shadow-xl border border-white/20 transform transition-all hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs font-medium mb-1">Mode</p>
              <p className="text-xl font-bold text-white">
                {!isOnline ? 'N/A' : (status?.mode_name || '...')}
              </p>
            </div>
            <span className="text-3xl">⚙️</span>
          </div>
        </div>

        <div className="backdrop-blur-md bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-4 shadow-xl border border-white/20 transform transition-all hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs font-medium mb-1">Playlist</p>
              <p className="text-sm font-bold text-white truncate">
                {!isOnline ? 'Offline' : (status?.current_playlist?.playlist || 'None')}
              </p>
              {status?.current_playlist?.index && isOnline && (
                <p className="text-xs text-white/70">
                  {status.current_playlist.index}/{status.current_playlist.count}
                </p>
              )}
            </div>
            <span className="text-3xl">📋</span>
          </div>
        </div>

        <div className="backdrop-blur-md bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl p-4 shadow-xl border border-white/20 transform transition-all hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs font-medium mb-1">Volume</p>
              <p className="text-2xl font-bold text-white">
                {!isOnline ? '--' : (status?.volume || 0)}%
              </p>
            </div>
            <span className="text-3xl">🔊</span>
          </div>
        </div>
      </div>

      {/* Now Playing - Only show when actively playing */}
      {status?.current_sequence && status?.status_name === 'playing' && (
        <div className="backdrop-blur-md bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-xl p-6 shadow-2xl border border-green-400/30 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 via-emerald-500/10 to-green-400/10 animate-pulse"></div>
          
          <div className="relative flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
              <div className="relative w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-2xl">▶️</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs text-green-300/90 font-semibold uppercase tracking-wider mb-1 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Now Playing
              </p>
              <p className="text-2xl font-bold text-white">{status.current_sequence}</p>
              {status.current_playlist?.playlist && (
                <p className="text-sm text-white/70 mt-1">
                  From: {status.current_playlist.playlist} • Track {status.current_playlist.index} of {status.current_playlist.count}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-green-400 to-emerald-500 rounded-full animate-equalizer"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: `${0.5 + (i % 3) * 0.2}s`
                  }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Status Message */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-600/20 text-green-400 border border-green-600/30'
              : 'bg-red-600/20 text-red-400 border border-red-600/30'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Unified Controls Card */}
      <div className="backdrop-blur-md bg-white/10 rounded-xl shadow-2xl border border-white/20 mb-6">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span>🎛️</span> Playlist Player
          </h2>

          <div className="space-y-6">
            {/* Playlist Controls & Sequences */}
            <div className="space-y-6">
              {/* Playlist Selection */}
              <div className="space-y-3">
                <div className="flex gap-3 flex-wrap">
                  <select
                    value={selectedPlaylist}
                    onChange={(e) => setSelectedPlaylist(e.target.value)}
                    className="flex-1 min-w-[200px] bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none text-lg font-medium"
                    disabled={loading}
                  >\n                    {playlists.length === 0 ? (
                      <option>No playlists available</option>
                    ) : (
                      playlists.map((playlist) => (
                        <option key={playlist.name} value={playlist.name}>
                          {playlist.name}
                        </option>
                      ))
                    )}
                  </select>

                  <label className="flex items-center gap-2 text-white bg-gray-700 px-4 py-3 rounded-lg border border-gray-600 cursor-pointer hover:bg-gray-600 transition">
                    <input
                      type="checkbox"
                      checked={repeat}
                      onChange={(e) => setRepeat(e.target.checked)}
                      className="w-4 h-4"
                      disabled={loading}
                    />
                    <Repeat size={18} />
                    <span className="hidden sm:inline">Repeat</span>
                  </label>
                </div>
              </div>

              {/* Primary Playback Controls */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wide">Primary Controls</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <button
                    onClick={startPlaylist}
                    disabled={loading || !selectedPlaylist}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg hover:shadow-xl"
                  >
                    <Play size={20} />
                    <span>Start</span>
                  </button>

                  <button
                    onClick={togglePauseResume}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg hover:shadow-xl"
                  >
                    {status?.status_name === 'playing' ? (
                      <>
                        <Pause size={20} />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play size={20} />
                        <span>Resume</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={stopPlaylist}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg hover:shadow-xl col-span-2 sm:col-span-1"
                    title="Completes current sequence then stops"
                  >
                    <Square size={20} />
                    <span>Stop</span>
                  </button>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="space-y-2 pt-4 border-t border-white/10">
                <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wide">Navigation</h4>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={prevItem}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-medium transition shadow-lg"
                  >
                    <SkipBack size={18} />
                    <span className="text-sm">Previous</span>
                  </button>

                  <button
                    onClick={nextItem}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-medium transition shadow-lg"
                  >
                    <SkipForward size={18} />
                    <span className="text-sm">Next</span>
                  </button>

                  <button
                    onClick={restartItem}
                    disabled={loading || !status?.current_playlist?.playlist}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-medium transition shadow-lg"
                  >
                    <RotateCcw size={18} />
                    <span className="text-sm">Restart</span>
                  </button>
                </div>
              </div>

              {/* Advanced Options */}
              <div className="space-y-2 pt-4 border-t border-white/10">
                <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wide">Advanced Options</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={startRandom}
                    disabled={loading || !selectedPlaylist}
                    className="flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm font-medium transition shadow-lg"
                  >
                    <Shuffle size={16} />
                    <span>Random</span>
                  </button>

                  <button
                    onClick={stopNow}
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm font-medium transition shadow-lg border-2 border-red-400/30"
                    title="Stops immediately without completing sequence"
                  >
                    <Square size={16} />
                    <span>Stop Now</span>
                  </button>
                </div>
              </div>

              {/* Sequences in Playlist */}
              <div className="space-y-2 pt-4 border-t border-white/10">
                <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wide flex items-center gap-2">
                  <span>🎬</span> Sequences in this Playlist
                </h4>
                <div className="bg-white/5 rounded-lg border border-white/10 max-h-64 overflow-y-auto">
                  {getPlaylistSequences().length === 0 ? (
                    <div className="p-4 text-center text-white/50 text-sm">
                      {selectedPlaylist ? 'Loading sequences...' : 'Select a playlist to view sequences'}
                    </div>
                  ) : (
                    <div className="divide-y divide-white/10">
                      {getPlaylistSequences().map((seq, index) => (
                        <div
                          key={`${seq.section}-${index}`}
                          onClick={() => setSelectedSequence(seq.name)}
                          className={`px-4 py-2.5 hover:bg-white/5 transition flex items-center gap-3 cursor-pointer ${
                            selectedSequence === seq.name ? 'bg-blue-600/20 border-l-4 border-blue-500' : ''
                          }`}
                        >
                          <span className="text-white/40 text-xs font-mono w-6">{index + 1}</span>
                          <span className="text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded">{seq.section}</span>
                          <span className="flex-1 text-sm text-white">{seq.name}</span>
                          {selectedSequence === seq.name && (
                            <span className="text-xs text-blue-400">✓ Selected</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Volume Control */}
      <div className="backdrop-blur-md bg-white/10 rounded-xl shadow-2xl border border-white/20 mb-6">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔊</span>
            <h2 className="text-2xl font-bold text-white">Volume Control</h2>
            <div className="ml-auto text-4xl font-bold text-white">
              {!isOnline ? '--' : status?.volume || 0}%
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="range"
              min="0"
              max="100"
              value={status?.volume || 0}
              disabled={!isOnline}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
              className={`w-full h-4 bg-white/20 rounded-full appearance-none slider ${
                !isOnline ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
              style={{
                background: isOnline && status
                  ? `linear-gradient(to right, #10b981 0%, #10b981 ${status.volume}%, rgba(255,255,255,0.2) ${status.volume}%, rgba(255,255,255,0.2) 100%)`
                  : 'rgba(255,255,255,0.1)'
              }}
            />

            <div className="flex justify-between items-center">
              <span className="text-sm text-white/70">🔇 Mute</span>
              <span className="text-sm text-white/70">🔊 Max</span>
            </div>

            {!isOnline && (
              <p className="text-center text-white/60 text-sm">
                Volume control unavailable - FPP Offline
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="backdrop-blur-md bg-white/10 rounded-xl p-6 shadow-2xl border border-white/20">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
          <span>⚡</span> Quick Actions
        </h2>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
        
        @keyframes equalizer {
          0%, 100% {
            height: 8px;
          }
          50% {
            height: 24px;
          }
        }
        
        .animate-equalizer {
          animation: equalizer 0.8s ease-in-out infinite;
        }
      `}</style>
    </AdminLayout>
  );
}
