# Unified Banner System Implementation

## Overview

Implemented a unified, priority-based banner system for the jukebox page that replaces three separate confusing banners with a single, smart banner component that displays based on priority.

## What Changed

### New Components

1. **`components/JukeboxBanner.tsx`**
   - Client component that displays ONE banner based on priority logic
   - Priority Order:
     1. **Countdown Banner** - Shows when show is about to start (monitoring active but not yet within schedule)
     2. **Off-Season Banner** - Shows when manually enabled by admin
     3. **Offline Banner** - Shows when FPP controller is not playing
   - Fetches configuration from `/api/jukebox/banner-config`
   - Dynamic styling from admin-configured colors

2. **`components/admin/BannerSettings.tsx`**
   - Comprehensive admin UI for configuring all three banners
   - Features for each banner:
     - Enable/disable toggle
     - Heading text input
     - Subtitle text input (countdown banner supports `{time}` placeholder)
     - Color theme presets (9 themes: Blue, Purple, Red, Green, Yellow, Orange, Slate, Christmas, Halloween)
     - Live preview with selected styling
   - Single save button for all settings
   - Priority explanation section

### New API Routes

1. **`app/api/jukebox/banner-config/route.ts`**
   - GET: Returns all 18 banner settings from database
   - POST: Saves all banner settings (admin-only)
   - Settings stored with prefix `jukebox_banner_*`
   - Default configuration:
     - Countdown: Blue theme, enabled, "Next Show Starting Soon"
     - Off-Season: Purple theme, disabled, "The show is currently off-season"
     - Offline: Slate theme, enabled, "Show is Currently Inactive"

### Modified Files

1. **`app/jukebox/page.tsx`**
   - Removed old state variables: `offlineHeading`, `offlineSubtitle`, `showOffSeason`
   - Removed `fetchOfflineBanner()` function
   - Removed `getBannerStyles()` function
   - Removed old banner rendering code (schedule status banner with nested off-season logic)
   - Added import for `JukeboxBanner` component
   - Replaced old banners with single `<JukeboxBanner />` component
   - Passes props: `fppStatus`, `isMonitoringActive`, `timeUntilNextShow`

2. **`app/settings/page.tsx`**
   - Removed old state variables: `offlineHeading`, `offlineSubtitle`, `showOffSeason`, `savingOffline`
   - Removed `fetchOfflineBanner()` function
   - Removed `handleSaveOfflineBanner()` function
   - Removed entire "Offline Banner Customization" section (150+ lines)
   - Added import for `BannerSettings` component
   - Replaced old section with single `<BannerSettings />` component

## Database Schema

New settings keys (stored in `settings` table):

```
jukebox_banner_countdownEnabled: '1' | '0'
jukebox_banner_countdownHeading: string
jukebox_banner_countdownSubtitle: string
jukebox_banner_countdownBgColor: string (Tailwind classes)
jukebox_banner_countdownTextColor: string (Tailwind classes)
jukebox_banner_countdownBorderColor: string (Tailwind classes)

jukebox_banner_offSeasonEnabled: '1' | '0'
jukebox_banner_offSeasonHeading: string
jukebox_banner_offSeasonSubtitle: string
jukebox_banner_offSeasonBgColor: string (Tailwind classes)
jukebox_banner_offSeasonTextColor: string (Tailwind classes)
jukebox_banner_offSeasonBorderColor: string (Tailwind classes)

jukebox_banner_offlineEnabled: '1' | '0'
jukebox_banner_offlineHeading: string
jukebox_banner_offlineSubtitle: string
jukebox_banner_offlineBgColor: string (Tailwind classes)
jukebox_banner_offlineTextColor: string (Tailwind classes)
jukebox_banner_offlineBorderColor: string (Tailwind classes)
```

## Color Presets

9 built-in color themes available for each banner:

