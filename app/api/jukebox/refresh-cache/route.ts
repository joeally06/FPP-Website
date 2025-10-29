import { NextResponse } from 'next/server';
import { clearCachedSequences, insertCachedSequence } from '@/lib/database';

export async function POST() {
  try {
    // Retry logic for FPP connection
    let scheduleResponse;
    let retries = 3;
    let lastError;
    
    while (retries > 0) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        scheduleResponse = await fetch(`${process.env.FPP_URL || 'http://192.168.5.2:80'}/api/schedule`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        retries--;
        if (retries === 0) throw error;
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
    console.error('Error refreshing sequence cache:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to refresh sequence cache';
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Cannot connect to FPP server. Please check that FPP is running and accessible.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Connection to FPP server timed out. Please try again.';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Request to FPP server was cancelled. Please try again.';
      }
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
