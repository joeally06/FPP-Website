import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { 
  getCurrentlyPlaying, 
  getQueue, 
  updateQueueStatus,
  updateStartTimeAndDuration
} from '@/lib/database';

interface QueueItem {
  id: number;
  sequence_name: string;
  media_name?: string;
  requester_name: string;
  status: string;
  created_at: string;
  played_at?: string;
  original_playlist?: string;
  original_item_index?: number;
  was_resumed?: boolean;
  started_at?: string;
  duration_ms?: number;
}

interface FppStatus {
  status_name: string;
  current_sequence?: string;
  current_song?: string;
  current_playlist?: { 
    playlist: string;
    index: number;
  };
  current_sequence_filename?: string;
  seconds_elapsed?: number;
  seconds_remaining?: number;
}

// Simplified state machine for queue processing using Insert Playlist Immediate
type ProcessingState = 'IDLE' | 'MONITORING_SEQUENCE';

let processingState: ProcessingState = 'IDLE';
let sequenceStartTime: number | null = null;
let currentQueueItemId: number | null = null;

// Helper function to sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to make FPP API calls
async function makeFppCall(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  const fppUrl = process.env.FPP_URL || 'http://192.168.5.2:80';
  const url = `${fppUrl}${endpoint}`;
  
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const text = await response.text();
    
    if (!response.ok) {
      console.error(`[FPP API Error] ${endpoint}: ${text}`);
      return null;
    }
    
    if (text) {
      try {
        return JSON.parse(text);
      } catch (e) {
        return { success: true, response: text };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error(`[FPP API Exception] ${endpoint}:`, error);
    return null;
  }
}

// Insert playlist immediately - FPP pauses current, plays this, then resumes
async function insertPlaylistImmediate(sequenceName: string): Promise<boolean> {
  const fullSequenceName = sequenceName.endsWith('.fseq') 
    ? sequenceName
    : `${sequenceName}.fseq`;

  console.log(`[Queue] Inserting playlist immediate: ${fullSequenceName}`);

  // Use Insert Playlist Immediate command
  // Args: [name, startItem, endItem, ifNotRunning]
  // startItem=0, endItem=0 to play just the first item
  const result = await makeFppCall('/api/command', 'POST', {
    command: 'Insert Playlist Immediate',
    args: [fullSequenceName, 0, 0, false]
  });

  if (!result) {
    console.error(`[Queue] Failed to insert playlist: ${fullSequenceName}`);
    return false;
  }

  console.log(`[Queue] Insert response: ${result.response || 'success'}`);
  sequenceStartTime = Date.now();
  return true;
}

// Simplified state machine processing with Insert Playlist Immediate
async function processQueueStateMachine(fppStatus: FppStatus): Promise<void> {
  console.log(`[Queue] State: ${processingState}, FPP: ${fppStatus.status_name}, Current: ${fppStatus.current_sequence || 'none'}`);

  switch (processingState) {
    case 'IDLE': {
      // Check for pending queue items
      const queue = getQueue.all() as QueueItem[];
      const pendingItem = queue.length > 0 ? queue[0] : null;

      if (!pendingItem) {
        return;
      }

      console.log(`[Queue] Processing queue item: ${pendingItem.sequence_name}`);
      currentQueueItemId = pendingItem.id;
      
      // Use Insert Playlist Immediate - FPP handles pause/resume automatically
      const inserted = await insertPlaylistImmediate(pendingItem.sequence_name);
      
      if (inserted) {
        updateQueueStatus.run('playing', pendingItem.id);
        processingState = 'MONITORING_SEQUENCE';
        
        // Record start time
        const defaultDurationMs = 5 * 60 * 1000; // 5 minutes default
        updateStartTimeAndDuration.run(defaultDurationMs, pendingItem.id);
        
        console.log('[Queue] Sequence inserted, now monitoring...');
      } else {
        console.error('[Queue] Failed to insert sequence');
        updateQueueStatus.run('completed', pendingItem.id);
      }
      break;
    }

    case 'MONITORING_SEQUENCE': {
      if (!currentQueueItemId) {
        processingState = 'IDLE';
        return;
      }

      const currentlyPlaying = getCurrentlyPlaying.get() as QueueItem | undefined;

      if (!currentlyPlaying || currentlyPlaying.id !== currentQueueItemId) {
        processingState = 'IDLE';
        currentQueueItemId = null;
        sequenceStartTime = null;
        return;
      }

      const expectedSeq = currentlyPlaying.sequence_name.endsWith('.fseq')
        ? currentlyPlaying.sequence_name
        : `${currentlyPlaying.sequence_name}.fseq`;

      // Check if sequence finished (FPP no longer playing it)
      const sequenceFinished = !fppStatus.current_sequence || 
                              fppStatus.current_sequence !== expectedSeq;

      // Also check minimum play time (at least 10 seconds)
      const minPlayTime = sequenceStartTime && (Date.now() - sequenceStartTime) > 10000;

      if (sequenceFinished && minPlayTime) {
        console.log('[Queue] Sequence finished, FPP will auto-resume original playlist');
        
        // Mark as completed - FPP handles resume automatically
        updateQueueStatus.run('completed', currentQueueItemId);
        
        // Reset state
        processingState = 'IDLE';
        currentQueueItemId = null;
        sequenceStartTime = null;
      } else if (sequenceFinished && !minPlayTime) {
        console.log('[Queue] Sequence ended too quickly, might be an error - treating as finished');
        updateQueueStatus.run('completed', currentQueueItemId);
        
        processingState = 'IDLE';
        currentQueueItemId = null;
        sequenceStartTime = null;
      } else {
        console.log(`[Queue] Monitoring... Current: ${fppStatus.current_sequence}`);
      }
      break;
    }
  }
}

/**
 * POST /api/jukebox/process-queue
 * Process the jukebox queue (background job)
 * PUBLIC - Processes queue items automatically (anyone can request songs)
 */
export async function POST() {
  try {
    // Note: No auth required - this processes public queue requests
    // Queue items are added by anyone, this just plays them in order
    
    console.log('[Queue] Starting queue processing...');

    // Get FPP status
    const fppStatus = await makeFppCall('/api/fppd/status') as FppStatus;
    if (!fppStatus) {
      console.error('[Queue] Could not fetch FPP status');
      return NextResponse.json({ error: 'Could not connect to FPP' }, { status: 500 });
    }

    // Run state machine
    await processQueueStateMachine(fppStatus);

    return NextResponse.json({ success: true, state: processingState });

  } catch (error: any) {
    if (error.message?.includes('Authentication required')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    console.error('[Queue] Unexpected error:', error);
    return NextResponse.json({ error: 'Queue processing failed', details: String(error) }, { status: 500 });
  }
}

