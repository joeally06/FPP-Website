'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Music, 
  AlertTriangle, 
  CheckCircle, 
  Download, 
  Link2, 
  RefreshCw, 
  Loader2,
  List,
  X,
  Trash2,
  HardDrive,
  ExternalLink
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface PlaylistItem {
  type: 'leadIn' | 'main' | 'leadOut';
  sequenceName: string;
  audioFile: string;
  status: 'ready' | 'missing_local' | 'needs_mapping';
}

interface Playlist {
  name: string;
  desc?: string;
}

interface LocalFile {
  name: string;
  size: number;
  modified: string;
}

interface FPPFile {
  name: string;
  size: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function MediaManager() {
  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  
  // Core data
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('');
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [fppAudioFiles, setFppAudioFiles] = useState<FPPFile[]>([]);
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
  
  // Loading states
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Messages
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Mapping Modal
  const [showMapModal, setShowMapModal] = useState(false);
  const [mappingSequence, setMappingSequence] = useState<string | null>(null);
  const [mappingSearch, setMappingSearch] = useState('');
  
  // Delete Confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // DATA FETCHING
  // -------------------------------------------------------------------------

  const fetchPlaylists = useCallback(async () => {
    try {
      const res = await fetch('/api/fpp/playlists');
      if (!res.ok) throw new Error('Failed to fetch playlists');
      
      const data = await res.json();
      const playlistArray = Array.isArray(data) ? data : (data.playlists || []);
      setPlaylists(playlistArray);
      
      if (playlistArray.length > 0 && !selectedPlaylist) {
        setSelectedPlaylist(playlistArray[0].name);
      }
    } catch (err) {
      console.error('Failed to load playlists', err);
      setError('Failed to connect to FPP. Ensure your device is online.');
    }
  }, [selectedPlaylist]);

  const fetchFPPAudioFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/fpp/media/list');
      if (!res.ok) throw new Error('Failed to fetch FPP audio');
      
      const data = await res.json();
      setFppAudioFiles(data.files || []);
    } catch (err) {
      console.error('Failed to load FPP audio files', err);
    }
  }, []);

  const fetchLocalFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/fpp/media/local');
      if (!res.ok) throw new Error('Failed to fetch local files');
      
      const data = await res.json();
      setLocalFiles(data.files || []);
    } catch (err) {
      console.error('Failed to load local files', err);
    }
  }, []);

  const fetchPlaylistItems = useCallback(async (playlist: string) => {
    if (!playlist) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/admin/playlist-status?name=${encodeURIComponent(playlist)}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load playlist');
      }
      
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to load items', err);
      setError(err instanceof Error ? err.message : 'Failed to load playlist items');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        fetchPlaylists(),
        fetchFPPAudioFiles(),
        fetchLocalFiles()
      ]);
      setInitialLoading(false);
    };
    loadInitialData();
  }, [fetchPlaylists, fetchFPPAudioFiles, fetchLocalFiles]);

  // Load items when playlist changes
  useEffect(() => {
    if (selectedPlaylist) {
      fetchPlaylistItems(selectedPlaylist);
    }
  }, [selectedPlaylist, fetchPlaylistItems]);

  // -------------------------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------------------------

  const handleDownload = async (filename: string) => {
    if (!filename) return;
    
    setDownloading(filename);
    setError(null);
    setSuccess(null);
    
    try {
      const res = await fetch('/api/fpp/media/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Download failed');
      }
      
      setSuccess(`Downloaded: ${data.filename}`);
      
      // Refresh data
      await Promise.all([
        fetchLocalFiles(),
        fetchPlaylistItems(selectedPlaylist)
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAll = async () => {
    const toDownload = items.filter(i => i.status === 'missing_local' && i.audioFile);
    
    for (const item of toDownload) {
      await handleDownload(item.audioFile);
    }
  };

  const handleMapAudio = async (audioFilename: string) => {
    if (!mappingSequence) return;
    
    setError(null);
    
    try {
      const res = await fetch('/api/audio/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sequence: mappingSequence, 
          audioFile: audioFilename 
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Mapping failed');
      }
      
      setSuccess(`Mapped: ${mappingSequence} → ${audioFilename}`);
      setShowMapModal(false);
      setMappingSequence(null);
      setMappingSearch('');
      
      // Reload sync service
      try {
        await fetch('/api/audio/sync', { method: 'POST' });
      } catch (e) {
        console.error('Failed to reload sync service', e);
      }
      
      // Refresh items
      await fetchPlaylistItems(selectedPlaylist);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mapping failed');
    }
  };

  const openMapModal = (sequenceName: string) => {
    setMappingSequence(sequenceName);
    setMappingSearch('');
    setShowMapModal(true);
  };

  const confirmDelete = (filename: string) => {
    setFileToDelete(filename);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;
    
    setDeleting(fileToDelete);
    setError(null);
    
    try {
      const res = await fetch(`/api/fpp/media/local?filename=${encodeURIComponent(fileToDelete)}`, {
        method: 'DELETE'
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Delete failed');
      }
      
      setSuccess(`Deleted: ${data.filename}`);
      setShowDeleteConfirm(false);
      setFileToDelete(null);
      
      // Refresh data
      await Promise.all([
        fetchLocalFiles(),
        fetchPlaylistItems(selectedPlaylist)
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([
      fetchPlaylists(),
      fetchFPPAudioFiles(),
      fetchLocalFiles()
    ]);
    if (selectedPlaylist) {
      await fetchPlaylistItems(selectedPlaylist);
    }
    setLoading(false);
  };

  // -------------------------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------------------------

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getTypeBadge = (type: PlaylistItem['type']) => {
    const config = {
      leadIn: { bg: 'bg-blue-900/50', text: 'text-blue-300', border: 'border-blue-700', label: 'Lead In' },
      main: { bg: 'bg-purple-900/50', text: 'text-purple-300', border: 'border-purple-700', label: 'Main' },
      leadOut: { bg: 'bg-orange-900/50', text: 'text-orange-300', border: 'border-orange-700', label: 'Lead Out' }
    };
    const c = config[type];
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded border ${c.bg} ${c.text} ${c.border}`}>
        {c.label}
      </span>
    );
  };

  const getStatusBadge = (item: PlaylistItem) => {
    switch (item.status) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-300">
            <CheckCircle className="w-3 h-3" /> Ready
          </span>
        );
      case 'missing_local':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300">
            <Download className="w-3 h-3" /> Download Needed
          </span>
        );
      case 'needs_mapping':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-300">
            <AlertTriangle className="w-3 h-3" /> Needs Mapping
          </span>
        );
    }
  };

  // Filter audio files for mapping modal (show both FPP and local files)
  const allAudioForMapping = [...new Set([
    ...fppAudioFiles.map(f => f.name),
    ...localFiles.map(f => f.name)
  ])].sort();

  const filteredAudioForMapping = allAudioForMapping.filter(name =>
    name.toLowerCase().includes(mappingSearch.toLowerCase())
  );

  // Stats
  const stats = {
    total: items.length,
    ready: items.filter(i => i.status === 'ready').length,
    needsDownload: items.filter(i => i.status === 'missing_local').length,
    needsMapping: items.filter(i => i.status === 'needs_mapping').length
  };

  const totalLocalSize = localFiles.reduce((sum, f) => sum + f.size, 0);

  // -------------------------------------------------------------------------
  // LOADING STATE
  // -------------------------------------------------------------------------

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-500 mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">Connecting to FPP...</p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ================================================================== */}
      {/* HEADER */}
      {/* ================================================================== */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Music className="w-6 h-6 text-blue-400" />
              Media Synchronization
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Download and map audio files for your FPP sequences
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-gray-500" />
              <select 
                value={selectedPlaylist}
                onChange={(e) => setSelectedPlaylist(e.target.value)}
                className="w-64 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a playlist...</option>
                {playlists.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg text-gray-200 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        {items.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Total:</span>
              <span className="font-semibold text-white">{stats.total}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-gray-400">Ready:</span>
              <span className="font-semibold text-green-400">{stats.ready}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-gray-400">Need Download:</span>
              <span className="font-semibold text-blue-400">{stats.needsDownload}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              <span className="text-gray-400">Need Mapping:</span>
              <span className="font-semibold text-yellow-400">{stats.needsMapping}</span>
            </div>
            
            {stats.needsDownload > 0 && (
              <button
                onClick={handleDownloadAll}
                disabled={downloading !== null}
                className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm text-white font-medium transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download All ({stats.needsDownload})
              </button>
            )}
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* MESSAGES */}
      {/* ================================================================== */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-300 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 text-green-300 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{success}</div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MAIN TABLE - PLAYLIST SEQUENCES */}
      {/* ================================================================== */}
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Playlist Sequences</h3>
          <p className="text-sm text-gray-400">Review and fix audio assignments for each sequence</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Sequence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Audio File
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-2 animate-spin" />
                    <p className="text-gray-400">Loading playlist...</p>
                  </td>
                </tr>
              ) : !selectedPlaylist ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <List className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                    <p>Select a playlist above to view sequences</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Music className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                    <p>No sequences found in this playlist</p>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr 
                    key={`${item.sequenceName}-${idx}`} 
                    className="hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTypeBadge(item.type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-white">
                        {item.sequenceName}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.audioFile ? (
                        <span className="text-sm text-gray-300 flex items-center gap-2">
                          <Music className="w-4 h-4 text-gray-500" />
                          {item.audioFile}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500 italic">
                          No audio linked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.status === 'missing_local' && (
                          <button 
                            onClick={() => handleDownload(item.audioFile)}
                            disabled={downloading === item.audioFile}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                          >
                            {downloading === item.audioFile ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                            Download
                          </button>
                        )}
                        {item.status === 'needs_mapping' && (
                          <button 
                            onClick={() => openMapModal(item.sequenceName)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-sm text-white transition-colors"
                          >
                            <Link2 className="w-4 h-4" />
                            Map Audio
                          </button>
                        )}
                        {item.status === 'ready' && (
                          <button 
                            onClick={() => openMapModal(item.sequenceName)}
                            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================================== */}
      {/* LOCAL FILES SECTION */}
      {/* ================================================================== */}
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-gray-400" />
              Local Audio Files ({localFiles.length})
            </h3>
            <p className="text-sm text-gray-400">
              Total size: {formatBytes(totalLocalSize)}
            </p>
          </div>
        </div>
        
        {localFiles.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <HardDrive className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p>No local audio files. Download files from the table above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Filename
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {localFiles.map((file) => (
                  <tr key={file.name} className="hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-white flex items-center gap-2">
                        <Music className="w-4 h-4 text-gray-500" />
                        {file.name}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-400">
                      {formatBytes(file.size)}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={() => confirmDelete(file.name)}
                        disabled={deleting === file.name}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 border border-red-700 rounded-lg text-sm text-red-400 hover:text-red-300 transition-colors"
                      >
                        {deleting === file.name ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* MAPPING MODAL */}
      {/* ================================================================== */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/70 transition-opacity" 
              onClick={() => setShowMapModal(false)}
            />

            {/* Modal */}
            <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-lg w-full border border-gray-700">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-blue-400" />
                  Map Audio to Sequence
                </h3>
                <button 
                  onClick={() => setShowMapModal(false)}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-4">
                <p className="text-sm text-gray-400 mb-1">Sequence:</p>
                <p className="font-medium text-white mb-4 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-gray-500" />
                  {mappingSequence}
                </p>
                
                <input
                  type="text"
                  placeholder="Search audio files..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                  value={mappingSearch}
                  onChange={(e) => setMappingSearch(e.target.value)}
                  autoFocus
                />

                <div className="max-h-64 overflow-y-auto border border-gray-700 rounded-lg bg-gray-900/50">
                  {filteredAudioForMapping.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No audio files found
                    </div>
                  ) : (
                    filteredAudioForMapping.map((filename) => {
                      const isLocal = localFiles.some(f => f.name === filename);
                      return (
                        <button
                          key={filename}
                          onClick={() => handleMapAudio(filename)}
                          className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white border-b border-gray-800 last:border-0 flex items-center justify-between gap-3 transition-colors"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Music className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="truncate">{filename}</span>
                          </span>
                          {isLocal && (
                            <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded">
                              Local
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-700 flex justify-end">
                <button 
                  onClick={() => setShowMapModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ================================================================== */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/70 transition-opacity" 
              onClick={() => setShowDeleteConfirm(false)}
            />

            {/* Modal */}
            <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-700">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  Confirm Deletion
                </h3>
              </div>

              {/* Body */}
              <div className="px-6 py-4">
                <p className="text-gray-300">
                  Are you sure you want to delete <strong className="text-white">{fileToDelete}</strong>?
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This action cannot be undone.
                </p>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={deleting !== null}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg text-white transition-colors flex items-center gap-2"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
