import { NextResponse } from 'next/server';
import { clearCachedSequences, insertCachedSequence } from '@/lib/database';

export async function POST() {
  try {
    // First, get scheduled playlists
    const scheduleResponse = await fetch(`${process.env.FPP_URL || 'http://localhost:32322'}/api/schedule`);
    if (!scheduleResponse.ok) throw new Error('Failed to fetch schedule');
    const schedule = await scheduleResponse.json();

    const playlistNames = new Set<string>();
    schedule.forEach((entry: any) => {
      if (entry.playlist) {
        playlistNames.add(entry.playlist);
      }
    });

    // Then, get sequences from each scheduled playlist
    const sequenceSet = new Set<string>();
    for (const playlistName of playlistNames) {
      try {
        const playlistResponse = await fetch(`${process.env.FPP_URL || 'http://localhost:32322'}/api/playlist/${encodeURIComponent(playlistName)}`);
        if (playlistResponse.ok) {
          const playlist = await playlistResponse.json();
          // Extract from leadIn
          if (playlist.leadIn) {
            playlist.leadIn.forEach((item: any) => {
              if (item.sequenceName) {
                sequenceSet.add(item.sequenceName);
              }
            });
          }
          // Extract from mainPlaylist
          if (playlist.mainPlaylist) {
            playlist.mainPlaylist.forEach((item: any) => {
              if (item.sequenceName) {
                sequenceSet.add(item.sequenceName);
              }
            });
          }
        }
      } catch (err) {
        console.error(`Failed to fetch playlist ${playlistName}:`, err);
      }
    }

    // Clear existing cache and insert new sequences
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
    return NextResponse.json({ error: 'Failed to refresh sequence cache' }, { status: 500 });
  }
}
