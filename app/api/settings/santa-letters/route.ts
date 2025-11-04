import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'votes.db');

export async function GET() {
  try {
    const db = new Database(dbPath);

    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('santa_daily_limit') as { value: string } | undefined;

    db.close();

    const limit = setting ? parseInt(setting.value, 10) : 1;

    return NextResponse.json({ limit });
  } catch (error) {
    console.error('Failed to fetch letter limit:', error);
    return NextResponse.json({ limit: 1 }); // Default to 1 on error
  }
}
