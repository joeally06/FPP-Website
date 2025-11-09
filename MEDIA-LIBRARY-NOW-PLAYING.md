# Media Library Integration for Now Playing

## Overview

The **Now Playing** display on the jukebox page now prioritizes metadata from the **Media Library** over external Spotify API calls. This ensures user customizations (custom album art, artist names, track titles) are displayed consistently across all pages.

---

## Implementation Details

### Database Structure

Two metadata tables exist:

1. **`spotify_metadata`** (Media Library - USER CUSTOMIZATIONS)
   - Primary Key: `sequence_name`
   - Fields: `album_art_url`, `artist_name`, `album_name`, `track_name`, `spotify_track_id`, `spotify_uri`, `preview_url`
   - Source: User-managed via Settings → Media Library
   - Priority: **HIGHEST** - checked first

2. **`sequence_metadata`** (Auto-cache)
   - Primary Key: `sequence_name`
   - Auto-populated from Spotify API searches
   - Priority: **MEDIUM** - checked second if Media Library has no data

---

## Metadata Lookup Priority

When a song plays, the system checks metadata sources in this order:

```
1. Media Library (spotify_metadata table)
   ↓ if not found
2. Auto-cache (sequence_metadata table)
   ↓ if not found
3. Spotify API (live search)
```

---

## Files Modified

### 1. `lib/database.ts`

**Added prepared statement:**

```typescript
// Media Library (spotify_metadata) prepared statements
export const getMediaLibraryMetadata = db.prepare(`
  SELECT * FROM spotify_metadata WHERE sequence_name = ?
`);
```

**Purpose:** Efficiently query Media Library for user-customized metadata.

---

### 2. `app/api/jukebox/metadata/route.ts`

**Import changes:**

```typescript
import { getSequenceMetadata, upsertSequenceMetadata, getMediaLibraryMetadata } from '@/lib/database';
```

**Added Media Library check (PRIORITY 1):**

```typescript
// PRIORITY 1: Check Media Library for user-customized metadata
if (storageKey) {
  const mediaLibraryData = getMediaLibraryMetadata.get(storageKey) as any;
  if (mediaLibraryData && mediaLibraryData.track_name) {
    // Return Media Library metadata (respects user customizations)
    return NextResponse.json({
      sequence_name: storageKey,
      song_title: mediaLibraryData.track_name,
      artist: mediaLibraryData.artist_name || 'Unknown',
      album: mediaLibraryData.album_name || 'Unknown',
      release_year: null, // Media Library doesn't store this
      album_cover_url: mediaLibraryData.album_art_url,
      spotify_id: mediaLibraryData.spotify_track_id,
      cached: true,
      source: 'media_library'
    });
  }
}

// PRIORITY 2: Check if we already have metadata cached in sequence_metadata
const cached = getSequenceMetadata.get(storageKey) as any;
if (cached && cached.song_title) {
  return NextResponse.json({
    sequence_name: storageKey,
    ...cached
  });
}

// PRIORITY 3: Fetch from Spotify API (existing logic)
```

**Key Changes:**
- Added `getMediaLibraryMetadata.get(storageKey)` check before auto-cache
- Returns Media Library data if `track_name` exists
- Maps Media Library fields to API response format
- Adds `source: 'media_library'` field for debugging
- Existing Spotify API logic remains as final fallback

---

## User Workflow

### Before (Old Behavior)

1. User customizes metadata in Media Library (Settings → Media Library)
2. Jukebox plays song
3. **Now Playing fetches from Spotify API** (ignores customizations)
4. User sees generic Spotify data, not their custom thumbnail/title

### After (New Behavior)

1. User customizes metadata in Media Library (Settings → Media Library)
2. Jukebox plays song
3. **Now Playing fetches from Media Library** (respects customizations)
4. User sees their custom thumbnail, artist name, track title
5. Consistent experience across jukebox and settings pages

---

## Testing Checklist

### Test Case 1: Song with Media Library Entry

1. **Setup:**
   - Go to Settings → Media Library
   - Search for a song (e.g., "Jingle Bells")
   - Select custom Spotify result or enter custom metadata
   - Save with custom album art

2. **Test:**
   - Play that song in jukebox
   - Check **Now Playing** display

3. **Expected Result:**
   - ✅ Custom album art displayed
   - ✅ Custom artist name displayed
   - ✅ Custom track title displayed
   - ✅ Data matches Settings → Media Library

---

### Test Case 2: Song WITHOUT Media Library Entry

1. **Setup:**
   - Identify a song NOT in Media Library
   - Or delete a song from Media Library

2. **Test:**
   - Play that song in jukebox
   - Check **Now Playing** display

