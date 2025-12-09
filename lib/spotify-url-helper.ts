/**
 * Spotify URL Helper
 * 
 * Utility functions for fetching Spotify track URLs
 * Used by Media Library and metadata APIs
 */

interface SpotifyTrackResult {
  spotify_url: string | null;
  spotify_id: string | null;
  album_cover_url: string | null;
}

/**
 * Get Spotify access token using Client Credentials flow
 */
async function getSpotifyAccessToken(): Promise<string | null> {
  try {
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      console.warn('[Spotify Helper] Spotify credentials not configured');
      return null;
    }

    const authResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!authResponse.ok) {
      console.error('[Spotify Helper] Failed to authenticate:', authResponse.status);
      return null;
    }

    const authData = await authResponse.json();
    return authData.access_token;

  } catch (error) {
    console.error('[Spotify Helper] Authentication error:', error);
    return null;
  }
}

/**
 * Fetch Spotify URL and metadata for a track
 * 
 * @param title - Song title
 * @param artist - Artist name
 * @returns Spotify URL, ID, and album cover (or nulls if not found)
 */
export async function fetchSpotifyTrackInfo(
  title: string,
  artist: string
): Promise<SpotifyTrackResult> {
  try {
    const accessToken = await getSpotifyAccessToken();
    
    if (!accessToken) {
      return { spotify_url: null, spotify_id: null, album_cover_url: null };
    }

    // Search Spotify
    const searchQuery = `track:${title} artist:${artist}`;
    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      }
    );

    if (!searchResponse.ok) {
      console.error('[Spotify Helper] Search failed:', searchResponse.status);
      return { spotify_url: null, spotify_id: null, album_cover_url: null };
    }

    const searchData = await searchResponse.json();

    if (searchData.tracks.items.length > 0) {
      const track = searchData.tracks.items[0];
      
      return {
        spotify_url: track.external_urls?.spotify || null,
        spotify_id: track.id || null,
        album_cover_url: track.album.images[0]?.url || null,
      };
    }

    console.log('[Spotify Helper] No results found for:', title, '-', artist);
    return { spotify_url: null, spotify_id: null, album_cover_url: null };

  } catch (error) {
    console.error('[Spotify Helper] Failed to fetch track info:', error);
    return { spotify_url: null, spotify_id: null, album_cover_url: null };
  }
}

/**
 * Fetch Spotify URL only (simpler version)
 * 
 * @param title - Song title
 * @param artist - Artist name
 * @returns Spotify URL or null
 */
export async function fetchSpotifyUrl(
  title: string,
  artist: string
): Promise<string | null> {
  const result = await fetchSpotifyTrackInfo(title, artist);
  return result.spotify_url;
}
