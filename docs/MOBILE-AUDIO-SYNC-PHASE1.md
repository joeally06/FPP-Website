# Mobile Audio Sync Implementation - Phase 1 Complete

## Overview
Implementation of admin tools to download and manage audio files from FPP for visitor mobile listening feature.

**Status**: ✅ Phase 1 Complete - Admin API and UI
**Date**: 2025-01-12
**Version**: v1.0.4

---

## What Was Built

### 1. API Routes (4 endpoints)

#### `/api/fpp/media/list` (GET)
- **Purpose**: List audio files from FPP server
- **Security**: Admin authentication required
- **Returns**: Array of audio files with name, size, modified, path
- **Features**:
  - Audio file filtering (mp3, wav, ogg, m4a, flac, aac)
  - FPP offline detection
  - Error handling

#### `/api/fpp/media/download` (POST)
- **Purpose**: Download audio file from FPP to local storage
- **Security**: 
  - Admin authentication + role check
  - Path traversal prevention
  - Filename sanitization
  - File size limit (50MB)
  - Magic bytes validation (verifies actual audio)
  - Content-Type validation
- **Body**: `{ filename: string }`
- **Returns**: `{ success, filename, size, path, hash }`
- **Features**:
  - 30-second timeout
  - SHA256 hash for integrity
  - Prevents overwriting existing files
  - Saves to `public/audio/`

#### `/api/fpp/media/local` (GET, DELETE)
- **Purpose**: Manage locally stored audio files
- **GET**: List all local audio files
  - Returns: `{ files[], totalSize, count }`
  - Auto-creates directory if missing
- **DELETE**: Remove local audio file
  - Query: `?filename=example.mp3`
  - Security: Path traversal prevention (double-checked)
  - Returns: `{ success, filename, size }`

#### `/api/audio/mapping` (GET, POST, DELETE, PUT)
- **Purpose**: CRUD operations for sequence → audio mappings
- **GET** (Public): Retrieve all mappings
  - Used by audio sync server
  - Returns: `{ mappings, count }`
- **POST** (Admin): Create/update single mapping
  - Body: `{ sequence, audioFile }`
  - Validates .fseq extension
  - Stores in `data/audio-mapping.json`
- **DELETE** (Admin): Remove single mapping
  - Query: `?sequence=example.fseq`
- **PUT** (Admin): Bulk replace all mappings
  - Body: `{ mappings: { seq: audio } }`
  - Validates all entries

---

### 2. UI Components

#### `components/admin/MediaManager.tsx` (610 lines)
- **Three main sections**:
  1. **FPP Audio Files**: List + download from FPP
  2. **Local Audio Files**: List + delete local files
  3. **Sequence Mappings**: CRUD for sequence → audio mappings

- **Features**:
  - Loading states for all operations
  - Error and success messages
  - Confirmation dialogs for deletions
  - File size/date formatting
  - Auto-refresh after operations
  - Prevents duplicate downloads
  - Shows total local storage used

- **User Experience**:
  - Disabled buttons during operations
  - Loading spinners
  - Clear status messages
  - Modal dialogs for mapping creation/editing
  - Select dropdown for audio file selection

#### `app/admin/media/page.tsx`
- **Server-side authentication check**
- Redirects if not admin
- Wraps MediaManager in AdminLayout

#### Navigation Update
- Added "Media Manager 🎵" to AdminNavigation
- Shows between "Media Library" and "Models"

---

### 3. UI Component Library

Created missing shadcn/ui components:

1. **`components/ui/button.tsx`**
   - Variants: default, destructive, outline, secondary, ghost, link
   - Sizes: default, sm, lg, icon

2. **`components/ui/card.tsx`**
   - Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter

3. **`components/ui/input.tsx`**
   - Styled text input with dark mode support

4. **`components/ui/label.tsx`**
   - Form label component

5. **`components/ui/table.tsx`**
   - Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption

6. **`components/ui/dialog.tsx`**
   - Modal dialog with backdrop, close button, header, footer
   - Context-based state management

7. **`components/ui/select.tsx`**
   - Dropdown select with context-based state
   - Custom styling for selected items

---

### 4. Directory Structure

Created:
- `public/audio/` - Storage for downloaded MP3 files
- `data/` - Storage for audio-mapping.json

Updated `.gitignore`:
```gitignore
# audio files (large media files - downloaded from FPP)
public/audio/*.mp3
public/audio/*.wav
public/audio/*.ogg
public/audio/*.m4a
public/audio/*.flac
public/audio/*.aac

# audio mapping (keep this in git for configuration)
# data/audio-mapping.json is tracked
```

---

## Security Implementation

### Authentication
- ✅ All write endpoints require admin authentication
- ✅ Server-side session checks with `getServerSession`
- ✅ Role validation (must be admin)
- ✅ Automatic redirects on auth failures

