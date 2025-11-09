'use client';

import { useState, useEffect } from 'react';
import { Play, Square, SkipForward, SkipBack, Repeat, Shuffle } from 'lucide-react';

interface Playlist {
  name: string;
}

interface Sequence {
  name: string;
}

interface PlaylistControlsProps {
  fppUrl?: string;
}

export default function PlaylistControls({ fppUrl }: PlaylistControlsProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('');
  const [selectedSequence, setSelectedSequence] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [repeat, setRepeat] = useState(false);

  // Fetch available playlists
  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const response = await fetch('/api/fpp/playlists/list');
        if (response.ok) {
          const data = await response.json();
          setPlaylists(data || []);
          if (data.length > 0) {
            setSelectedPlaylist(data[0].name);
          }
        }
      } catch (error) {
        console.error('Failed to fetch playlists:', error);
      }
    };

    fetchPlaylists();
  }, []);

  // Fetch available sequences
  useEffect(() => {
    const fetchSequences = async () => {
      try {
        const response = await fetch('/api/fpp/sequences/list');
        if (response.ok) {
          const data = await response.json();
          setSequences(data || []);
          if (data.length > 0) {
            setSelectedSequence(data[0].name);
          }
        }
      } catch (error) {
        console.error('Failed to fetch sequences:', error);
      }
    };

    fetchSequences();
  }, []);

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
    sendCommand('Start Playlist', [selectedPlaylist, repeat, false]);
  };

  const stopPlaylist = () => {
    sendCommand('Stop Gracefully', [false]);
  };

  const stopNow = () => {
    sendCommand('Stop Now', []);
  };

  const nextItem = () => {
    sendCommand('Next Playlist Item', []);
  };

  const prevItem = () => {
    sendCommand('Prev Playlist Item', []);
  };

  const startRandom = () => {
    if (!selectedPlaylist) {
      showMessage('error', 'Please select a playlist');
      return;
    }
    sendCommand('Start Playlist At Random Item', [selectedPlaylist, repeat, false]);
  };

  // Sequence Controls
  const startSequence = () => {
    if (!selectedSequence) {
      showMessage('error', 'Please select a sequence');
      return;
    }
    // Remove .fseq extension if present
    const sequenceName = selectedSequence.replace(/\.fseq$/i, '');
    sendCommand('FSEQ Effect Start', [sequenceName, false, false]);
  };

  const stopSequence = () => {
    if (!selectedSequence) {
      showMessage('error', 'Please select a sequence');
      return;
    }
    const sequenceName = selectedSequence.replace(/\.fseq$/i, '');
    sendCommand('FSEQ Effect Stop', [sequenceName]);
  };

  const stopAllEffects = () => {
    sendCommand('Effects Stop', []);
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white mb-4">Playlist & Sequence Controls</h2>

      {/* Status Message */}
      {message && (
        <div
          className={`p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-600/20 text-green-400 border border-green-600/30'
              : 'bg-red-600/20 text-red-400 border border-red-600/30'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Playlist Controls */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white">Playlists</h3>
        
        <div className="flex gap-3">
          <select
            value={selectedPlaylist}
            onChange={(e) => setSelectedPlaylist(e.target.value)}
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            disabled={loading}
          >
            {playlists.length === 0 ? (
              <option>No playlists available</option>
            ) : (
              playlists.map((playlist) => (
                <option key={playlist.name} value={playlist.name}>
                  {playlist.name}
                </option>
              ))
            )}
          </select>

          <label className="flex items-center gap-2 text-white bg-gray-700 px-4 py-2 rounded-lg border border-gray-600 cursor-pointer hover:bg-gray-600 transition">
            <input
              type="checkbox"
              checked={repeat}
              onChange={(e) => setRepeat(e.target.checked)}
              className="w-4 h-4"
              disabled={loading}
            />
            <Repeat size={18} />
            Repeat
          </label>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button
            onClick={startPlaylist}
            disabled={loading || !selectedPlaylist}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition shadow-lg"
          >
            <Play size={20} />
            Start
          </button>

          <button
            onClick={startRandom}
            disabled={loading || !selectedPlaylist}
            className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition shadow-lg"
          >
            <Shuffle size={20} />
            Random
          </button>

          <button
            onClick={stopPlaylist}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition shadow-lg"
          >
            <Square size={20} />
            Stop Gracefully
          </button>

          <button
            onClick={stopNow}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition shadow-lg"
          >
            <Square size={20} />
            Stop Now
          </button>

          <button
            onClick={prevItem}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition shadow-lg"
          >
            <SkipBack size={20} />
            Previous
          </button>

          <button
            onClick={nextItem}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition shadow-lg"
          >
            <SkipForward size={20} />
            Next
          </button>
        </div>
      </div>

      {/* Sequence Controls */}
      <div className="space-y-4 border-t border-gray-700 pt-6">
        <h3 className="text-xl font-semibold text-white">Sequences (FSEQ)</h3>
        
        <select
          value={selectedSequence}
          onChange={(e) => setSelectedSequence(e.target.value)}
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
          disabled={loading}
        >
          {sequences.length === 0 ? (
            <option>No sequences available</option>
          ) : (
            sequences.map((sequence) => (
              <option key={sequence.name} value={sequence.name}>
                {sequence.name}
              </option>
            ))
          )}
        </select>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={startSequence}
            disabled={loading || !selectedSequence}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition shadow-lg"
          >
            <Play size={20} />
            Start Sequence
          </button>

          <button
            onClick={stopSequence}
            disabled={loading || !selectedSequence}
            className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition shadow-lg"
          >
            <Square size={20} />
            Stop Sequence
          </button>

          <button
            onClick={stopAllEffects}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition shadow-lg"
          >
            <Square size={20} />
            Stop All
          </button>
        </div>
      </div>
    </div>
  );
}
