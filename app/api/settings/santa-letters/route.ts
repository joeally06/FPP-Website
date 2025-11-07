import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'votes.db');

/**
 * GET /api/settings/santa-letters
 * Get Santa letter settings
 * ADMIN ONLY
 */
export async function GET() {
  try {
    await requireAdmin();
    
    const db = new Database(dbPath);

    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('santa_daily_limit') as { value: string } | undefined;

    db.close();

    const limit = setting ? parseInt(setting.value, 10) : 1;

    return NextResponse.json({ limit });
  } catch (error: any) {
    if (error.message?.includes('Authentication required')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    console.error('Failed to fetch letter limit:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}
