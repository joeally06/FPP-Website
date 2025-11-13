import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'votes.db');

interface GameSettings {
  enabled: boolean;
  initialSpeed: number;
  speedIncrease: number;
  spawnInterval: number;
  spawnDecrease: number;
  minSpawnInterval: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  enabled: true,
  initialSpeed: 0.5,
  speedIncrease: 0.15,
  spawnInterval: 2000,
  spawnDecrease: 150,
  minSpawnInterval: 800
};

/**
 * GET /api/games/settings
 * Get game configuration settings (public - no auth required)
 */
export async function GET() {
  try {
    const db = new Database(dbPath, { readonly: true }); // Read-only for security
    
    try {
      const settings: GameSettings = { ...DEFAULT_SETTINGS };
      
      const stmt = db.prepare('SELECT key, value FROM settings WHERE key LIKE ?');
      const rows = stmt.all('game_%') as Array<{ key: string; value: string }>;
      
      rows.forEach(({ key, value }) => {
        switch (key) {
          case 'game_enabled':
            settings.enabled = value === '1' || value === 'true';
            break;
          case 'game_initial_speed':
            settings.initialSpeed = parseFloat(value) || DEFAULT_SETTINGS.initialSpeed;
            break;
          case 'game_speed_increase':
            settings.speedIncrease = parseFloat(value) || DEFAULT_SETTINGS.speedIncrease;
            break;
          case 'game_spawn_interval':
            settings.spawnInterval = parseInt(value) || DEFAULT_SETTINGS.spawnInterval;
            break;
          case 'game_spawn_decrease':
            settings.spawnDecrease = parseInt(value) || DEFAULT_SETTINGS.spawnDecrease;
            break;
          case 'game_min_spawn_interval':
            settings.minSpawnInterval = parseInt(value) || DEFAULT_SETTINGS.minSpawnInterval;
            break;
        }
      });
      
      db.close();
      
      return NextResponse.json(settings);
      
    } finally {
      if (db.open) db.close();
    }
    
  } catch (error) {
    console.error('[Game Settings API] Error:', error);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

/**
 * POST /api/games/settings
 * Update game configuration settings (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (session?.user?.role !== 'admin') {
      console.log(`[Game Settings] Unauthorized access attempt from: ${session?.user?.email || 'unknown'}`);
      return NextResponse.json({ 
        error: 'Unauthorized - Admin access required' 
      }, { status: 401 });
    }

    const settings = await request.json() as GameSettings;
    
    // Comprehensive validation with specific error messages
    if (typeof settings.enabled !== 'boolean') {
      return NextResponse.json({ 
        error: 'Invalid enabled value - must be boolean' 
      }, { status: 400 });
    }
    
    if (typeof settings.initialSpeed !== 'number' || isNaN(settings.initialSpeed) || 
        settings.initialSpeed < 0.1 || settings.initialSpeed > 5) {
      return NextResponse.json({ 
        error: 'Initial speed must be a number between 0.1 and 5' 
      }, { status: 400 });
    }
    
    if (typeof settings.speedIncrease !== 'number' || isNaN(settings.speedIncrease) || 
        settings.speedIncrease < 0 || settings.speedIncrease > 1) {
      return NextResponse.json({ 
        error: 'Speed increase must be a number between 0 and 1' 
      }, { status: 400 });
    }
    
    if (typeof settings.spawnInterval !== 'number' || isNaN(settings.spawnInterval) || 
        settings.spawnInterval < 500 || settings.spawnInterval > 10000) {
      return NextResponse.json({ 
        error: 'Spawn interval must be a number between 500ms and 10000ms' 
      }, { status: 400 });
    }
    
    if (typeof settings.spawnDecrease !== 'number' || isNaN(settings.spawnDecrease) || 
        settings.spawnDecrease < 0 || settings.spawnDecrease > 500) {
      return NextResponse.json({ 
        error: 'Spawn decrease must be a number between 0 and 500' 
      }, { status: 400 });
    }
    
    if (typeof settings.minSpawnInterval !== 'number' || isNaN(settings.minSpawnInterval) || 
        settings.minSpawnInterval < 200 || settings.minSpawnInterval > 5000) {
      return NextResponse.json({ 
        error: 'Minimum spawn interval must be a number between 200ms and 5000ms' 
      }, { status: 400 });
    }

    const db = new Database(dbPath);
    
    try {
      const upsert = db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `);
      
      upsert.run('game_enabled', settings.enabled ? '1' : '0');
      upsert.run('game_initial_speed', settings.initialSpeed.toString());
      upsert.run('game_speed_increase', settings.speedIncrease.toString());
      upsert.run('game_spawn_interval', settings.spawnInterval.toString());
      upsert.run('game_spawn_decrease', settings.spawnDecrease.toString());
      upsert.run('game_min_spawn_interval', settings.minSpawnInterval.toString());
      
      db.close();
      
      console.log(`[Game Settings] Settings updated by admin: ${session.user.email}`);
      console.log(`[Game Settings] New values:`, settings);
      
      return NextResponse.json({ 
        success: true,
        message: 'Game settings updated successfully'
      });
      
    } finally {
      if (db.open) db.close();
    }
    
  } catch (error) {
    console.error('[Game Settings API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to update game settings' 
    }, { status: 500 });
  }
}
