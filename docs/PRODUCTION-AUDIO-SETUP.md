# Production Audio Setup Guide

## Problem
Audio files are not included in git (they're large media files), so they need to be downloaded on the production server.

## Solution

### Method 1: Use Admin Media Manager (Easiest)
1. Access your production site as admin: `https://yourdomain.com/admin/media`
2. Select a playlist from the dropdown
3. Click "Download" next to each audio file you want
4. Files are automatically saved to `public/audio/` on the server
5. Audio sync will work immediately after download

### Method 2: Manual File Transfer
If you have SSH access to your production server:

```bash
# From your local machine, copy audio files to production
scp -r public/audio/*.mp3 user@production-server:/path/to/FPP-Control-Center/public/audio/

# Or if using rsync
rsync -avz public/audio/ user@production-server:/path/to/FPP-Control-Center/public/audio/
```

### Method 3: Download from FPP on Production Server
If your production server can access FPP:

```bash
# SSH into production server
ssh user@production-server

# Navigate to project
cd /path/to/FPP-Control-Center

# Use the admin media manager API or manual download
# The Media Manager does this automatically via the web interface
```

## Verification

### 1. Check Audio Files Exist
```bash
# On production server
ls -lh public/audio/
```

You should see your MP3 files listed.

### 2. Verify Web Access
```bash
# Test if audio files are accessible
curl -I http://localhost:3000/audio/Christmas%20Every%20Day.mp3
```

Should return `200 OK` and show the file size.

### 3. Test in Browser
Open: `https://yourdomain.com/audio/Christmas%20Every%20Day.mp3`

Should download or play the audio file.

## Troubleshooting

### Audio Shows Playing But No Sound

**Check 1: Files exist on server**
```bash
ls public/audio/
```

**Check 2: Files are readable**
```bash
chmod 644 public/audio/*.mp3
```

**Check 3: Restart PM2**
```bash
pm2 restart fpp-control
```

**Check 4: Browser Console**
Open browser DevTools (F12) → Console tab
Look for errors like:
- `404 Not Found` - Files don't exist on server
- `Failed to load resource` - Permission or path issue
- `The AudioContext was not allowed to start` - Browser autoplay policy

**Check 5: Network Tab**
Open browser DevTools (F12) → Network tab → Filter: Media
- Click Play on the audio player
- You should see the MP3 file loading
- Check status code (should be 200, not 404)

### Browser Autoplay Restrictions

Modern browsers block audio autoplay. The AudioSyncPlayer requires user interaction:
1. User must click "Play" button first
2. After manual play, automatic sync works

This is **by design** and **cannot be bypassed** for security reasons.

### CSP (Content Security Policy) Issues

If audio still doesn't play, check browser console for CSP errors.

The `next.config.ts` already allows audio from same origin:
```typescript
"media-src 'self' https://*.googlevideo.com"
```

This should work fine for files served from `/audio/`.

## Production Deployment Checklist

- [ ] Build the application: `npm run build`
- [ ] Deploy code to production server
- [ ] Download audio files using Admin Media Manager
- [ ] Verify files exist: `ls public/audio/`
- [ ] Test audio accessibility: `curl -I http://localhost:3000/audio/[filename].mp3`
- [ ] Restart PM2: `pm2 restart fpp-control`
- [ ] Test in browser: Open jukebox, click Play
- [ ] Check browser console for errors

## File Sizes

Audio files are typically 3-8 MB each:
- 15 audio files ≈ 50-120 MB total
- Make sure your server has sufficient disk space
- Consider using compressed formats (OGG, M4A) for smaller file sizes

## Why Not Commit Audio Files?

Audio files are excluded from git because:
1. **Large file sizes** - GitHub has limits, slow cloning
2. **Binary files** - No meaningful diffs, poor version control
3. **Site-specific** - Different deployments may have different audio files
4. **Easy to regenerate** - Can download from FPP anytime

## Automation (Optional)

Create a deployment script to auto-download audio files:

```bash
#!/bin/bash
# deploy-with-audio.sh

echo "Deploying FPP Control Center..."
git pull
npm install
npm run build

echo "Downloading audio files..."
# This would require creating a CLI script that uses the API
# Or manually run: Go to /admin/media and download files

pm2 restart fpp-control
echo "Deployment complete!"
```

## Support

If issues persist:
1. Check server logs: `pm2 logs fpp-control`
2. Check browser console (F12)
3. Verify FPP is accessible from production server
4. Check file permissions in `public/audio/`
