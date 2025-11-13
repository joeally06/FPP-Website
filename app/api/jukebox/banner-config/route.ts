import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import db from '@/lib/database';

interface BannerConfig {
  // Countdown banner (FPP playing, outside monitoring hours)
  countdownEnabled: boolean;
  countdownHeading: string;
  countdownSubtitle: string;
  countdownBgColor: string;
  countdownTextColor: string;
  countdownBorderColor: string;
  
  // Off-season banner (no shows scheduled)
  offSeasonEnabled: boolean;
  offSeasonHeading: string;
  offSeasonSubtitle: string;
  offSeasonBgColor: string;
  offSeasonTextColor: string;
  offSeasonBorderColor: string;
  
  // Offline banner (FPP not running)
  offlineEnabled: boolean;
  offlineHeading: string;
  offlineSubtitle: string;
  offlineBgColor: string;
  offlineTextColor: string;
  offlineBorderColor: string;
}

const DEFAULT_CONFIG: BannerConfig = {
  // Countdown
  countdownEnabled: true,
  countdownHeading: '⏰ Next Show Starting Soon',
  countdownSubtitle: 'Show begins in {time}',
  countdownBgColor: 'from-blue-600 to-blue-800',
  countdownTextColor: 'text-white',
  countdownBorderColor: 'border-blue-400',
  
  // Off-season
  offSeasonEnabled: false,
  offSeasonHeading: '🎭 The show is currently off-season',
  offSeasonSubtitle: 'No upcoming shows are scheduled at this time',
  offSeasonBgColor: 'from-purple-600 to-purple-800',
  offSeasonTextColor: 'text-white',
  offSeasonBorderColor: 'border-purple-400',
  
  // Offline
  offlineEnabled: true,
  offlineHeading: 'Show is Currently Inactive',
  offlineSubtitle: 'Song requests will be available when the show starts',
  offlineBgColor: 'from-slate-700 to-slate-900',
  offlineTextColor: 'text-white',
  offlineBorderColor: 'border-slate-600'
};

/**
 * GET /api/jukebox/banner-config
 * Get banner configuration (Public - needed for jukebox page)
 */
export async function GET() {
  try {
    // Get all banner settings
    const settings = db.prepare('SELECT key, value FROM settings WHERE key LIKE ?')
      .all('jukebox_banner_%') as { key: string; value: string }[];

    // Build config object from settings
    const config: BannerConfig = { ...DEFAULT_CONFIG };
    
    settings.forEach(({ key, value }) => {
      const configKey = key.replace('jukebox_banner_', '') as keyof BannerConfig;
      
      // Convert boolean strings
      if (configKey.includes('Enabled')) {
        (config as any)[configKey] = value === '1' || value === 'true';
      } else {
        (config as any)[configKey] = value;
      }
    });

    return NextResponse.json(config);

  } catch (error) {
    console.error('[Banner Config] Error fetching:', error);
    return NextResponse.json(DEFAULT_CONFIG, { status: 200 });
  }
}

/**
 * POST /api/jukebox/banner-config
 * Update banner configuration (Admin only)
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Unauthorized - Admin access required' 
      }, { status: 401 });
    }

    const config = await request.json() as BannerConfig;

    // Update each setting
    Object.entries(config).forEach(([key, value]) => {
      const dbKey = `jukebox_banner_${key}`;
      const dbValue = typeof value === 'boolean' ? (value ? '1' : '0') : String(value);

      const existing = db.prepare('SELECT value FROM settings WHERE key = ?').get(dbKey);
      
      if (existing) {
        db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?').run(dbValue, dbKey);
      } else {
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(dbKey, dbValue);
      }
    });

    console.log('[Banner Config] Updated successfully by', session.user.email);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Banner Config] Error updating:', error);
    return NextResponse.json({ 
      error: 'Failed to update banner config' 
    }, { status: 500 });
  }
}
