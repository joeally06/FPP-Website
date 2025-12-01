'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { useFPPConnection } from '@/contexts/FPPConnectionContext';
import { formatDateTime } from '@/lib/time-utils';
import { 
  Music, 
  List, 
  Play, 
  Trash2, 
  Search, 
  RefreshCw, 
  Star, 
  TrendingUp, 
  Edit3, 
  X, 
  Check,
  Library,
  Link2,
  FolderOpen,
  Download,
  AlertCircle,
  CheckCircle,
  FileAudio,
  HardDrive
} from 'lucide-react';

// Tab type for the unified Media Center
type MediaTab = 'library' | 'audio-sync' | 'local-files';

interface Playlist {
  name: string;
  desc: string;
  playlistInfo: {
    total_duration: number;
    total_items: number;
  };
  leadIn?: Array<{
    type: string;
    sequenceName?: string;
    playlistName?: string;
    enabled: number;
    duration?: number;
  }>;
  mainPlaylist: Array<{
    type: string;
    sequenceName?: string;
    playlistName?: string;
    enabled: number;
    duration?: number;
  }>;
  leadOut?: Array<{
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

interface SpotifySearchResult {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  spotifyUri: string;
  previewUrl: string | null;
}

// Audio Sync Tab interfaces
interface PlaylistSequenceStatus {
  sequenceName: string;
  mediaName: string | null;
  audioFile: string | null;
  hasLocalAudio: boolean;
  hasMapping: boolean;
  status: 'ready' | 'needs-download' | 'needs-mapping';
}

interface AudioMapping {
  sequenceName: string;
  audioFile: string;
}

interface LocalAudioFile {
  name: string;
  size: number;
  lastModified: string;
}

export default function MediaCenter() {
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
  
  // Spotify URL refresh state
  const [refreshingSpotifyUrls, setRefreshingSpotifyUrls] = useState(false);
  const [refreshSpotifyMessage, setRefreshSpotifyMessage] = useState<string>('');
  
  // Edit modal state
  const [editingSequence, setEditingSequence] = useState<SequenceWithMetadata | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualForm, setManualForm] = useState({
    albumArt: '',
    artist: '',
    album: '',
    trackName: ''
  });
  const [saving, setSaving] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<MediaTab>('library');
  
  // Audio Sync tab state
  const [selectedAudioSyncPlaylist, setSelectedAudioSyncPlaylist] = useState<Playlist | null>(null);
  const [playlistSequences, setPlaylistSequences] = useState<PlaylistSequenceStatus[]>([]);
  const [audioMappings, setAudioMappings] = useState<AudioMapping[]>([]);
  const [localAudioFiles, setLocalAudioFiles] = useState<LocalAudioFile[]>([]);
  const [loadingAudioSync, setLoadingAudioSync] = useState(false);
  const [downloadingSequence, setDownloadingSequence] = useState<string | null>(null);
  const [mappingSequence, setMappingSequence] = useState<string | null>(null);
  const [selectedAudioFile, setSelectedAudioFile] = useState<string>('');
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [audioSyncMessage, setAudioSyncMessage] = useState<string>('');

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

  // Load audio sync data when switching to audio-sync tab or when playlist changes while on that tab
  useEffect(() => {
    if (activeTab === 'audio-sync') {
      if (selectedAudioSyncPlaylist) {
        loadAudioSyncData();
      } else {
        // Clear data if no playlist selected
        setPlaylistSequences([]);
      }
    } else if (activeTab === 'local-files') {
      loadLocalFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedAudioSyncPlaylist?.name]); // Use playlist name as dependency to detect changes

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

  // Audio Sync tab functions
  const loadAudioSyncData = useCallback(async () => {
    if (!selectedAudioSyncPlaylist) return;
    
    setLoadingAudioSync(true);
    try {
      const [statusRes, mappingsRes, localFilesRes] = await Promise.all([
        fetch(`/api/audio/playlist-status?playlist=${encodeURIComponent(selectedAudioSyncPlaylist.name)}`),
        fetch('/api/audio/mappings'),
        fetch('/api/audio/local-files')
      ]);

      if (statusRes.ok) {
        const data = await statusRes.json();
        setPlaylistSequences(data.sequences || []);
      }

      if (mappingsRes.ok) {
        const data = await mappingsRes.json();
        setAudioMappings(data.mappings || []);
      }

      if (localFilesRes.ok) {
        const data = await localFilesRes.json();
        setLocalAudioFiles(data.files || []);
      }
    } catch (error) {
      console.error('[Audio Sync] Failed to load data:', error);
      setAudioSyncMessage('❌ Failed to load audio sync data');
      setTimeout(() => setAudioSyncMessage(''), 5000);
    } finally {
      setLoadingAudioSync(false);
    }
  }, [selectedAudioSyncPlaylist]);

  const loadLocalFiles = async () => {
    try {
      const res = await fetch('/api/audio/local-files');
      if (res.ok) {
        const data = await res.json();
        setLocalAudioFiles(data.files || []);
      }
    } catch (error) {
      console.error('[Audio Sync] Failed to load local files:', error);
    }
  };

  const downloadAudioFromFPP = async (sequenceName: string, mediaName: string | null) => {
    setDownloadingSequence(sequenceName);
    setAudioSyncMessage('');
    
    try {
      const res = await fetch('/api/audio/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequenceName, mediaName })
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        setAudioSyncMessage(`✅ Downloaded and mapped "${data.audioFile}" to "${sequenceName}"`);
        await loadAudioSyncData();
      } else {
        setAudioSyncMessage(`❌ Download failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[Audio Sync] Download error:', error);
      setAudioSyncMessage('❌ Failed to download audio from FPP');
    } finally {
      setDownloadingSequence(null);
      setTimeout(() => setAudioSyncMessage(''), 5000);
    }
  };

  const saveAudioMapping = async (sequenceName: string, audioFile: string) => {
    setMappingSequence(sequenceName);
    setAudioSyncMessage('');
    
    try {
      const res = await fetch('/api/audio/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequenceName, audioFile })
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        setAudioSyncMessage(`✅ Mapped "${audioFile}" to "${sequenceName}"`);
        setSelectedAudioFile('');
        await loadAudioSyncData();
      } else {
        setAudioSyncMessage(`❌ Mapping failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[Audio Sync] Mapping error:', error);
      setAudioSyncMessage('❌ Failed to save audio mapping');
    } finally {
      setMappingSequence(null);
      setTimeout(() => setAudioSyncMessage(''), 5000);
    }
  };

  const deleteLocalFile = async (fileName: string) => {
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    
    setDeletingFile(fileName);
    setAudioSyncMessage('');
    
    try {
      const res = await fetch(`/api/audio/local-files/${encodeURIComponent(fileName)}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        setAudioSyncMessage(`✅ Deleted "${fileName}"`);
        await loadLocalFiles();
      } else {
        setAudioSyncMessage(`❌ Delete failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[Audio Sync] Delete error:', error);
      setAudioSyncMessage('❌ Failed to delete file');
    } finally {
      setDeletingFile(null);
      setTimeout(() => setAudioSyncMessage(''), 5000);
    }
  };

  const deleteAllLocalFiles = async () => {
    if (!confirm(`Delete all ${localAudioFiles.length} local audio files? This cannot be undone.`)) return;
    
    setDeletingAll(true);
    setAudioSyncMessage('');
    
    try {
      let successCount = 0;
      let failCount = 0;

      // Delete files one by one
      for (const file of localAudioFiles) {
        try {
          const res = await fetch(`/api/audio/local-files/${encodeURIComponent(file.name)}`, {
            method: 'DELETE'
          });

          const data = await res.json();
          
          if (res.ok && data.success) {
            successCount++;
          } else {
            failCount++;
            console.error(`Failed to delete ${file.name}:`, data.error);
          }
        } catch (error) {
          failCount++;
          console.error(`Error deleting ${file.name}:`, error);
        }
      }

      // Show results
      if (failCount === 0) {
        setAudioSyncMessage(`✅ Successfully deleted all ${successCount} files`);
      } else {
        setAudioSyncMessage(`⚠️ Deleted ${successCount} files, ${failCount} failed`);
      }
      
      await loadLocalFiles();
    } catch (error) {
      console.error('[Audio Sync] Delete all error:', error);
      setAudioSyncMessage('❌ Failed to delete files');
    } finally {
      setDeletingAll(false);
      setTimeout(() => setAudioSyncMessage(''), 5000);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getAudioSyncStats = () => {
    const ready = playlistSequences.filter(s => s.status === 'ready').length;
    const needsDownload = playlistSequences.filter(s => s.status === 'needs-download').length;
    const needsMapping = playlistSequences.filter(s => s.status === 'needs-mapping').length;
    return { ready, needsDownload, needsMapping, total: playlistSequences.length };
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

  const handleRefreshSpotifyUrls = async () => {
    if (!confirm('Refresh Spotify URLs for all songs in Media Library? This may take a minute.')) {
      return;
    }

    setRefreshingSpotifyUrls(true);
    setRefreshSpotifyMessage('');

    try {
      const res = await fetch('/api/admin/media-library/refresh-urls', {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRefreshSpotifyMessage(`✅ ${data.message}`);
        // Refresh metadata to show new URLs
        if (selectedPlaylist) {
          await loadPlaylistMetadata();
        }
      } else {
        setRefreshSpotifyMessage(`❌ Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[Media Library] Spotify URL refresh error:', error);
      setRefreshSpotifyMessage('❌ Failed to refresh Spotify URLs');
    } finally {
      setRefreshingSpotifyUrls(false);
      setTimeout(() => setRefreshSpotifyMessage(''), 8000);
    }
  };

  const openEditModal = (sequence: SequenceWithMetadata) => {
    setEditingSequence(sequence);
    setSearchQuery(sequence.name);
    setSearchResults([]);
    setManualMode(false);
    setManualForm({
      albumArt: sequence.albumArt || '',
      artist: sequence.artist || '',
      album: sequence.album || '',
      trackName: sequence.trackName || sequence.name
    });
  };

  const closeEditModal = () => {
    setEditingSequence(null);
    setSearchQuery('');
    setSearchResults([]);
    setSearching(false);
    setManualMode(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
      const data = await res.json();
      
      if (data.results) {
        setSearchResults(data.results);
      }
    } catch (error) {
      console.error('[Media Library] Spotify search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const selectSpotifyResult = async (result: SpotifySearchResult) => {
    if (!editingSequence) return;
    
    console.log('[Media Library] Selecting Spotify result:', result);
    setSaving(true);
    
    try {
      const res = await fetch(`/api/spotify/metadata/${encodeURIComponent(editingSequence.name)}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumArt: result.albumArt,
          artist: result.artist,
          album: result.album,
          trackName: result.name,
          spotifyTrackId: result.id,
          spotifyUri: result.spotifyUri,
          previewUrl: result.previewUrl
        })
      });

      console.log('[Media Library] Save response status:', res.status);
      
      if (res.ok) {
        console.log('[Media Library] Reloading playlist metadata...');
        // Reload metadata for the selected playlist
        await loadPlaylistMetadata();
        closeEditModal();
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('[Media Library] Failed to save:', errorData);
      }
    } catch (error) {
      console.error('[Media Library] Error saving Spotify result:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveManualMetadata = async () => {
    if (!editingSequence) return;
    
    console.log('[Media Library] Saving manual metadata:', manualForm);
    setSaving(true);
    
    try {
      const res = await fetch(`/api/spotify/metadata/${encodeURIComponent(editingSequence.name)}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumArt: manualForm.albumArt,
          artist: manualForm.artist,
          album: manualForm.album,
          trackName: manualForm.trackName,
          spotifyTrackId: null,
          spotifyUri: null,
          previewUrl: null
        })
      });

      console.log('[Media Library] Save response status:', res.status);

      if (res.ok) {
        console.log('[Media Library] Reloading playlist metadata...');
        // Reload metadata for the selected playlist
        await loadPlaylistMetadata();
        closeEditModal();
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('[Media Library] Failed to save:', errorData);
      }
    } catch (error) {
      console.error('[Media Library] Error saving manual metadata:', error);
    } finally {
      setSaving(false);
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
    // Include leadIn, mainPlaylist, and leadOut sequences
    const allItems = [
      ...(playlist.leadIn || []),
      ...(playlist.mainPlaylist || []),
      ...(playlist.leadOut || [])
    ];
    
    return allItems
      .filter(item => item.sequenceName) // Any item with a sequenceName (type can be 'sequence', 'both', 'media', etc.)
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
      title="🎵 Media Center"
      subtitle="Unified media management with library, audio sync, and local files"
    >
      {/* Tab Navigation */}
      <div className="backdrop-blur-md bg-white/10 rounded-xl shadow-2xl border border-white/20 mb-6 overflow-hidden">
        <div className="flex">
          <button
            onClick={() => setActiveTab('library')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-semibold transition-all ${
              activeTab === 'library'
                ? 'bg-white/20 text-white border-b-2 border-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Library className="w-5 h-5" />
            <span>Library</span>
          </button>
          <button
            onClick={() => setActiveTab('audio-sync')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-semibold transition-all ${
              activeTab === 'audio-sync'
                ? 'bg-white/20 text-white border-b-2 border-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Link2 className="w-5 h-5" />
            <span>Audio Sync</span>
          </button>
          <button
            onClick={() => setActiveTab('local-files')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-semibold transition-all ${
              activeTab === 'local-files'
                ? 'bg-white/20 text-white border-b-2 border-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <FolderOpen className="w-5 h-5" />
            <span>Local Files</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner - Show on Library and Audio Sync tabs */}
      {/* Sync Status Banner - Show only on Library tab */}
      {activeTab === 'library' && syncStatus && (
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
                    Last synced: {formatDateTime(syncStatus.lastSuccess, 'relative')} 
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
            <div className="flex gap-2">
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
                    Sync FPP
                  </span>
                )}
              </button>
              
              <button
                onClick={handleRefreshSpotifyUrls}
                disabled={refreshingSpotifyUrls}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  refreshingSpotifyUrls
                    ? 'bg-green-600/30 text-white/50 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
                title="Refresh Spotify URLs for all songs missing links"
              >
                {refreshingSpotifyUrls ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Refreshing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    Refresh Spotify URLs
                  </span>
                )}
              </button>
            </div>
          </div>
          {(syncMessage || refreshSpotifyMessage) && (
            <div className="mt-2 text-sm text-white space-y-1">
              {syncMessage && <div>{syncMessage}</div>}
              {refreshSpotifyMessage && <div>{refreshSpotifyMessage}</div>}
            </div>
          )}
        </div>
      )}

      {/* LIBRARY TAB CONTENT */}
      {activeTab === 'library' && (
        <>
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
        <div className="space-y-6">
          
          {/* Playlist Dropdown */}
          <div className="backdrop-blur-md bg-white/10 rounded-xl p-6 shadow-2xl border border-white/20">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-4">
              <List className="w-6 h-6" />
              Select Playlist
            </h2>

            <select
              value={selectedPlaylist?.name || ''}
              onChange={(e) => {
                const playlist = playlists.find(p => p.name === e.target.value);
                setSelectedPlaylist(playlist || null);
              }}
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1.5rem',
                paddingRight: '3rem'
              }}
            >
              <option value="" disabled className="bg-gray-800">Choose a playlist...</option>
              {filteredPlaylists.map((playlist) => (
                <option key={playlist.name} value={playlist.name} className="bg-gray-800">
                  {playlist.name} ({playlist.playlistInfo?.total_items || 0} items)
                </option>
              ))}
            </select>

            {selectedPlaylist && (
              <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-1">{selectedPlaylist.name}</h3>
                    {selectedPlaylist.desc && (
                      <p className="text-sm text-white/60 mb-2">{selectedPlaylist.desc}</p>
                    )}
                    <div className="flex gap-4 text-sm text-white/50">
                      <span>📋 {selectedPlaylist.playlistInfo?.total_items || 0} items</span>
                      <span>⏱️ {formatDuration(selectedPlaylist.playlistInfo?.total_duration)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => playPlaylist(selectedPlaylist.name)}
                      disabled={!isOnline}
                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Play Playlist"
                    >
                      <Play className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deletePlaylist(selectedPlaylist.name)}
                      disabled={!isOnline}
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Delete Playlist"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sequences Section - Full Width */}
          <div>
            {!selectedPlaylist ? (
              <div className="backdrop-blur-md bg-white/10 rounded-xl p-12 shadow-2xl border border-white/20 text-center">
                <div className="text-6xl mb-4">☝️</div>
                <h3 className="text-2xl font-bold text-white mb-2">Select a Playlist</h3>
                <p className="text-white/70">Choose a playlist from the dropdown to view its sequences with album art and metadata</p>
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
                              <button
                                onClick={() => openEditModal(sequence)}
                                className="ml-auto text-white/60 hover:text-white transition-colors"
                                title="Edit metadata"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end pt-3 border-t border-white/10">
                              <button
                                onClick={() => openEditModal(sequence)}
                                className="text-white/60 hover:text-white transition-colors"
                                title="Edit metadata"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
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
        </>
      )}

      {/* AUDIO SYNC TAB CONTENT */}
      {activeTab === 'audio-sync' && (
        <div className="space-y-6">
          {/* Playlist Selector for Audio Sync */}
          <div className="backdrop-blur-md bg-white/10 rounded-xl p-6 shadow-2xl border border-white/20">
            <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-4">
              <List className="w-5 h-5" />
              Select Playlist for Audio Sync
            </h2>
            <select
              value={selectedAudioSyncPlaylist?.name || ''}
              onChange={(e) => {
                const playlist = playlists.find(p => p.name === e.target.value);
                setSelectedAudioSyncPlaylist(playlist || null);
              }}
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1.5rem',
                paddingRight: '3rem'
              }}
            >
              <option value="" disabled className="bg-gray-800">Choose a playlist...</option>
              {playlists.map((playlist) => (
                <option key={playlist.name} value={playlist.name} className="bg-gray-800">
                  {playlist.name} ({playlist.playlistInfo?.total_items || 0} items)
                </option>
              ))}
            </select>
          </div>

          {!selectedAudioSyncPlaylist ? (
            <div className="backdrop-blur-md bg-white/10 rounded-xl p-12 shadow-2xl border border-white/20 text-center">
              <div className="text-6xl mb-4">☝️</div>
              <h3 className="text-2xl font-bold text-white mb-2">Select a Playlist</h3>
              <p className="text-white/70">Choose a playlist above to view and manage audio sync status</p>
            </div>
          ) : (
            <>
              {/* Audio Sync Stats */}
              {(() => {
                const stats = getAudioSyncStats();
                return (
                  <div className="backdrop-blur-md bg-white/10 rounded-xl p-4 shadow-2xl border border-white/20">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Link2 className="w-5 h-5 text-white flex-shrink-0" />
                        <span className="text-white font-semibold truncate">Audio Sync: {selectedAudioSyncPlaylist.name}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span className="text-green-400 whitespace-nowrap">{stats.ready} Ready</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Download className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                          <span className="text-yellow-400 whitespace-nowrap">{stats.needsDownload} Download</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                          <span className="text-orange-400 whitespace-nowrap">{stats.needsMapping} Mapping</span>
                        </div>
                        <button
                          onClick={loadAudioSyncData}
                          disabled={loadingAudioSync}
                          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors touch-manipulation"
                          title="Refresh audio sync data"
                        >
                          <RefreshCw className={`w-4 h-4 text-white ${loadingAudioSync ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>
                    {audioSyncMessage && (
                      <div className="mt-3 text-sm text-white">{audioSyncMessage}</div>
                    )}
                  </div>
                );
              })()}

              {/* Playlist Sequences Table */}
              <div className="backdrop-blur-md bg-white/10 rounded-xl shadow-2xl border border-white/20 overflow-hidden">
                {loadingAudioSync ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/70">Loading audio sync status...</p>
                  </div>
                ) : playlistSequences.length === 0 ? (
                  <div className="text-center py-12">
                    <FileAudio className="w-12 h-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/70">No sequences found in this playlist</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead className="bg-white/5 border-b border-white/10">
                      <tr>
                        <th className="text-left py-3 px-4 text-white/80 font-medium">Sequence</th>
                        <th className="text-left py-3 px-4 text-white/80 font-medium">Audio File</th>
                        <th className="text-center py-3 px-4 text-white/80 font-medium">Status</th>
                        <th className="text-right py-3 px-4 text-white/80 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {playlistSequences.map((seq) => (
                        <tr key={seq.sequenceName} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 max-w-[200px]">
                            <span className="text-white font-medium block truncate" title={seq.sequenceName}>{seq.sequenceName}</span>
                          </td>
                          <td className="py-3 px-4 max-w-[250px]">
                            {mappingSequence === seq.sequenceName ? (
                              <div className="flex items-center gap-1 min-w-0">
                                <select
                                  value={selectedAudioFile}
                                  onChange={(e) => setSelectedAudioFile(e.target.value)}
                                  className="flex-1 min-w-0 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm"
                                >
                                  <option value="" className="bg-gray-800 text-white">Select...</option>
                                  {localAudioFiles.map((file) => (
                                    <option key={file.name} value={file.name} className="bg-gray-800 text-white">{file.name}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => selectedAudioFile && saveAudioMapping(seq.sequenceName, selectedAudioFile)}
                                  disabled={!selectedAudioFile}
                                  className="flex-shrink-0 p-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 touch-manipulation"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setMappingSequence(null)}
                                  className="flex-shrink-0 p-1.5 bg-white/10 text-white rounded hover:bg-white/20 touch-manipulation"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : seq.audioFile ? (
                              <span className="text-green-400 block truncate" title={seq.audioFile}>{seq.audioFile}</span>
                            ) : seq.mediaName ? (
                              <span className="text-yellow-400 text-sm block truncate" title={`FPP: ${seq.mediaName}`}>FPP: {seq.mediaName}</span>
                            ) : (
                              <span className="text-white/50">Not mapped</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {seq.status === 'ready' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs whitespace-nowrap" title="Ready">
                                <CheckCircle className="w-3 h-3" />
                                <span className="hidden sm:inline">Ready</span>
                              </span>
                            ) : seq.status === 'needs-download' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs whitespace-nowrap" title="Need Download">
                                <Download className="w-3 h-3" />
                                <span className="hidden sm:inline">Download</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs whitespace-nowrap" title="Need Mapping">
                                <AlertCircle className="w-3 h-3" />
                                <span className="hidden sm:inline">Mapping</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Download button - shows when audio needs to be downloaded from FPP */}
                              {seq.status === 'needs-download' && seq.mediaName && (
                                <button
                                  onClick={() => downloadAudioFromFPP(seq.sequenceName, seq.mediaName)}
                                  disabled={downloadingSequence === seq.sequenceName}
                                  className="px-2 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 whitespace-nowrap touch-manipulation"
                                  title="Download audio from FPP"
                                >
                                  {downloadingSequence === seq.sequenceName ? (
                                    <>
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                      <span className="hidden sm:inline">Downloading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Download className="w-3 h-3" />
                                      <span className="hidden sm:inline">Download</span>
                                    </>
                                  )}
                                </button>
                              )}
                              {/* Map Audio button - shows when not currently mapping this sequence */}
                              {mappingSequence !== seq.sequenceName && (
                                <button
                                  onClick={() => setMappingSequence(seq.sequenceName)}
                                  className={`px-2 py-1.5 ${seq.status === 'ready' ? 'bg-white/10 hover:bg-white/20' : 'bg-orange-600 hover:bg-orange-700'} text-white rounded text-xs font-medium flex items-center gap-1 whitespace-nowrap touch-manipulation`}
                                  title={seq.status === 'ready' ? 'Change audio mapping' : 'Map to local audio file'}
                                >
                                  <Link2 className="w-3 h-3" />
                                  <span className="hidden sm:inline">{seq.status === 'ready' ? 'Remap' : 'Map'}</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* LOCAL FILES TAB CONTENT */}
      {activeTab === 'local-files' && (
        <div className="space-y-6">
          {/* Local Files Header */}
          <div className="backdrop-blur-md bg-white/10 rounded-xl p-4 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-white" />
                <span className="text-white font-semibold">Local Audio Files</span>
                <span className="text-white/60 text-sm">({localAudioFiles.length} files)</span>
              </div>
              <div className="flex items-center gap-2">
                {localAudioFiles.length > 0 && (
                  <button
                    onClick={deleteAllLocalFiles}
                    disabled={deletingAll}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm touch-manipulation"
                    title="Delete all files"
                  >
                    {deletingAll ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Delete All</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={loadLocalFiles}
                  disabled={deletingAll}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh file list"
                >
                  <RefreshCw className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
            {audioSyncMessage && (
              <div className="mt-3 text-sm text-white">{audioSyncMessage}</div>
            )}
          </div>

          {/* Local Files List */}
          <div className="backdrop-blur-md bg-white/10 rounded-xl shadow-2xl border border-white/20 overflow-hidden">
            {localAudioFiles.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-12 h-12 text-white/30 mx-auto mb-3" />
                <p className="text-white/70">No local audio files found</p>
                <p className="text-white/50 text-sm mt-1">Download audio from FPP using the Audio Sync tab</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {localAudioFiles.map((file) => (
                  <div key={file.name} className="flex items-start sm:items-center justify-between gap-3 p-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      <FileAudio className="w-8 h-8 text-blue-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-medium break-words" title={file.name}>{file.name}</p>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-white/50">
                          <span>{formatFileSize(file.size)}</span>
                          <span className="whitespace-nowrap">{new Date(file.lastModified).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteLocalFile(file.name)}
                      disabled={deletingFile === file.name || deletingAll}
                      className="flex-shrink-0 p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50 touch-manipulation"
                      title="Delete file"
                    >
                      {deletingFile === file.name ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingSequence && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Edit Metadata</h3>
                  <p className="text-sm text-white/60 mt-1">{editingSequence.name}</p>
                </div>
                <button
                  onClick={closeEditModal}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Mode Toggle */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setManualMode(false)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    !manualMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  Search Spotify
                </button>
                <button
                  onClick={() => setManualMode(true)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    manualMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  Manual Entry
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {!manualMode ? (
                /* Search Mode */
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Search for a song..."
                      className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={searching || !searchQuery.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {searching ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          Search
                        </>
                      )}
                    </button>
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-white/60">{searchResults.length} results found</p>
                      {saving && (
                        <div className="p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-200 text-sm flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Saving metadata and refreshing...
                        </div>
                      )}
                      {searchResults.map((result) => (
                        <div
                          key={result.id}
                          onClick={() => !saving && selectSpotifyResult(result)}
                          className={`flex items-center gap-4 p-3 bg-white/5 rounded-lg border border-white/10 transition-colors group ${
                            saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/10'
                          }`}
                        >
                          {result.albumArt && (
                            <img
                              src={result.albumArt}
                              alt={result.album}
                              className="w-16 h-16 rounded object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium truncate">{result.name}</h4>
                            <p className="text-sm text-white/70 truncate">{result.artist}</p>
                            <p className="text-xs text-white/50 truncate">{result.album}</p>
                          </div>
                          <Check className={`w-5 h-5 text-green-400 transition-opacity ${
                            saving ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
                          }`} />
                        </div>
                      ))}
                    </div>
                  ) : searchQuery && !searching ? (
                    <div className="text-center py-12 text-white/50">
                      <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No results found</p>
                      <p className="text-sm mt-1">Try a different search query</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                /* Manual Entry Mode */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Album Art URL
                    </label>
                    <input
                      type="text"
                      value={manualForm.albumArt}
                      onChange={(e) => setManualForm({ ...manualForm, albumArt: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {manualForm.albumArt && (
                      <div className="mt-3">
                        <img
                          src={manualForm.albumArt}
                          alt="Preview"
                          className="w-32 h-32 rounded object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Track Name
                    </label>
                    <input
                      type="text"
                      value={manualForm.trackName}
                      onChange={(e) => setManualForm({ ...manualForm, trackName: e.target.value })}
                      placeholder="Song title"
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Artist
                    </label>
                    <input
                      type="text"
                      value={manualForm.artist}
                      onChange={(e) => setManualForm({ ...manualForm, artist: e.target.value })}
                      placeholder="Artist name"
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Album
                    </label>
                    <input
                      type="text"
                      value={manualForm.album}
                      onChange={(e) => setManualForm({ ...manualForm, album: e.target.value })}
                      placeholder="Album name"
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={saveManualMetadata}
                      disabled={!manualForm.trackName.trim() || saving}
                      className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Save
                        </>
                      )}
                    </button>
                    <button
                      onClick={closeEditModal}
                      disabled={saving}
                      className="flex-1 py-2 px-4 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
