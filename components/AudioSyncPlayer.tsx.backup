'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Play, Pause, Radio } from 'lucide-react';

interface AudioSyncPlayerProps {
  className?: string;
}

interface SyncState {
  isPlaying: boolean;
  currentSequence: string | null;
  audioFile: string | null;
  position: number; // Current playback position in seconds
  timestamp: number; // Server timestamp
}

export default function AudioSyncPlayer({ className = '' }: AudioSyncPlayerProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [error, setError] = useState<string | null>(null);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [isManuallyPlaying, setIsManuallyPlaying] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wsRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audio.preload = 'auto';
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // EventSource (SSE) connection
  useEffect(() => {
    connectEventSource();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const connectEventSource = () => {
    try {
      const eventSource = new EventSource('/api/audio/sync');
      wsRef.current = eventSource as any;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const data: SyncState = JSON.parse(event.data);
          handleSyncUpdate(data);
        } catch (err) {
          console.error('[Audio Sync] Parse error:', err);
        }
      };

      eventSource.onerror = (error) => {
        console.error('[Audio Sync] EventSource error:', error);
        setIsConnected(false);
        setError('Connection error');
        eventSource.close();
        
        // Attempt reconnection after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[Audio Sync] Reconnecting...');
          connectEventSource();
        }, 5000);
      };
    } catch (err) {
      console.error('[Audio Sync] Connection failed:', err);
      setError('Failed to connect');
    }
  };

  const handleSyncUpdate = (data: SyncState) => {
    setSyncState(data);

    if (!audioRef.current) return;

    // If no audio file or sequence stopped, pause
    if (!data.audioFile || !data.isPlaying) {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
        audioRef.current.playbackRate = 1.0; // Reset playback rate
      }
      return;
    }

    // Load new audio file if changed
    const newAudioUrl = `${window.location.origin}/audio/${data.audioFile}`;
    const currentSrc = audioRef.current.src;
    
    if (currentSrc !== newAudioUrl) {
      audioRef.current.src = newAudioUrl;
      audioRef.current.load();
      audioRef.current.playbackRate = 1.0; // Reset playback rate for new file
    }

    // Calculate drift
    const targetPosition = data.position + (Date.now() - data.timestamp) / 1000;
    const currentPosition = audioRef.current.currentTime;
    const drift = targetPosition - currentPosition; // Signed drift (positive = behind, negative = ahead)
    const absDrift = Math.abs(drift);

    // Strategy for smooth sync:
    // 1. Large drift (>10s): Hard seek - something went very wrong
    // 2. Medium drift (3-10s): Gradual speed adjustment - smooth catch-up
    // 3. Small drift (<3s): Normal playback - let it naturally align
    
    if (isManuallyPaused || audioRef.current.paused) {
      // When paused, always update position so it's ready when resumed
      audioRef.current.currentTime = targetPosition;
      audioRef.current.playbackRate = 1.0;
    } else if (absDrift > 10.0) {
      // Hard sync for large drift - something went wrong
      console.log(`[Audio Sync] Hard sync: drift=${absDrift.toFixed(2)}s`);
      audioRef.current.currentTime = targetPosition;
      audioRef.current.playbackRate = 1.0;
    } else if (absDrift > 3.0) {
      // Gradual speed adjustment for medium drift
      // Speed up/slow down playback to gently catch up without jarring seeks
      if (drift > 0) {
        // We're behind - speed up slightly (1.05x to 1.15x)
        const speedAdjustment = Math.min(1.15, 1.0 + (absDrift / 20));
        audioRef.current.playbackRate = speedAdjustment;
        console.log(`[Audio Sync] Gradual catch-up: drift=${drift.toFixed(2)}s, rate=${speedAdjustment.toFixed(2)}x`);
      } else {
        // We're ahead - slow down slightly (0.85x to 0.95x)
        const speedAdjustment = Math.max(0.85, 1.0 - (absDrift / 20));
        audioRef.current.playbackRate = speedAdjustment;
        console.log(`[Audio Sync] Gradual slow-down: drift=${drift.toFixed(2)}s, rate=${speedAdjustment.toFixed(2)}x`);
      }
    } else {
      // Small drift - maintain normal playback rate
      // Only reset to 1.0 if it's not already close to avoid micro-adjustments
      if (Math.abs(audioRef.current.playbackRate - 1.0) > 0.01) {
        audioRef.current.playbackRate = 1.0;
        console.log(`[Audio Sync] Sync achieved: drift=${drift.toFixed(2)}s, resetting to 1.0x`);
      }
    }

    // Auto-play if show is playing and user wants to play (not manually paused)
    if (audioRef.current.paused && data.isPlaying && isManuallyPlaying) {
      audioRef.current.play().catch((err) => {
        console.error('[Audio Sync] Auto-play prevented:', err);
        // Don't show error - this is expected browser behavior
      });
    }
  };

  const handlePlay = () => {
    if (!audioRef.current || !syncState) return;
    
    // Sync position before playing
    const targetPosition = syncState.position + (Date.now() - syncState.timestamp) / 1000;
    audioRef.current.currentTime = targetPosition;
    
    // Reset playback rate to normal when user manually plays
    audioRef.current.playbackRate = 1.0;
    
    // Enable auto-play and play
    setIsManuallyPlaying(true);
    setIsManuallyPaused(false);
    setError(null); // Clear any previous errors
    audioRef.current.play().catch((err) => {
      console.error('[Audio Sync] Play failed:', err);
      // Don't show error - user can try again
    });
  };

  const handlePause = () => {
    if (!audioRef.current) return;
    setIsManuallyPaused(true);
    setIsManuallyPlaying(false);
    audioRef.current.playbackRate = 1.0; // Reset playback rate when paused
    audioRef.current.pause();
  };

  const handleStop = () => {
    if (!audioRef.current || !syncState) return;
    
    // Stop playback and reset rate
    setIsManuallyPaused(true);
    setIsManuallyPlaying(false);
    audioRef.current.playbackRate = 1.0; // Reset playback rate when stopped
    audioRef.current.pause();
    
    // Sync to current show position (not zero)
    const targetPosition = syncState.position + (Date.now() - syncState.timestamp) / 1000;
    audioRef.current.currentTime = targetPosition;
  };

  return (
    <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border-purple-500/30 backdrop-blur-md rounded-xl shadow-2xl p-6 border">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-white">
        <Radio className={`w-6 h-6 ${isConnected ? 'text-green-400 animate-pulse' : 'text-gray-400'}`} />
        Live Audio Sync
      </h2>
      
      <div className="bg-white/5 border border-white/20 rounded-xl p-4 backdrop-blur-sm">
        <p className="text-white/80 text-sm mb-4">
          {isConnected 
            ? syncState?.currentSequence 
              ? `Now Playing: ${syncState.currentSequence}`
              : 'Connected - waiting for show to start...'
            : 'Connecting...'}
        </p>
        
        {/* Connection Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-xs text-white/70">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {syncState?.audioFile && (
            <span className="text-xs text-white/50">
              {syncState.audioFile}
            </span>
          )}
        </div>

        {/* Playback Controls */}
        {syncState?.audioFile && (
          <div className="flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePlay}
              disabled={!audioRef.current?.paused}
              className="h-10 w-10 p-0 hover:bg-white/20 disabled:opacity-50"
              title="Play"
            >
              <Play className="h-5 w-5 fill-current" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePause}
              disabled={audioRef.current?.paused}
              className="h-10 w-10 p-0 hover:bg-white/20 disabled:opacity-50"
              title="Pause"
            >
              <Pause className="h-5 w-5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleStop}
              className="h-10 w-10 p-0 hover:bg-white/20"
              title="Stop"
            >
              <span className="text-lg font-bold">■</span>
            </Button>
          </div>
        )}

        {/* Volume Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white">Volume</label>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMuted(!isMuted)}
              className="h-8 w-8 p-0"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume * 100}
            onChange={(e) => {
              const newVolume = parseInt(e.target.value) / 100;
              setVolume(newVolume);
              if (newVolume > 0) setIsMuted(false);
            }}
            className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <div className="text-xs text-white/60 text-center">
            {isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}
          </div>
        </div>

        {/* Instructions */}
        {!syncState?.isPlaying && (
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
            <p className="text-sm text-blue-200">
              🎵 Your audio will automatically sync with the light show when it starts!
            </p>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-white/50 text-center pt-3 mt-3 border-t border-white/10">
          Audio syncs automatically with the light show. Keep your device volume up!
        </div>
      </div>
    </div>
  );
}
