import { NextRequest, NextResponse } from 'next/server';
import SpotifyWebApi from 'spotify-web-api-node';
import { getSequenceMetadata, upsertSequenceMetadata } from '@/lib/database';

// Initialize Spotify API
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

// Get access token
async function getSpotifyAccessToken() {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);
    return true;
  } catch (error) {
    console.error('Failed to get Spotify access token:', error);
    return false;
  }
}

// Clean sequence name for search (remove file extensions, clean up formatting)
function cleanSequenceName(sequenceName: string): string {
  return sequenceName
    .replace(/\.(fseq|mp3|wav)$/i, '') // Remove file extensions
    .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

// Extract potential song info from sequence name
function parseSequenceName(sequenceName: string) {
  const cleaned = cleanSequenceName(sequenceName);

  // Try to extract artist and song title
  // Common patterns: "Artist - Song Title", "Song Title by Artist", etc.
  const patterns = [
    /^(.+?)\s*-\s*(.+)$/i, // Artist - Song
    /^(.+?)\s+by\s+(.+)$/i, // Song by Artist
    /^(.+?)\s*\|\s*(.+)$/i, // Song | Artist
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return {
        artist: match[1].trim(),
        song: match[2].trim()
      };
    }
  }

  // If no pattern matches, treat whole thing as song title
  return {
    artist: '',
    song: cleaned
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sequenceName = searchParams.get('sequence');
  const mediaName = searchParams.get('media');
  
  // Use media name if provided, otherwise fall back to sequence name
  const lookupName = mediaName || sequenceName;
  const storageKey = sequenceName || mediaName; // Use sequence name as storage key for backward compatibility

  if (!lookupName) {
    return NextResponse.json({ error: 'Sequence name or media name is required' }, { status: 400 });
  }

  try {
    // Check if we already have metadata cached
    const cached = getSequenceMetadata.get(storageKey) as any;
    if (cached && cached.song_title) {
      return NextResponse.json({
        sequence_name: storageKey,
        ...cached
      });
    }

    // Get Spotify access token
    const hasToken = await getSpotifyAccessToken();
    if (!hasToken) {
      return NextResponse.json({
        sequence_name: storageKey,
        song_title: cleanSequenceName(lookupName),
        artist: 'Unknown',
        album: 'Unknown',
        release_year: null,
        album_cover_url: null,
        spotify_id: null,
        cached: false
      });
    }

    // Parse sequence name to extract artist and song
    const { artist, song } = parseSequenceName(lookupName);

    // Search Spotify
    let searchQuery = song;
    if (artist) {
      searchQuery = `${artist} ${song}`;
    }

    const searchResults = await spotifyApi.searchTracks(searchQuery, { limit: 1 });

    if (searchResults.body.tracks?.items && searchResults.body.tracks.items.length > 0) {
      const track = searchResults.body.tracks.items[0];
      const album = track.album;
      const releaseYear = album.release_date ? new Date(album.release_date).getFullYear() : null;
      const albumCover = album.images.length > 0 ? album.images[0].url : null;

      const metadata = {
        sequence_name: storageKey,
        song_title: track.name,
        artist: track.artists.map((a: any) => a.name).join(', '),
        album: album.name,
        release_year: releaseYear,
        album_cover_url: albumCover,
        spotify_id: track.id,
        cached: true
      };

      // Cache the metadata
      upsertSequenceMetadata.run(
        storageKey,
        track.name,
        track.artists.map(a => a.name).join(', '),
        album.name,
        releaseYear,
        albumCover,
        track.id
      );

      return NextResponse.json(metadata);
    } else {
      // No results found, cache empty result to avoid repeated searches
      const fallbackMetadata = {
        sequence_name: storageKey,
        song_title: cleanSequenceName(lookupName),
        artist: artist || 'Unknown',
        album: 'Unknown',
        release_year: null,
        album_cover_url: null,
        spotify_id: null,
        cached: false
      };

      upsertSequenceMetadata.run(
        storageKey,
        fallbackMetadata.song_title,
        fallbackMetadata.artist,
        fallbackMetadata.album,
        fallbackMetadata.release_year,
        fallbackMetadata.album_cover_url,
        fallbackMetadata.spotify_id
      );

      return NextResponse.json(fallbackMetadata);
    }
  } catch (error) {
    console.error('Error fetching metadata:', error);

    // Return fallback metadata
    const fallbackMetadata = {
      sequence_name: storageKey,
      song_title: cleanSequenceName(lookupName),
      artist: 'Unknown',
      album: 'Unknown',
      release_year: null,
      album_cover_url: null,
      spotify_id: null,
      cached: false,
      error: 'Failed to fetch metadata'
    };

    return NextResponse.json(fallbackMetadata);
  }
}
