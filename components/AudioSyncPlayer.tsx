'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Play, Pause, Radio } from 'lucide-react';

interface AudioSyncPlayerProps {
  className?: string;
}

interface SyncState {
  isPlaying: boolean;
  currentSequence: string | null;
  audioFile: string | null;
  position: number; // Server's playback position in seconds
  timestamp: number; // Server timestamp when position was captured
}

type SyncStatus = 'synced' | 'adjusting' | 'seeking';

export default function AudioSyncPlayer({ className = '' }: AudioSyncPlayerProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [driftMs, setDriftMs] = useState<number>(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSeekingRef = useRef(false);
  const isManuallyPausedRef = useRef(false);
  const hasUserInteractedRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    isManuallyPausedRef.current = isManuallyPaused;
  }, [isManuallyPaused]);

  // Calculate where audio SHOULD be right now based on server state
  const calculateTargetPosition = useCallback((state: SyncState): number => {
    // Time elapsed since the server captured the position
    const elapsed = (Date.now() - state.timestamp) / 1000;
    // Target = server position + time elapsed since then
    return state.position + elapsed;
  }, []);

  // Sync audio to target position - called periodically when playing
  const syncAudio = useCallback(() => {
    if (!audioRef.current || !syncState || isSeekingRef.current || !syncState.isPlaying) return;
    if (isManuallyPausedRef.current) return;
    
    const audio = audioRef.current;
    if (audio.paused) return; // Don't sync if audio isn't playing
    
    const targetPosition = calculateTargetPosition(syncState);
    const currentPosition = audio.currentTime;
    
    // Calculate drift: positive = audio is ahead, negative = audio is behind
    const currentDrift = (currentPosition - targetPosition) * 1000;
    setDriftMs(Math.round(currentDrift));
    
    const absDrift = Math.abs(currentDrift);
    
    // Thresholds (in milliseconds)
    const SYNC_THRESHOLD = 100;      // Under 100ms = perfectly synced
    const SOFT_THRESHOLD = 500;      // Under 500ms = soft correction via playback rate
    const HARD_THRESHOLD = 2000;     // Over 2000ms = hard seek
    
    if (absDrift < SYNC_THRESHOLD) {
      // In sync - reset playback rate if needed
      if (Math.abs(audio.playbackRate - 1.0) > 0.01) {
        audio.playbackRate = 1.0;
      }
      setSyncStatus('synced');
    } else if (absDrift < SOFT_THRESHOLD) {
      // Soft correction - adjust playback rate slightly
      // If audio is ahead (positive drift), slow down
      // If audio is behind (negative drift), speed up
      const correction = currentDrift > 0 ? 0.97 : 1.03;
      audio.playbackRate = correction;
      setSyncStatus('adjusting');
    } else if (absDrift < HARD_THRESHOLD) {
      // Medium correction - stronger rate adjustment
      const correction = currentDrift > 0 ? 0.93 : 1.07;
      audio.playbackRate = correction;
      setSyncStatus('adjusting');
    } else {
      // Hard seek - too far off, just jump to correct position
      console.log(`[Audio Sync] Hard seek: drift=${absDrift.toFixed(0)}ms, jumping to ${targetPosition.toFixed(2)}s`);
      isSeekingRef.current = true;
      audio.currentTime = targetPosition;
      audio.playbackRate = 1.0;
      setSyncStatus('seeking');
      
      // Reset seeking flag after a short delay
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 500);
    }
  }, [syncState, calculateTargetPosition]);

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

  // Sync loop - run every 500ms when playing
  useEffect(() => {
    if (!syncState?.isPlaying || isManuallyPaused) return;
    
    const interval = setInterval(syncAudio, 500);
    return () => clearInterval(interval);
  }, [syncState?.isPlaying, isManuallyPaused, syncAudio]);

  // EventSource (SSE) connection
  useEffect(() => {
    connectEventSource();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const connectEventSource = () => {
    try {
      const eventSource = new EventSource('/api/audio/sync');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data: SyncState = JSON.parse(event.data);
          handleSyncUpdate(data);
        } catch (err) {
          console.error('[Audio Sync] Parse error:', err);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        
        // Attempt reconnection after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[Audio Sync] Reconnecting...');
          connectEventSource();
        }, 5000);
      };
    } catch (err) {
      console.error('[Audio Sync] Connection failed:', err);
    }
  };

  const handleSyncUpdate = (data: SyncState) => {
    setSyncState(data);

    if (!audioRef.current) return;
    const audio = audioRef.current;

    // If no audio file or sequence stopped, pause
    if (!data.audioFile || !data.isPlaying) {
      if (!audio.paused) {
        audio.pause();
        audio.playbackRate = 1.0;
      }
      return;
    }

    // Load new audio file if changed
    const expectedSrc = `/audio/${encodeURIComponent(data.audioFile)}`;
    let currentSrc = '';
    try {
      currentSrc = audio.src ? new URL(audio.src, window.location.origin).pathname : '';
    } catch {
      currentSrc = '';
    }
    
    // Normalize for comparison
    const normExpected = decodeURIComponent(expectedSrc).toLowerCase();
    const normCurrent = decodeURIComponent(currentSrc).toLowerCase();
    
    if (normExpected !== normCurrent) {
      console.log(`[Audio Sync] Loading new track: ${data.audioFile}`);
      audio.src = expectedSrc;
      audio.load();
      audio.playbackRate = 1.0;

      // Set up one-time listener for when audio is ready
      const onCanPlay = () => {
        if (data.isPlaying && hasUserInteractedRef.current && !isManuallyPausedRef.current && audioRef.current) {
          console.log('[Audio Sync] New track ready, starting playback');
          const targetPosition = calculateTargetPosition(data);
          audioRef.current.currentTime = Math.max(0, targetPosition);
          audioRef.current.play().catch(err => console.error('[Audio Sync] New track auto-play failed:', err));
        }
      };
      
      audio.addEventListener('canplay', onCanPlay, { once: true });
      return;
    }

    // If user has clicked play and show is playing, ensure audio is playing
    if (hasUserInteractedRef.current && !isManuallyPausedRef.current && audio.paused && data.isPlaying) {
      const targetPosition = calculateTargetPosition(data);
      audio.currentTime = targetPosition;
      audio.play().catch(err => console.error('[Audio Sync] Auto-play failed:', err));
    }
  };

  const handlePlay = () => {
    if (!audioRef.current || !syncState) return;
    
    hasUserInteractedRef.current = true;
    
    // Sync position before playing
    const targetPosition = calculateTargetPosition(syncState);
    audioRef.current.currentTime = targetPosition;
    audioRef.current.playbackRate = 1.0;
    
    setIsManuallyPaused(false);
    audioRef.current.play().catch((err) => {
      console.error('[Audio Sync] Play failed:', err);
    });
  };

  const handlePause = () => {
    if (!audioRef.current) return;
    setIsManuallyPaused(true);
    audioRef.current.playbackRate = 1.0;
    audioRef.current.pause();
  };

  const handleStop = () => {
    if (!audioRef.current || !syncState) return;
    
    setIsManuallyPaused(true);
    audioRef.current.playbackRate = 1.0;
    audioRef.current.pause();
    
    // Sync to current show position
    const targetPosition = calculateTargetPosition(syncState);
    audioRef.current.currentTime = targetPosition;
  };

  const getSyncStatusColor = (): string => {
    switch (syncStatus) {
      case 'synced': return 'text-green-400';
      case 'adjusting': return 'text-yellow-400';
      case 'seeking': return 'text-red-400';
    }
  };

  const getSyncStatusText = (): string => {
    switch (syncStatus) {
      case 'synced': return 'In Sync';
      case 'adjusting': return `Adjusting ${driftMs >= 0 ? '+' : ''}${driftMs}ms`;
      case 'seeking': return 'Seeking...';
    }
  };

  const getDriftColor = (): string => {
    const absDrift = Math.abs(driftMs);
    if (absDrift < 100) return 'text-green-400';
    if (absDrift < 500) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-linear-to-br from-purple-600/20 to-blue-600/20 border-purple-500/30 backdrop-blur-md rounded-xl shadow-2xl p-6 border">
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

        {/* Sync Quality Indicator */}
        {syncState?.isPlaying && !audioRef.current?.paused && (
          <div className="mb-3 bg-black/20 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/70">Status:</span>
              <span className={`text-xs font-semibold ${getSyncStatusColor()}`}>
                {getSyncStatusText()}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-white/50">Drift:</span>
              <span className={`text-xs font-mono ${getDriftColor()}`}>
                {driftMs >= 0 ? '+' : ''}{driftMs}ms
              </span>
            </div>
            {audioRef.current && Math.abs(audioRef.current.playbackRate - 1.0) > 0.01 && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-white/50">Speed:</span>
                <span className="text-xs font-mono text-purple-400">
                  {audioRef.current.playbackRate.toFixed(2)}x
                </span>
              </div>
            )}
          </div>
        )}

        {/* Playback Controls */}
        {syncState?.audioFile && (
          <div className="flex items-center justify-center gap-2 mb-4">
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
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 mt-4">
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