### Input Validation
- ✅ Filename sanitization (alphanumeric + [._-] only)
- ✅ Path traversal prevention (blocks `..`, `/`, `\`)
- ✅ File extension whitelist
- ✅ File size limits (50MB)
- ✅ Content-Type validation

### File Security
- ✅ Magic bytes validation (verifies actual audio format)
- ✅ SHA256 hash generation for integrity
- ✅ Prevents overwriting existing files
- ✅ Directory permissions (755 for dirs, 644 for files)
- ✅ Timeout protection (30s download limit)

### Error Handling
- ✅ Never exposes internal errors to client
- ✅ Detailed logging for debugging
- ✅ Graceful offline handling
- ✅ HTTP status codes: 400, 401, 403, 404, 409, 413, 500, 503, 504

---

## Usage Workflow

### Admin Downloads Audio from FPP

1. **Navigate** to `/admin/media`
2. **View** FPP audio files in first table
3. **Click** "Download" on desired file
4. **Wait** for download to complete (~5-10s for typical MP3)
5. **Confirm** file appears in "Local Audio Files" table

### Admin Creates Sequence Mapping

1. **Click** "Create New Mapping" button
2. **Enter** sequence name (e.g., `carol-of-bells.fseq`)
3. **Select** audio file from dropdown (local files only)
4. **Click** "Save Mapping"
5. **Confirm** mapping appears in table

### Admin Manages Files

- **Delete Local File**: Click trash icon → Confirm
- **Edit Mapping**: Click "Edit" → Modify → Save
- **Delete Mapping**: Click trash icon
- **Refresh All**: Click "Refresh All" button

---

## Files Created/Modified

### New Files (17)
```
app/api/fpp/media/list/route.ts (70 lines)
app/api/fpp/media/download/route.ts (267 lines)
app/api/fpp/media/local/route.ts (188 lines)
app/api/audio/mapping/route.ts (372 lines)
app/admin/media/page.tsx (24 lines)
components/admin/MediaManager.tsx (610 lines)
components/ui/button.tsx (37 lines)
components/ui/card.tsx (71 lines)
components/ui/input.tsx (24 lines)
components/ui/label.tsx (17 lines)
components/ui/table.tsx (113 lines)
components/ui/dialog.tsx (143 lines)
components/ui/select.tsx (164 lines)
public/audio/ (directory)
data/ (directory)
```

### Modified Files (2)
```
components/AdminNavigation.tsx (added Media Manager link)
.gitignore (added audio file exclusions)
```

---

## Testing Status

### Build Test
✅ **PASSED** - `npm run build` successful
- All TypeScript compiled correctly
- All React components rendered
- All routes registered
- No errors or warnings

### Manual Testing Required

**Admin Panel Access**:
- [ ] Navigate to `/admin/media`
- [ ] Verify admin-only access (non-admins redirected)
- [ ] Verify page layout renders correctly

**FPP Integration**:
- [ ] View FPP files (requires FPP_URL configured)
- [ ] Download file from FPP
- [ ] Verify file appears in local files
- [ ] Check file integrity (play audio)

**Local File Management**:
- [ ] View local files
- [ ] Delete local file
- [ ] Verify file removed from filesystem

**Mapping CRUD**:
- [ ] Create new mapping
- [ ] Edit existing mapping
- [ ] Delete mapping
- [ ] Bulk update (API test)

**Error Handling**:
- [ ] Test with FPP offline
- [ ] Test invalid filenames
- [ ] Test file size limit (>50MB)
- [ ] Test permission errors

---

## Next Steps (Phase 2)

### Audio Sync Server Implementation

1. **Update `lib/audio-sync-server.ts`**:
   - Integrate audio-mapping.json lookup
   - Broadcast current audio file with FPP status
   - Fallback to filename convention if no mapping

2. **Create WebSocket Server**:
   - Port 3001
   - 50ms FPP polling for timing
   - Broadcast: `{ sequencePosition, audioFile, playing }`

### Mobile Player (Phase 3)

1. **Create `components/AudioSyncPlayer.tsx`**:
   - Pre-load MP3 from `/audio/`
   - Connect to WebSocket
   - Sync playback with FPP timing
   - Drift correction (>200ms threshold)

2. **Create `app/listen/page.tsx`**:
   - Public listening page
   - QR code for mobile access
   - Instructions for visitors
   - Audio player component

### Testing (Phase 4)

1. End-to-end sync testing
2. Network latency testing
3. Multiple client testing
4. Sequence change testing

---

## Performance Considerations

### File Sizes
- 50MB limit per file (typical MP3: 3-10MB)
- Storage in `public/` for direct access
- No transcoding/processing

### Download Speed
- Directly from FPP (local network)
- Typical 3MB MP3: ~2-5 seconds
- Progress feedback via loading states

### Mapping Storage
- JSON file (`data/audio-mapping.json`)
- In-memory caching in sync server
- Minimal overhead (<1KB for 50 mappings)

---

## Known Limitations

1. **No Upload**: Files must exist on FPP first
2. **No Transcoding**: Files used as-is
3. **Single FPP Source**: No multi-source support
4. **No File Preview**: Must download to verify
5. **No Batch Download**: One file at a time

---

## Dependencies

### Existing
- `next-auth` - Authentication
- `next` - Server-side rendering
- `react` - UI framework
- `lucide-react` - Icons
- `fs/promises` - File operations
- `crypto` - Hash generation

### None Added
All functionality uses built-in Node.js and React capabilities.

---

## Documentation

### For Admins
See INSTALLATION.md for:
- Setting up FPP_URL
- Admin email configuration
- Troubleshooting connection issues

### For Developers
See this document for:
- API endpoint specifications
- Security implementation
- Component architecture
- Extension points for Phase 2

---

## Success Metrics

✅ **Completed**:
- 4 API routes with comprehensive security
- Full-featured admin UI
- 7 reusable UI components
- Build verification passed
- Security best practices followed
- Comprehensive error handling
- User-friendly interface

**Impact**:
- Enables visitor mobile audio sync feature
- Provides admin control over audio files
- Secure file management system
- Foundation for Phase 2 implementation

---

## Change Log

### v1.0.4 - Phase 1 (2025-01-12)
- ✅ Created FPP media API routes
- ✅ Created audio mapping API routes
- ✅ Built MediaManager admin component
- ✅ Created missing UI component library
- ✅ Added navigation link
- ✅ Updated .gitignore
- ✅ Build verification passed

### Next Release (Phase 2)
- ⏳ Audio sync server integration
- ⏳ WebSocket implementation
- ⏳ Mobile player component
- ⏳ Public listening page
