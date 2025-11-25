import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// FPP Configuration
const FPP_URL = process.env.FPP_URL || 'http://192.168.5.2';

interface SyncState {
  isPlaying: boolean;
  currentSequence: string | null;
  audioFile: string | null;
  position: number; // seconds
  timestamp: number; // Date.now()
}

// Store SSE clients (controller objects)
const clients = new Set<ReadableStreamDefaultController>();
let currentState: SyncState = {
  isPlaying: false,
  currentSequence: null,
  audioFile: null,
  position: 0,
  timestamp: Date.now(),
};

// Load available audio files
let availableAudioFiles: string[] = [];
async function loadAvailableAudioFiles() {
  try {
    const audioDir = path.join(process.cwd(), 'public', 'audio');
    const files = await fs.readdir(audioDir);
    availableAudioFiles = files.filter(f => 
      f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.ogg') || 
      f.endsWith('.m4a') || f.endsWith('.flac') || f.endsWith('.aac')
    );
    console.log('[Audio Sync] Found audio files:', availableAudioFiles.length);
  } catch (error) {
    console.error('[Audio Sync] Failed to load audio files:', error);
    availableAudioFiles = [];
  }
}

// Auto-match sequence to audio file
function findAudioForSequence(sequenceName: string): string | null {
  if (!sequenceName) return null;
  
  // Remove .fseq extension if present
  const baseName = sequenceName.replace(/\.fseq$/i, '');
  
  // Normalize for comparison (lowercase, replace special chars with spaces)
  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .replace(/['']/g, '') // Remove apostrophes
      .replace(/[_-]/g, ' ') // Replace underscores/hyphens with spaces
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .trim();
  };
  
  const normalizedBase = normalize(baseName);
  
  // Try exact match first (after normalization)
  for (const audioFile of availableAudioFiles) {
    const audioBase = audioFile.replace(/\.(mp3|wav|ogg|m4a|flac|aac)$/i, '');
    const normalizedAudio = normalize(audioBase);
    
    if (normalizedAudio === normalizedBase) {
      console.log('[Audio Sync] Matched:', sequenceName, '→', audioFile);
      return audioFile;
    }
  }
  
  // Try partial match (sequence name contains audio name or vice versa)
  for (const audioFile of availableAudioFiles) {
    const audioBase = audioFile.replace(/\.(mp3|wav|ogg|m4a|flac|aac)$/i, '');
    const normalizedAudio = normalize(audioBase);
    
    if (normalizedBase.includes(normalizedAudio) || normalizedAudio.includes(normalizedBase)) {
      console.log('[Audio Sync] Partial match:', sequenceName, '→', audioFile);
      return audioFile;
    }
  }
  
  console.log('[Audio Sync] No match found for:', sequenceName);
  return null;
}

// Poll FPP status
let pollingInterval: NodeJS.Timeout | null = null;
let lastBroadcastTime = 0;
async function pollFPPStatus() {
  try {
    const response = await fetch(`${FPP_URL}/api/fppd/status`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`FPP status failed: ${response.status}`);
    }

    const status = await response.json();
    
    // Extract current sequence info
    const isPlaying = status.status_name === 'playing';
    const currentSequence = status.current_sequence || null;
    const position = parseFloat(status.seconds_played || '0');

    // Auto-match audio file from available files
    const audioFile = currentSequence ? findAudioForSequence(currentSequence) : null;

    // Update state if changed
    const newState: SyncState = {
      isPlaying,
      currentSequence,
      audioFile,
      position,
      timestamp: Date.now(),
    };

    // Only broadcast if state changed significantly
    const stateChanged = 
      newState.isPlaying !== currentState.isPlaying ||
      newState.currentSequence !== currentState.currentSequence ||
      newState.audioFile !== currentState.audioFile;
    
    const now = Date.now();
    const timeSinceLastBroadcast = now - lastBroadcastTime;
    
    // Broadcast if:
    // 1. State changed (sequence/playing status)
    // 2. Playing AND 20+ seconds since last broadcast (periodic sync)
    const shouldBroadcast = stateChanged || (isPlaying && timeSinceLastBroadcast > 20000);
    
    if (shouldBroadcast) {
      if (stateChanged) {
        console.log('[Audio Sync] State changed:', {
          isPlaying,
          currentSequence,
          audioFile,
          position: position.toFixed(2),
        });
      }
      currentState = newState;
      broadcast(currentState);
      lastBroadcastTime = now;
    } else {
      // Just update position silently
      currentState.position = position;
      currentState.timestamp = Date.now();
    }
  } catch (error) {
    console.error('[Audio Sync] FPP poll error:', error);
  }
}

// Broadcast to all SSE clients
function broadcast(data: SyncState) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  const deadClients: ReadableStreamDefaultController[] = [];
  
  clients.forEach((controller) => {
    try {
      controller.enqueue(message);
    } catch (error) {
      console.error('[Audio Sync] Broadcast error:', error);
      deadClients.push(controller);
    }
  });
  
  // Remove dead clients
  deadClients.forEach((client) => clients.delete(client));
  
  if (clients.size > 0) {
    console.log('[Audio Sync] Broadcasted to', clients.size, 'clients');
  }
}

// Initialize polling
if (!pollingInterval) {
  loadAvailableAudioFiles();
  pollingInterval = setInterval(() => {
    pollFPPStatus();
    // Refresh audio file list every 30 seconds
    if (Math.random() < 0.017) { // ~1/60 chance per poll = every 2 minutes
      loadAvailableAudioFiles();
    }
  }, 2000);
  console.log('[Audio Sync] Started FPP polling');
}

// Server-Sent Events endpoint
export async function GET(req: NextRequest) {
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Add client to set
      clients.add(controller);
      console.log('[Audio Sync] Client connected. Total clients:', clients.size);
      
      // Send current state immediately
      const message = `data: ${JSON.stringify(currentState)}\n\n`;
      try {
        controller.enqueue(message);
      } catch (error) {
        console.error('[Audio Sync] Initial send error:', error);
      }
      
      // Keep-alive ping every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(': ping\n\n');
        } catch (error) {
          clearInterval(keepAlive);
          clients.delete(controller);
        }
      }, 30000);
      
      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        clients.delete(controller);
        console.log('[Audio Sync] Client disconnected. Total clients:', clients.size);
        try {
          controller.close();
        } catch (error) {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

// Reload audio files endpoint (for admin updates)
export async function POST(req: NextRequest) {
  try {
    await loadAvailableAudioFiles();
    return new Response(JSON.stringify({ 
      success: true, 
      audioFiles: availableAudioFiles.length 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: String(error) 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
