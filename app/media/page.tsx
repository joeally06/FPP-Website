'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { useFPPConnection } from '@/contexts/FPPConnectionContext';
import { Music, List, Play, Trash2, Search, RefreshCw, Star, TrendingUp } from 'lucide-react';

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

interface SequenceWithMetadata extends Sequence {
  albumArt?: string | null;
  artist?: string | null;
  album?: string | null;
  trackName?: string | null;
  votes?: number;
  playCount?: number;
  rating?: number;
  matchConfidence?: string;
}

export default function MediaLibrary() {
  const { data: session } = useSession();
  const router = useRouter();
  const { isOnline } = useFPPConnection();
  const isAdmin = session?.user?.role === 'admin';

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [sequencesWithMetadata, setSequencesWithMetadata] = useState<SequenceWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  useEffect(() => {
    if (selectedPlaylist && sequences.length > 0) {
      // Clear old sequences first
      setSequencesWithMetadata([]);
      // Load metadata for new playlist
      loadPlaylistMetadata();
    } else if (!selectedPlaylist) {
      setSequencesWithMetadata([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlaylist]); // Only trigger on playlist change, not sequences change

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
      const [playlistsRes, sequencesRes] = await Promise.all([
        fetch('/api/fpp/playlists'),
        fetch('/api/fpp/sequences')
      ]);

      if (playlistsRes.ok) {
        const playlistsData = await playlistsRes.json();
        console.log('[Media Library] Loaded', playlistsData.length, 'playlists');
        setPlaylists(Array.isArray(playlistsData) ? playlistsData : []);
      } else {
        console.error('[Media Library] Failed to load playlists:', playlistsRes.status, playlistsRes.statusText);
        setPlaylists([]);
      }

      if (sequencesRes.ok) {
        const sequencesData = await sequencesRes.json();
        console.log('[Media Library] Loaded', sequencesData.length, 'sequences');
        setSequences(Array.isArray(sequencesData) ? sequencesData : []);
      } else {
        console.error('[Media Library] Failed to load sequences:', sequencesRes.status, sequencesRes.statusText);
        const errorData = await sequencesRes.json().catch(() => ({}));
        console.error('[Media Library] Error details:', errorData);
        setSequences([]);
      }
    } catch (error) {
      console.error('[Media Library] Failed to fetch media:', error);
      setPlaylists([]);
      setSequences([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPlaylistMetadata = async () => {
    if (!selectedPlaylist) return;

    setLoadingMetadata(true);
    try {
      const sequenceNames = getSequencesInPlaylist(selectedPlaylist);
      console.log('[Media Library] Loading metadata for', sequenceNames.length, 'sequences');
      console.log('[Media Library] Sequence names from playlist:', sequenceNames);
      console.log('[Media Library] Available sequences count:', sequences.length);
      console.log('[Media Library] Available sequence names:', sequences.slice(0, 10).map(s => s.name));
      
      const BATCH_SIZE = 10;
      const sequencesData: SequenceWithMetadata[] = [];

      // Load metadata in batches
      for (let i = 0; i < sequenceNames.length; i += BATCH_SIZE) {
        const batch = sequenceNames.slice(i, i + BATCH_SIZE);
        
        const batchResults = await Promise.all(
          batch.map(async (seqName) => {
            // Case-insensitive search
            const baseSequence = sequences.find(s => 
              s.name.toLowerCase().trim() === seqName.toLowerCase().trim()
            );
            
            if (!baseSequence) {
              console.warn('[Media Library] Sequence not found:', seqName);
              console.warn('[Media Library] Available sequences:', sequences.map(s => s.name).slice(0, 5));
              return null;
            }

            console.log('[Media Library] ✓ Found sequence:', seqName, '→', baseSequence.name);

            console.log('[Media Library] ✓ Found sequence:', seqName, '→', baseSequence.name);

            try {
              const [metadataRes, analyticsRes] = await Promise.all([
                fetch(`/api/spotify/metadata/${encodeURIComponent(baseSequence.name)}`).catch(err => {
                  console.warn('[Media Library] Spotify API error for', baseSequence.name, ':', err.message);
                  return null;
                }),
                fetch(`/api/analytics/sequence/${encodeURIComponent(baseSequence.name)}`).catch(err => {
                  console.warn('[Media Library] Analytics API error for', baseSequence.name, ':', err.message);
                  return null;
                })
              ]);

              let albumArt, artist, album, trackName, matchConfidence;
              if (metadataRes && metadataRes.ok) {
                const metadata = await metadataRes.json();
                albumArt = metadata.albumArt;
                artist = metadata.artist;
                album = metadata.album;
                trackName = metadata.trackName;
                matchConfidence = metadata.matchConfidence;
              } else if (metadataRes) {
                console.warn('[Media Library] Spotify metadata failed for', baseSequence.name, ':', metadataRes.status);
              }

              let votes = 0, playCount = 0, rating = 0;
              if (analyticsRes && analyticsRes.ok) {
                const analytics = await analyticsRes.json();
                votes = analytics.votes?.total || 0;
                playCount = analytics.plays?.completed || 0;
                rating = analytics.rating?.average || 0;
              } else if (analyticsRes) {
                console.warn('[Media Library] Analytics failed for', baseSequence.name, ':', analyticsRes.status);
              }

              return {
                ...baseSequence,
                albumArt,
                artist,
                album,
                trackName,
                matchConfidence,
                votes,
                playCount,
                rating
              };
            } catch (error) {
              console.error(`Failed to load metadata for ${seqName}:`, error);
              return baseSequence;
            }
          })
        );

        const validResults = batchResults.filter(Boolean) as SequenceWithMetadata[];
        sequencesData.push(...validResults);
        
        console.log(`[Media Library] Batch ${Math.floor(i / BATCH_SIZE) + 1}: Found ${validResults.length}/${batch.length} sequences`);
        
        // Update UI after each batch for progressive loading
        setSequencesWithMetadata([...sequencesData]);
      }
      
      console.log('[Media Library] Total loaded:', sequencesData.length, 'out of', sequenceNames.length);
    } catch (error) {
      console.error('Failed to load metadata:', error);
    } finally {
      setLoadingMetadata(false);
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
      if (selectedPlaylist?.name === playlistName) {
        setSelectedPlaylist(null);
      }
      fetchData();
    } catch (error) {
      console.error('Failed to delete playlist:', error);
    }
  };

  const getSequencesInPlaylist = (playlist: Playlist) => {
    return playlist.mainPlaylist
      .filter(item => item.type === 'sequence' && item.sequenceName)
      .map(item => {
        // Remove .fseq extension and trim whitespace
        const cleanName = item.sequenceName!.replace(/\.fseq$/i, '').trim();
        console.log('[Media Library] Cleaned sequence name:', item.sequenceName, '->', cleanName);
        return cleanName;
      });
  };

  const filteredPlaylists = playlists.filter(p =>
    p?.name?.toLowerCase().includes(searchTerm.toLowerCase())
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
      subtitle="Browse playlists and sequences with rich metadata"
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

      {/* Search Bar */}
      <div className="backdrop-blur-md bg-white/10 rounded-xl p-4 shadow-2xl border border-white/20 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
          <input
            type="text"
            placeholder="Search playlists..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/70">Loading media library...</p>
        </div>
      ) : playlists.length === 0 ? (
        <div className="backdrop-blur-md bg-white/10 rounded-xl p-12 shadow-2xl border border-white/20 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-2xl font-bold text-white mb-2">No Data Cached</h3>
          <p className="text-white/70 mb-4">Click "Sync Now" to load playlists and sequences from FPP.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Playlists Section - Left Column */}
          <div className="lg:col-span-1">
            <div className="backdrop-blur-md bg-white/10 rounded-xl p-6 shadow-2xl border border-white/20 sticky top-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-6">
                <List className="w-6 h-6" />
                Playlists ({filteredPlaylists.length})
              </h2>

              <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                {filteredPlaylists.length === 0 ? (
                  <p className="text-white/50 text-center py-8">No playlists found</p>
                ) : (
                  filteredPlaylists.map((playlist) => (
                    <div
                      key={playlist.name}
                      onClick={() => setSelectedPlaylist(playlist)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedPlaylist?.name === playlist.name
                          ? 'bg-white/20 border-white/40'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-white font-semibold mb-1">{playlist.name}</h3>
                          {playlist.desc && (
                            <p className="text-xs text-white/60 mb-2">{playlist.desc}</p>
                          )}
                          <div className="flex gap-3 text-xs text-white/50">
                            <span>{playlist.playlistInfo?.total_items || 0} items</span>
                            <span>{formatDuration(playlist.playlistInfo?.total_duration)}</span>
                          </div>
                        </div>

                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playPlaylist(playlist.name);
                            }}
                            disabled={!isOnline}
                            className="p-2 bg-green-500/80 hover:bg-green-600 disabled:bg-gray-500/50 disabled:cursor-not-allowed rounded-lg transition-colors"
                            title="Play playlist"
                          >
                            <Play className="w-4 h-4 text-white" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePlaylist(playlist.name);
                            }}
                            className="p-2 bg-red-500/80 hover:bg-red-600 rounded-lg transition-colors"
                            title="Delete playlist"
                          >
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sequences Section - Right 2 Columns */}
          <div className="lg:col-span-2">
            {!selectedPlaylist ? (
              <div className="backdrop-blur-md bg-white/10 rounded-xl p-12 shadow-2xl border border-white/20 text-center">
                <div className="text-6xl mb-4">👈</div>
                <h3 className="text-2xl font-bold text-white mb-2">Select a Playlist</h3>
                <p className="text-white/70">Click on a playlist to view its sequences with album art and metadata</p>
              </div>
            ) : (
              <div className="backdrop-blur-md bg-white/10 rounded-xl p-6 shadow-2xl border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Music className="w-6 h-6" />
                    {selectedPlaylist.name}
                  </h2>
                  {loadingMetadata && (
                    <div className="flex items-center gap-2 text-white/70">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Loading metadata...</span>
                    </div>
                  )}
                </div>

                {loadingMetadata && sequencesWithMetadata.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/70">Loading Spotify metadata...</p>
                  </div>
                ) : sequencesWithMetadata.length === 0 && !loadingMetadata ? (
                  <p className="text-white/50 text-center py-8">No sequences in this playlist</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sequencesWithMetadata.map((sequence) => (
                      <div
                        key={sequence.name}
                        className="bg-white/5 rounded-lg border border-white/10 overflow-hidden hover:bg-white/10 transition-all group"
                      >
                        {/* Album Art */}
                        <div className="relative aspect-square bg-gradient-to-br from-purple-900/50 to-blue-900/50">
                          {sequence.albumArt ? (
                            <img
                              src={sequence.albumArt}
                              alt={sequence.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music className="w-24 h-24 text-white/30" />
                            </div>
                          )}
                          
                          {/* Play Button Overlay */}
                          <button
                            onClick={() => playSequence(sequence.name)}
                            disabled={!isOnline}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center disabled:cursor-not-allowed"
                          >
                            <div className="bg-white/90 rounded-full p-4">
                              <Play className="w-8 h-8 text-gray-900" />
                            </div>
                          </button>
                        </div>

                        {/* Metadata */}
                        <div className="p-4">
                          <h3 className="text-white font-semibold mb-1 truncate" title={sequence.name}>
                            {sequence.trackName || sequence.name}
                          </h3>
                          
                          {sequence.artist && (
                            <p className="text-sm text-white/70 mb-1 truncate">{sequence.artist}</p>
                          )}
                          
                          {sequence.album && (
                            <p className="text-xs text-white/50 mb-3 truncate">{sequence.album}</p>
                          )}

                          {/* Stats */}
                          <div className="flex items-center gap-3 text-xs text-white/60 mb-3">
                            <span>⏱️ {formatDuration(sequence.duration)}</span>
                            <span>💾 {formatSize(sequence.size)}</span>
                          </div>

                          {/* Analytics */}
                          {(sequence.votes || sequence.playCount || sequence.rating) ? (
                            <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                              {(sequence.rating ?? 0) > 0 && (
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                  <span className="text-sm text-white">{sequence.rating!.toFixed(1)}</span>
                                </div>
                              )}
                              {(sequence.votes ?? 0) > 0 && (
                                <span className="text-xs text-white/60">{sequence.votes} votes</span>
                              )}
                              {(sequence.playCount ?? 0) > 0 && (
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3 text-blue-400" />
                                  <span className="text-xs text-white/60">{sequence.playCount}</span>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