3. **Expected Result:**
   - ✅ System searches Spotify API (fallback)
   - ✅ Displays Spotify-sourced metadata
   - ✅ No errors or blank data
   - ✅ Auto-cached for future plays

---

### Test Case 3: Media Library Update

1. **Setup:**
   - Song already playing
   - Go to Settings → Media Library
   - Update metadata for currently playing song

2. **Test:**
   - Wait for song to finish
   - Play same song again
   - Check **Now Playing** display

3. **Expected Result:**
   - ✅ Updated metadata displayed
   - ✅ New album art shown
   - ✅ Changes reflected immediately on next play

---

## API Response Format

### Media Library Source

```json
{
  "sequence_name": "Jingle_Bells.fseq",
  "song_title": "Jingle Bells",
  "artist": "Custom Artist Name",
  "album": "Christmas Classics",
  "release_year": null,
  "album_cover_url": "https://custom-url.com/image.jpg",
  "spotify_id": "spotify_track_id_here",
  "cached": true,
  "source": "media_library"
}
```

### Auto-Cache Source (No Media Library Entry)

```json
{
  "sequence_name": "Some_Song.fseq",
  "song_title": "Some Song",
  "artist": "Auto-detected Artist",
  "album": "Auto-detected Album",
  "release_year": 2020,
  "album_cover_url": "https://spotify-url.com/image.jpg",
  "spotify_id": "spotify_id",
  "cached": true
}
```

### Spotify API Source (Fresh Search)

```json
{
  "sequence_name": "New_Song.fseq",
  "song_title": "New Song",
  "artist": "Artist from Spotify",
  "album": "Album from Spotify",
  "release_year": 2023,
  "album_cover_url": "https://spotify-url.com/image.jpg",
  "spotify_id": "spotify_id",
  "cached": true
}
```

---

## Benefits

1. **Consistency:** Metadata matches across jukebox and settings pages
2. **User Control:** Respects user customizations from Media Library
3. **Performance:** Database lookups faster than API calls
4. **Offline Friendly:** Works even if Spotify API is unavailable
5. **Bandwidth Savings:** Reduces external API calls
6. **Custom Branding:** Users can use custom thumbnails (e.g., event logos)

---

## Migration Notes

- **No database migrations needed** - `spotify_metadata` table already exists (migration 007)
- **No frontend changes needed** - API contract remains identical
- **Backward compatible** - Songs without Media Library entries work as before
- **Zero downtime** - Changes are additive, not destructive

---

## Future Enhancements

### Possible Improvements

1. **Bulk Import:** Allow CSV import of custom metadata
2. **Default Thumbnails:** System-wide default album art for unmapped songs
3. **Theme-Specific Art:** Different album art for Christmas vs Halloween themes
4. **Metadata History:** Track changes to customizations
5. **AI Suggestions:** Suggest better Spotify matches based on filename patterns

---

## Troubleshooting

### Issue: Custom metadata not showing

**Diagnosis:**
1. Check if song exists in Media Library: Settings → Media Library
2. Verify `sequence_name` matches exactly (case-sensitive)
3. Check if `track_name` field is populated

**Solution:**
- Re-save metadata in Media Library
- Ensure sequence name matches FPP sequence file exactly

---

### Issue: Old metadata still showing

**Diagnosis:**
Frontend cached old metadata in React state.

**Solution:**
- Refresh jukebox page
- Clear browser cache
- Restart Next.js server: `pm2 restart fpp-control`

---

### Issue: API returns wrong data

**Debug:**
1. Check API response: `/api/jukebox/metadata?sequence=SEQUENCE_NAME`
2. Look for `source` field in response:
   - `media_library` = from Media Library
   - No source field = from auto-cache or Spotify

**Solution:**
- If wrong source, check database:
  ```sql
  SELECT * FROM spotify_metadata WHERE sequence_name = 'SEQUENCE_NAME';
  ```
- If empty, populate via Settings → Media Library

---

## Related Documentation

- [Media Library Implementation](./MEDIA-LIBRARY-IMPLEMENTATION.md)
- [FPP Caching Implementation](./FPP-CACHING-IMPLEMENTATION.md)
- [Installation Guide](./INSTALLATION.md)

---

## Version History

- **v1.0.0-rc.1** - Initial Media Library integration for Now Playing
  - Added `getMediaLibraryMetadata` prepared statement
  - Modified `/api/jukebox/metadata` to prioritize Media Library
  - Zero breaking changes, fully backward compatible

---

**Status:** ✅ Implemented and tested
**Build:** ✅ Successful compilation
**Errors:** ✅ None

Enjoy consistent metadata across your FPP Control Center! 🎵
