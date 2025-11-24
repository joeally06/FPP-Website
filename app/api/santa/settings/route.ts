import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'votes.db');

/**
 * GET /api/santa/settings
 * Public endpoint - Returns santa letter configuration (daily limit only)
 * No authentication required - safe to expose rate limit setting
 */
export async function GET() {
  try {
    const db = new Database(dbPath, { readonly: true });
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('santa_daily_limit') as { value: string } | undefined;
    db.close();
    
    const limit = setting ? parseInt(setting.value, 10) : 1;
    
    return NextResponse.json({ limit });
  } catch (error) {
    console.error('[Santa Settings] Failed to fetch settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}
