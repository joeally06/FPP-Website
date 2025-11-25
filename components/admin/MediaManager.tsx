'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Download, RefreshCw, Music, HardDrive, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MediaFile {
  name: string;
  size: number;
  modified: string;
  path: string;
  extension?: string;
}

interface AudioMapping {
  [sequence: string]: string;
}

interface Playlist {
  name: string;
  desc?: string;
  leadIn?: Array<{ mediaName: string; sequenceName: string; enabled: number }>;
  mainPlaylist?: Array<{ mediaName: string; sequenceName: string; enabled: number }>;
  leadOut?: Array<{ mediaName: string; sequenceName: string; enabled: number }>;
  playlistInfo?: {
    total_duration: number;
    total_items: number;
  };
}

export default function MediaManager() {
  // State management
  const [fppFiles, setFppFiles] = useState<MediaFile[]>([]);
  const [localFiles, setLocalFiles] = useState<MediaFile[]>([]);
  const [mappings, setMappings] = useState<AudioMapping>({});
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Modal state
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState<string>('');
  const [selectedAudio, setSelectedAudio] = useState<string>('');
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadFPPFiles(),
        loadLocalFiles(),
        loadMappings(),
        loadPlaylists()
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadFPPFiles = async () => {
    try {
      const response = await fetch('/api/fpp/media/list');
      
      if (!response.ok) {
        if (response.status === 503) {
          throw new Error('FPP is offline');
        }
        throw new Error('Failed to load FPP files');
      }
      
      const data = await response.json();
      console.log('[MediaManager] FPP files response:', data);
      setFppFiles(data.files || []);
    } catch (err: any) {
      console.error('Load FPP files error:', err);
      setFppFiles([]);
      throw err;
    }
  };

  const loadLocalFiles = async () => {
    try {
      const response = await fetch('/api/fpp/media/local');
      
      if (!response.ok) {
        throw new Error('Failed to load local files');
      }
      
      const data = await response.json();
      setLocalFiles(data.files || []);
    } catch (err: any) {
      console.error('Load local files error:', err);
      setLocalFiles([]);
      throw err;
    }
  };

  const loadMappings = async () => {
    try {
      const response = await fetch('/api/audio/mapping');
      
      if (!response.ok) {
        throw new Error('Failed to load mappings');
      }
      
      const data = await response.json();
      setMappings(data.mappings || {});
    } catch (err: any) {
      console.error('Load mappings error:', err);
      setMappings({});
      throw err;
    }
  };

  const loadPlaylists = async () => {
    try {
      const response = await fetch('/api/fpp/playlists');
      
      if (!response.ok) {
        throw new Error('Failed to load playlists');
      }
      
      const data = await response.json();
      console.log('[MediaManager] Playlists response:', data);
      
      // API returns array directly, not { playlists: [] }
      const playlistArray = Array.isArray(data) ? data : (data.playlists || []);
      setPlaylists(playlistArray);
      console.log('[MediaManager] Loaded playlists:', playlistArray.length);
    } catch (err: any) {
      console.error('Load playlists error:', err);
      setPlaylists([]);
      // Don't throw - playlists are optional
    }
  };

  const downloadFile = async (filename: string) => {
    setDownloading(filename);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/fpp/media/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Download failed');
      }
      
      setSuccess(`Downloaded: ${data.filename} (${formatBytes(data.size)})`);
      await loadLocalFiles();
      
    } catch (err: any) {
      setError(err.message || 'Failed to download file');
    } finally {
      setDownloading(null);
    }
  };

  const confirmDelete = (filename: string) => {
    setFileToDelete(filename);
    setShowDeleteConfirm(true);
  };

  const deleteFile = async () => {
    if (!fileToDelete) return;
    
    setDeleting(fileToDelete);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`/api/fpp/media/local?filename=${encodeURIComponent(fileToDelete)}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Delete failed');
      }
      
      setSuccess(`Deleted: ${data.filename}`);
      await loadLocalFiles();
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete file');
    } finally {
      setDeleting(null);
      setShowDeleteConfirm(false);
      setFileToDelete(null);
    }
  };

  const openMappingModal = (sequence?: string, audio?: string) => {
    setSelectedSequence(sequence || '');
    setSelectedAudio(audio || '');
    setShowMappingModal(true);
  };

  const saveMapping = async () => {
    setError(null);
    setSuccess(null);
    
    if (!selectedSequence || !selectedAudio) {
      setError('Both sequence and audio file must be selected');
      return;
    }
    
    try {
      const response = await fetch('/api/audio/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sequence: selectedSequence,
          audioFile: selectedAudio
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save mapping');
      }
      
      setSuccess(`Mapping saved: ${data.sequence} → ${data.audioFile}`);
      await loadMappings();
      setShowMappingModal(false);
      
    } catch (err: any) {
      setError(err.message || 'Failed to save mapping');
    }
  };

  const deleteMapping = async (sequence: string) => {
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`/api/audio/mapping?sequence=${encodeURIComponent(sequence)}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete mapping');
      }
      
      setSuccess(`Mapping deleted: ${sequence}`);
      await loadMappings();
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete mapping');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const totalLocalSize = localFiles.reduce((sum, file) => sum + file.size, 0);

  // Get all audio files used in a specific playlist (only enabled items)
  const getPlaylistAudioFiles = (playlist: Playlist): Array<{ mediaName: string; sequenceName: string }> => {
    const audioFiles: Array<{ mediaName: string; sequenceName: string }> = [];
    
    const addMediaFiles = (items: Array<{ mediaName: string; sequenceName: string; enabled: number }> | undefined) => {
      if (items) {
        items.forEach(item => {
          if (item.mediaName && item.enabled === 1) {
            audioFiles.push({
              mediaName: item.mediaName,
              sequenceName: item.sequenceName
            });
          }
        });
      }
    };
    
    addMediaFiles(playlist.leadIn);
    addMediaFiles(playlist.mainPlaylist);
    addMediaFiles(playlist.leadOut);
    
    return audioFiles;
  };

  // Get all audio files used in all playlists
  const getAllPlaylistAudioFiles = (): Set<string> => {
    const audioFiles = new Set<string>();
    playlists.forEach(playlist => {
      const playlistFiles = getPlaylistAudioFiles(playlist);
      playlistFiles.forEach(file => audioFiles.add(file.mediaName));
    });
    return audioFiles;
  };

  // Filter FPP files based on selected playlist
  const filteredFppFiles = fppFiles.filter(file => {
    // Only show files from selected playlist
    const playlist = playlists.find(p => p.name === selectedPlaylist);
    if (playlist) {
      const playlistFiles = getPlaylistAudioFiles(playlist);
      return playlistFiles.some(pf => pf.mediaName === file.name);
    }
    
    // If no playlist selected, show nothing
    return false;
  });

  // Check if a file is used in any playlist
  const isFileUsedInPlaylist = (filename: string): boolean => {
    const allUsedFiles = getAllPlaylistAudioFiles();
    return allUsedFiles.has(filename);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Media Manager</h2>
          <p className="text-muted-foreground">Download audio from FPP and manage sequence mappings</p>
        </div>
        <Button onClick={loadAllData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh All
        </Button>
      </div>

      {/* Status Messages */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Error</p>
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-green-500 dark:border-green-700">
          <CardContent className="pt-6">
            <p className="text-green-600 dark:text-green-400 font-medium">{success}</p>
          </CardContent>
        </Card>
      )}

      {/* Playlist Details */}
      {selectedPlaylist && (() => {
        const playlist = playlists.find(p => p.name === selectedPlaylist);
        if (!playlist) return null;
        const songs = getPlaylistAudioFiles(playlist);
        return (
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle>Playlist: {playlist.name}</CardTitle>
              <CardDescription>
                {playlist.desc || 'No description'} • {songs.length} songs
                {playlist.playlistInfo && ` • ${Math.floor(playlist.playlistInfo.total_duration / 60)} minutes`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Songs in this playlist:</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {songs.map((song, idx) => (
                    <div key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-muted-foreground min-w-[24px]">{idx + 1}.</span>
                      <span>{song.mediaName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* FPP Files */}
      <Card className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border-purple-500/30">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                FPP Audio Files ({filteredFppFiles.length} of {fppFiles.length})
              </CardTitle>
              <CardDescription>
                Audio files available on your FPP server
              </CardDescription>
            </div>
            <div className="w-64">
              <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by playlist" />
                </SelectTrigger>
                <SelectContent>
                  {playlists.map((playlist) => (
                    <SelectItem key={playlist.name} value={playlist.name}>
                      {playlist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedPlaylist ? (
            <p className="text-muted-foreground text-center py-8">
              Select a playlist above to view its audio files
            </p>
          ) : filteredFppFiles.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {loading ? 'Loading...' : 'No files found in this playlist'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Modified</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFppFiles.map((file) => {
                    const isDownloaded = localFiles.some(local => local.name === file.name);
                    const isUsed = isFileUsedInPlaylist(file.name);
                    
                    return (
                      <TableRow key={file.name}>
                        <TableCell className="font-medium">{file.name}</TableCell>
                        <TableCell>
                          {isUsed ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              In Playlist
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                              Unused
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{formatBytes(file.size)}</TableCell>
                        <TableCell>{formatDate(file.modified)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => downloadFile(file.name)}
                            disabled={downloading === file.name || isDownloaded}
                          >
                            {downloading === file.name ? (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Downloading...
                              </>
                            ) : isDownloaded ? (
                              'Downloaded'
                            ) : (
                              <>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Local Files */}
      <Card className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Local Audio Files ({localFiles.length})
          </CardTitle>
          <CardDescription>
            Audio files stored locally ({formatBytes(totalLocalSize)})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {localFiles.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No local audio files. Download from FPP above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Modified</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localFiles.map((file) => (
                    <TableRow key={file.name}>
                      <TableCell className="font-medium">{file.name}</TableCell>
                      <TableCell>{formatBytes(file.size)}</TableCell>
                      <TableCell>{formatDate(file.modified)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => confirmDelete(file.name)}
                          disabled={deleting === file.name}
                        >
                          {deleting === file.name ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sequence Mappings */}
      <Card className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border-purple-500/30">
        <CardHeader>
          <CardTitle>Sequence → Audio Mappings ({Object.keys(mappings).length})</CardTitle>
          <CardDescription>
            Map FPP sequences to audio files for visitor listening
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={() => openMappingModal()}>
              Create New Mapping
            </Button>

            {Object.keys(mappings).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No mappings configured. Create one to enable visitor audio sync.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sequence</TableHead>
                      <TableHead>Audio File</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(mappings).map(([sequence, audio]) => (
                      <TableRow key={sequence}>
                        <TableCell className="font-medium">{sequence}</TableCell>
                        <TableCell>{audio}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openMappingModal(sequence, audio)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteMapping(sequence)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mapping Modal */}
      <Dialog open={showMappingModal} onOpenChange={setShowMappingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSequence ? 'Edit Mapping' : 'Create New Mapping'}
            </DialogTitle>
            <DialogDescription>
              Map an FPP sequence to a local audio file
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sequence">Sequence Name (.fseq)</Label>
              <Input
                id="sequence"
                placeholder="example-sequence.fseq"
                value={selectedSequence}
                onChange={(e) => setSelectedSequence(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="audio">Audio File</Label>
              <Select value={selectedAudio} onValueChange={setSelectedAudio}>
                <SelectTrigger>
                  <SelectValue placeholder="Select audio file" />
                </SelectTrigger>
                <SelectContent>
                  {localFiles.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      No local files available
                    </div>
                  ) : (
                    localFiles.map((file) => (
                      <SelectItem key={file.name} value={file.name}>
                        {file.name} ({formatBytes(file.size)})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMappingModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveMapping} disabled={!selectedSequence || !selectedAudio}>
              Save Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{fileToDelete}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteFile}>
              Delete File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
