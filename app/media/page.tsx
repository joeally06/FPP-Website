'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { useFPPConnection } from '@/contexts/FPPConnectionContext';
import { Music, List, Play, Trash2, Search, Filter, RefreshCw } from 'lucide-react';

interface Playlist {
  name: string;
  desc: string;
  playlistInfo: {
    total_duration: number;
    total_items: number;
  };
  mainPlaylist: Array<{
    type: string;
    sequenceName?: string;
    playlistName?: string;
    enabled: number;
    duration?: number;
  }>;
}

interface Sequence {
  name: string;
  size: number;
  duration?: number;
}

export default function MediaLibrary() {
  const { data: session } = useSession();
  const router = useRouter();
  const { isOnline } = useFPPConnection();
  const isAdmin = session?.user?.role === 'admin';

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('all');
  const [expandedPlaylists, setExpandedPlaylists] = useState<Set<string>>(new Set());
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>('');

  useEffect(() => {
    if (!isAdmin) {
      router.push('/jukebox');
      return;
    }

    fetchData();
    fetchSyncStatus();
  }, [isAdmin, router]);

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch('/api/fpp/sync');
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data.data);
      }
    } catch (error) {
      console.error('[Media Library] Failed to fetch sync status:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('[Media Library] Fetching playlists and sequences from cache...');
      
      const [playlistsRes, sequencesRes] = await Promise.all([
        fetch('/api/fpp/playlists'),
        fetch('/api/fpp/sequences')
      ]);

      if (playlistsRes.ok) {
        const playlistsData = await playlistsRes.json();
        console.log('[Media Library] Playlists loaded:', playlistsData.length);
        setPlaylists(Array.isArray(playlistsData) ? playlistsData : []);
      } else {
        console.error('[Media Library] Failed to fetch playlists:', playlistsRes.status);
        setPlaylists([]);
      }

      if (sequencesRes.ok) {
        const sequencesData = await sequencesRes.json();
        console.log('[Media Library] Sequences loaded:', sequencesData.length);
        setSequences(Array.isArray(sequencesData) ? sequencesData : []);
      } else {
        console.error('[Media Library] Failed to fetch sequences:', sequencesRes.status);
        setSequences([]);
      }
    } catch (error) {
      console.error('Failed to fetch media:', error);
      setPlaylists([]);
      setSequences([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage('');
    
    try {
      const res = await fetch('/api/fpp/sync', {
        method: 'POST'
      });

      const data = await res.json();
      
      if (data.success) {
        setSyncMessage(`✅ ${data.message}`);
        await fetchData();
        await fetchSyncStatus();
      } else {
        setSyncMessage(`❌ Sync failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[Media Library] Sync error:', error);
      setSyncMessage('❌ Failed to sync with FPP device');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  const togglePlaylist = (playlistName: string) => {
    const newExpanded = new Set(expandedPlaylists);
    if (newExpanded.has(playlistName)) {
      newExpanded.delete(playlistName);
    } else {
      newExpanded.add(playlistName);
    }
    setExpandedPlaylists(newExpanded);
  };

  const playPlaylist = async (playlistName: string) => {
    if (!isOnline) return;
    
    try {
      await fetch('/api/fppd/command/Start%20Playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          args: [playlistName, false, false]
        })
      });
    } catch (error) {
      console.error('Failed to play playlist:', error);
    }
  };

  const playSequence = async (sequenceName: string) => {
    if (!isOnline) return;
    
    try {
      await fetch('/api/fppd/command/Start%20Playlist%20At%20Item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          args: [sequenceName, 0, false, false]
        })
      });
    } catch (error) {
      console.error('Failed to play sequence:', error);
    }
  };

  const deletePlaylist = async (playlistName: string) => {
    if (!confirm(`Delete playlist "${playlistName}"?`)) return;
    
    try {
      await fetch(`/api/fppd/playlists/${encodeURIComponent(playlistName)}`, {
        method: 'DELETE'
      });
      fetchData();
    } catch (error) {
      console.error('Failed to delete playlist:', error);
    }
  };

  const getSequencesInPlaylist = (playlist: Playlist) => {
    return playlist.mainPlaylist
      .filter(item => item.type === 'sequence' && item.sequenceName)
      .map(item => item.sequenceName!);
  };

  const getUnassignedSequences = () => {
    const assignedSequences = new Set<string>();
    playlists.forEach(playlist => {
      getSequencesInPlaylist(playlist).forEach(seq => assignedSequences.add(seq));
    });
    
    return sequences.filter(seq => seq?.name && !assignedSequences.has(seq.name));
  };

  const filteredPlaylists = playlists.filter(p =>
    p?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSequences = selectedPlaylist === 'all'
    ? sequences
    : selectedPlaylist === 'unassigned'
    ? getUnassignedSequences()
    : sequences.filter(seq => {
        const playlist = playlists.find(p => p.name === selectedPlaylist);
        return playlist && getSequencesInPlaylist(playlist).includes(seq.name);
      });

  const displayedSequences = filteredSequences.filter(s =>
    s?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    return `${mb} MB`;
  };

  if (!isAdmin) return null;

  return (
    <AdminLayout
      title="🎵 Media Library"
      subtitle="Playlists and sequences from FPP"
    >
      {/* Sync Status Banner */}
      {syncStatus && (
        <div className="backdrop-blur-md bg-white/10 rounded-xl p-4 shadow-2xl border border-white/20 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                <span className="text-white font-semibold">FPP Data Cache</span>
              </div>
              <div className="text-sm text-white/70">
                {syncStatus.lastSuccess ? (
                  <>
                    Last synced: {new Date(syncStatus.lastSuccess).toLocaleString()} 
                    {' - '}
                    {syncStatus.playlistsCount} playlists, {syncStatus.sequencesCount} sequences
                  </>
                ) : syncStatus.lastError ? (
                  <span className="text-red-300">Error: {syncStatus.lastError}</span>
                ) : (
                  <span className="text-yellow-300">No data cached yet - click Sync to load from FPP</span>
                )}
              </div>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                syncing
                  ? 'bg-white/10 text-white/50 cursor-not-allowed'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              {syncing ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Sync Now
                </span>
              )}
            </button>
          </div>
          {syncMessage && (
            <div className="mt-2 text-sm text-white">{syncMessage}</div>
          )}
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="backdrop-blur-md bg-white/10 rounded-xl p-6 shadow-2xl border border-white/20 mb-6">`
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
            <input
              type="text"
              placeholder="Search playlists and sequences..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
            <select
              value={selectedPlaylist}
              onChange={(e) => setSelectedPlaylist(e.target.value)}
              className="pl-10 pr-8 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50 appearance-none cursor-pointer min-w-[200px]"
            >
              <option value="all" className="bg-gray-800">All Sequences</option>
              <option value="unassigned" className="bg-gray-800">Unassigned</option>
              <optgroup label="Playlists" className="bg-gray-800">
                {playlists.map(p => (
                  <option key={p.name} value={p.name} className="bg-gray-800">
                    {p.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/70">Loading media library...</p>
        </div>
      ) : (playlists.length === 0 && sequences.length === 0) ? (
        <div className="backdrop-blur-md bg-white/10 rounded-xl p-12 shadow-2xl border border-white/20 text-center">
          <div className="text-6xl mb-4">�</div>
          <h3 className="text-2xl font-bold text-white mb-2">No Data Cached</h3>
          <p className="text-white/70 mb-4">Click "Sync Now" to load playlists and sequences from FPP.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Playlists Section */}
          <div className="backdrop-blur-md bg-white/10 rounded-xl p-6 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <List className="w-6 h-6" />
                Playlists ({filteredPlaylists.length})
              </h2>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredPlaylists.length === 0 ? (
                <p className="text-white/50 text-center py-8">No playlists found</p>
              ) : (
                filteredPlaylists.map((playlist) => (
                  <div
                    key={playlist.name}
                    className="bg-white/5 rounded-lg border border-white/10 overflow-hidden"
                  >
                    {/* Playlist Header */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <button
                            onClick={() => togglePlaylist(playlist.name)}
                            className="text-left w-full"
                          >
                            <h3 className="text-lg font-semibold text-white hover:text-white/80 transition-colors">
                              {expandedPlaylists.has(playlist.name) ? '▼' : '▶'} {playlist.name}
                            </h3>
                          </button>
                          {playlist.desc && (
                            <p className="text-sm text-white/60 mt-1">{playlist.desc}</p>
                          )}
                          <div className="flex gap-4 mt-2 text-xs text-white/50">
                            <span>{playlist.playlistInfo?.total_items || 0} items</span>
                            <span>{formatDuration(playlist.playlistInfo?.total_duration)}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => playPlaylist(playlist.name)}
                            disabled={!isOnline}
                            className="p-2 bg-green-500/80 hover:bg-green-600 disabled:bg-gray-500/50 disabled:cursor-not-allowed rounded-lg transition-colors"
                            title="Play playlist"
                          >
                            <Play className="w-4 h-4 text-white" />
                          </button>
                          <button
                            onClick={() => deletePlaylist(playlist.name)}
                            className="p-2 bg-red-500/80 hover:bg-red-600 rounded-lg transition-colors"
                            title="Delete playlist"
                          >
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Sequences */}
                    {expandedPlaylists.has(playlist.name) && (
                      <div className="border-t border-white/10 bg-white/5 p-4">
                        <h4 className="text-sm font-semibold text-white/70 mb-3">Sequences:</h4>
                        <div className="space-y-2">
                          {getSequencesInPlaylist(playlist).length === 0 ? (
                            <p className="text-white/40 text-sm italic">No sequences</p>
                          ) : (
                            getSequencesInPlaylist(playlist).map((seqName, idx) => {
                              const seq = sequences.find(s => s.name === seqName);
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-2 bg-white/5 rounded hover:bg-white/10 transition-colors"
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    <Music className="w-4 h-4 text-white/50" />
                                    <div>
                                      <p className="text-sm text-white font-medium">{seqName}</p>
                                      {seq && (
                                        <p className="text-xs text-white/50">
                                          {formatSize(seq.size)} • {formatDuration(seq.duration)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => playSequence(seqName)}
                                    disabled={!isOnline}
                                    className="p-1.5 bg-blue-500/80 hover:bg-blue-600 disabled:bg-gray-500/50 disabled:cursor-not-allowed rounded transition-colors"
                                    title="Play sequence"
                                  >
                                    <Play className="w-3 h-3 text-white" />
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sequences Section */}
          <div className="backdrop-blur-md bg-white/10 rounded-xl p-6 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Music className="w-6 h-6" />
                Sequences ({displayedSequences.length})
              </h2>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {displayedSequences.length === 0 ? (
                <p className="text-white/50 text-center py-8">No sequences found</p>
              ) : (
                displayedSequences.map((sequence) => (
                  <div
                    key={sequence.name}
                    className="bg-white/5 rounded-lg border border-white/10 p-4 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold mb-1">{sequence.name}</h3>
                        <div className="flex gap-4 text-xs text-white/50">
                          <span>{formatSize(sequence.size)}</span>
                          <span>{formatDuration(sequence.duration)}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => playSequence(sequence.name)}
                        disabled={!isOnline}
                        className="p-2 bg-blue-500/80 hover:bg-blue-600 disabled:bg-gray-500/50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
                        title="Play sequence"
                      >
                        <Play className="w-4 h-4 text-white" />
                        <span className="text-sm text-white">Play</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