1. **Blue**: `from-blue-600/30 to-blue-700/30` with blue border
2. **Purple**: `from-purple-600/30 to-purple-700/30` with purple border
3. **Red**: `from-red-600/30 to-red-700/30` with red border
4. **Green**: `from-green-600/30 to-green-700/30` with green border
5. **Yellow**: `from-yellow-600/30 to-yellow-700/30` with yellow border
6. **Orange**: `from-orange-600/30 to-orange-700/30` with orange border
7. **Slate**: `from-slate-700/30 to-slate-800/30` with slate border
8. **Christmas**: `from-red-600/30 via-green-600/30 to-red-600/30` with red border
9. **Halloween**: `from-orange-600/30 via-purple-600/30 to-orange-600/30` with orange border

## User Experience Improvements

### Before
- Three separate banner systems with confusing priority
- Countdown banner: Hardcoded text, no customization
- Offline banner: Customizable text only, no color control
- Off-season banner: Toggle only, hardcoded text
- Unclear which banner would show when

### After
- Single unified banner component
- Clear priority system (1 → 2 → 3)
- Full customization for ALL banners (text + colors)
- Live previews in admin panel
- 9 color presets for quick styling
- Consistent user experience

## Admin Features

### Banner Settings Page (`/settings` → Jukebox tab)

1. **Priority Explanation Box**
   - Visual guide showing banner priority order
   - Clear messaging: "Only ONE banner displays at a time"

2. **Countdown Banner Section**
   - Enable/disable toggle
   - Heading input
   - Subtitle input (with `{time}` placeholder hint)
   - 9 color theme buttons
   - Live preview

3. **Off-Season Banner Section**
   - Same features as countdown
   - Different default styling (purple)

4. **Offline Banner Section**
   - Same features as countdown
   - Different default styling (slate/dark)

5. **Save All Button**
   - Saves all 18 settings in single API call
   - Success/error messaging
   - Loading state

## Technical Details

### Type Safety
- Strict TypeScript interfaces for `BannerConfig` (18 properties)
- Type-safe API endpoints
- Fixed type inference issues with dynamic key access

### Performance
- Single API call to load all banner config (not 3 separate calls)
- Client-side caching in `JukeboxBanner` component
- Minimal re-renders with React state

### Backward Compatibility
- Old `/api/jukebox/offline-banner` endpoint still exists (not removed for safety)
- New banner config auto-migrates from old settings on first GET
- Default values ensure banners work even with empty database

## Testing Checklist

- [x] Build succeeds (`npm run build`)
- [x] No TypeScript errors
- [x] No ESLint errors
- [ ] Test banner priority logic:
  - [ ] Countdown shows when monitoring active
  - [ ] Off-season overrides offline when enabled
  - [ ] Offline shows when FPP not playing
- [ ] Test admin customization:
  - [ ] All text inputs save correctly
  - [ ] All color presets apply correctly
  - [ ] Live previews update in real-time
  - [ ] Save button shows success message
- [ ] Test responsive design:
  - [ ] Banners display correctly on mobile
  - [ ] Settings UI works on small screens

## Migration Notes

### For Existing Installations

1. **No database migration required** - Settings table already exists
2. **Old settings preserved** - `jukebox_offline_heading` and `jukebox_offline_subtitle` still exist
3. **Automatic defaults** - API returns sensible defaults if settings don't exist
4. **No breaking changes** - Old offline banner API endpoint still functional

### For Fresh Installations

1. Banner config API returns defaults
2. Admin can customize immediately
3. No setup required

## Files Created
- `components/JukeboxBanner.tsx`
- `components/admin/BannerSettings.tsx`
- `app/api/jukebox/banner-config/route.ts`

## Files Modified
- `app/jukebox/page.tsx` (simplified, removed ~100 lines)
- `app/settings/page.tsx` (simplified, removed ~150 lines)

## Lines of Code
- **Added**: ~500 lines (new components + API)
- **Removed**: ~250 lines (old banner code)
- **Net Change**: +250 lines (but with much better organization and features)

## Next Steps

1. Test banner priority logic in development
2. Test all color presets
3. Test admin customization flow
4. Update version number for release
5. Add to CHANGELOG.md
6. Commit and deploy

---

**Implementation Date**: January 2025  
**Status**: ✅ Complete - Build Successful
