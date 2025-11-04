import { NextResponse } from 'next/server';
import { clearCachedSequences, insertCachedSequence } from '@/lib/database';

export async function POST() {
  try {
    console.log('[Jukebox Cache] Starting refresh...');

    // Check FPP health first before attempting cache refresh
    try {
      const healthCheck = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/fpp/health`, {
        cache: 'no-store'
      });

      const healthData = await healthCheck.json();

      if (!healthData.online) {
        console.log('[Jukebox Cache] FPP is offline, skipping cache refresh');
        return NextResponse.json({
          success: false,
          error: 'FPP is offline',
          details: 'Cache refresh skipped - FPP server is not available',
          sequencesCached: 0
        }, { status: 503 });
      }
    } catch (healthError) {
      console.warn('[Jukebox Cache] Health check failed, proceeding with caution:', healthError);
    }

    // Retry logic for FPP connection
    let scheduleResponse;
    let retries = 3;
    let lastError;
    
    while (retries > 0) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        scheduleResponse = await fetch(`${process.env.FPP_URL || 'http://192.168.5.2:80'}/api/schedule`, {
          signal: controller.signal,
          cache: 'no-store'
        });
        
        clearTimeout(timeoutId);
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        retries--;
        console.warn(`[Jukebox Cache] Schedule fetch failed (${retries} retries left):`, error);
        if (retries === 0) {
          // Return early instead of throwing to prevent console spam
          return NextResponse.json({
            success: false,
            error: 'FPP server timeout',
            details: error instanceof Error && error.name === 'AbortError' 
              ? 'Request timed out after 5 seconds' 
              : (error instanceof Error ? error.message : 'Unknown error'),
            sequencesCached: 0
          }, { status: 503 });
        }
        // Wait 1 second before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!scheduleResponse || !scheduleResponse.ok) {
      const status = scheduleResponse ? scheduleResponse.status : 'unknown';
      throw new Error(`Failed to fetch schedule: ${status}`);
    }
    
    const schedule = await scheduleResponse.json();

    const playlistNames = new Set<string>();
    schedule.forEach((entry: any) => {
      if (entry.playlist) {
        playlistNames.add(entry.playlist);
      }
    });

    // Then, get sequence files from each scheduled playlist
    const sequenceSet = new Set<string>();
    for (const playlistName of playlistNames) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const playlistResponse = await fetch(`${process.env.FPP_URL || 'http://192.168.5.2:80'}/api/playlist/${encodeURIComponent(playlistName)}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (playlistResponse.ok) {
          const playlist = await playlistResponse.json();
          // Extract sequence names from leadIn and mainPlaylist
          if (playlist.leadIn) {
            playlist.leadIn.forEach((item: any) => {
              if (item.sequenceName) {
                // Remove .fseq extension and add to set
                const sequenceName = item.sequenceName.replace(/\.fseq$/i, '');
                sequenceSet.add(sequenceName);
              }
            });
          }
          // Extract from mainPlaylist
          if (playlist.mainPlaylist) {
            playlist.mainPlaylist.forEach((item: any) => {
              if (item.sequenceName) {
                // Remove .fseq extension and add to set
                const sequenceName = item.sequenceName.replace(/\.fseq$/i, '');
                sequenceSet.add(sequenceName);
              }
            });
          }
        } else {
          console.warn(`Failed to fetch playlist ${playlistName}: ${playlistResponse.status}`);
        }
      } catch (err) {
        console.warn(`Error fetching playlist ${playlistName}:`, err);
        // Continue with other playlists even if one fails
      }
    }

    // Clear existing cache and insert new sequence names
    clearCachedSequences.run();

    for (const sequenceName of sequenceSet) {
      insertCachedSequence.run(sequenceName);
    }

    return NextResponse.json({
      success: true,
      sequencesCached: sequenceSet.size,
      sequences: Array.from(sequenceSet).sort()
    });
  } catch (error) {
    console.error('[Jukebox Cache] Error refreshing sequence cache:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to refresh sequence cache';
    let errorDetails = error instanceof Error ? error.message : 'Unknown error';
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Cannot connect to FPP server';
        errorDetails = 'FPP is not running or not accessible at the configured address';
      } else if (error.message.includes('timeout') || error.name === 'AbortError') {
        errorMessage = 'FPP server timeout';
        errorDetails = 'The request took too long. FPP may be offline or overloaded.';
      }
    }
    
    return NextResponse.json({ 
      success: false,
      error: errorMessage,
      details: errorDetails,
      sequencesCached: 0
    }, { status: 500 });
  }
}
