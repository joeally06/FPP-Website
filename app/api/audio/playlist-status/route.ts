import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';
import Database from 'better-sqlite3';

const DATA_DIR = join(process.cwd(), 'data');
const MAPPING_FILE = join(DATA_DIR, 'audio-mapping.json');
const AUDIO_DIR = join(process.cwd(), 'public', 'audio');
const DB_PATH = join(process.cwd(), 'votes.db');

interface PlaylistSequenceStatus {
  sequenceName: string;
  mediaName: string | null;  // The audio file name from FPP playlist
  audioFile: string | null;  // Local audio file if found
  hasLocalAudio: boolean;
  hasMapping: boolean;
  status: 'ready' | 'needs-download' | 'needs-mapping';
}

/**
 * GET /api/audio/playlist-status?playlist=PlaylistName
 * Get audio sync status for all sequences in a playlist
 * ADMIN ONLY
 */
export async function GET(request: NextRequest) {
  let db: Database.Database | null = null;
  
  try {
    // SECURITY: Verify admin authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get playlist name from query
    const { searchParams } = new URL(request.url);
    const playlistName = searchParams.get('playlist');

    if (!playlistName) {
      return NextResponse.json(
        { error: 'Playlist name is required' },
        { status: 400 }
      );
    }

    // Read playlist directly from database cache
    db = new Database(DB_PATH);
    const cachedPlaylist = db.prepare(`
      SELECT raw_data FROM fpp_playlists WHERE name = ?
    `).get(playlistName) as { raw_data: string } | undefined;
    
    db.close();
    db = null;

    if (!cachedPlaylist) {
      return NextResponse.json(
        { error: 'Playlist not found in cache. Please sync FPP data first.' },
        { status: 404 }
      );
    }

    const playlist = JSON.parse(cachedPlaylist.raw_data);

    // Get all sequences from playlist with their media names
    const allItems = [
      ...(playlist.leadIn || []),
      ...(playlist.mainPlaylist || []),
      ...(playlist.leadOut || [])
    ];

    // Build sequence info with mediaName from playlist
    const sequenceInfo = allItems
      .filter((item: any) => item.sequenceName)
      .map((item: any) => ({
        sequenceName: item.sequenceName.replace(/\.fseq$/i, ''),
        mediaName: item.mediaName || null  // The audio file name from FPP
      }));

    // Load existing mappings
    let mappings: Record<string, string> = {};
    if (existsSync(MAPPING_FILE)) {
      try {
        const content = await readFile(MAPPING_FILE, 'utf-8');
        mappings = JSON.parse(content);
      } catch (error) {
        console.warn('[Audio Playlist Status] Failed to read mappings');
      }
    }

    // Get local audio files
    let localFiles: string[] = [];
    if (existsSync(AUDIO_DIR)) {
      localFiles = readdirSync(AUDIO_DIR).filter(f => 
        f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.ogg') || 
        f.endsWith('.m4a') || f.endsWith('.flac') || f.endsWith('.aac')
      );
    }

    // Normalize helper
    const normalize = (str: string) => {
      return str
        .toLowerCase()
        .replace(/['']/g, '')
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Find audio file for sequence
    const findAudioFile = (seqName: string): string | null => {
      // Check mappings first
      const mappedFile = mappings[seqName] || mappings[`${seqName}.fseq`];
      if (mappedFile && localFiles.includes(mappedFile)) {
        return mappedFile;
      }

      // Auto-match by name
      const normalizedSeq = normalize(seqName);
      for (const audioFile of localFiles) {
        const audioBase = audioFile.replace(/\.(mp3|wav|ogg|m4a|flac|aac)$/i, '');
        if (normalize(audioBase) === normalizedSeq) {
          return audioFile;
        }
      }

      return null;
    };

    // Build status for each sequence
    const sequences: PlaylistSequenceStatus[] = sequenceInfo.map(({ sequenceName, mediaName }) => {
      const audioFile = findAudioFile(sequenceName);
      const hasLocalAudio = audioFile !== null;
      const hasMapping = !!(mappings[sequenceName] || mappings[`${sequenceName}.fseq`]);

      let status: 'ready' | 'needs-download' | 'needs-mapping';
      if (hasLocalAudio) {
        status = 'ready';
      } else if (mediaName) {
        // Has mediaName from FPP, can be downloaded
        status = 'needs-download';
      } else {
        // No mediaName and no local file - needs manual mapping
        status = 'needs-mapping';
      }

      return {
        sequenceName,
        mediaName,
        audioFile,
        hasLocalAudio,
        hasMapping,
        status
      };
    });

    console.log(`[Audio Playlist Status] Returning ${sequences.length} sequences for playlist "${playlistName}"`);

    return NextResponse.json({
      playlist: playlistName,
      sequences,
      stats: {
        total: sequences.length,
        ready: sequences.filter(s => s.status === 'ready').length,
        needsDownload: sequences.filter(s => s.status === 'needs-download').length,
        needsMapping: sequences.filter(s => s.status === 'needs-mapping').length
      }
    });

  } catch (error: any) {
    console.error('[Audio Playlist Status] Error:', error.message);
    
    return NextResponse.json(
      { error: 'Failed to get playlist status' },
      { status: 500 }
    );
  } finally {
    if (db) {
      db.close();
    }
  }
}
