import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'votes.db');

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const db = new Database(dbPath);

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Count letters sent today by this email
    const result = db.prepare(`
      SELECT COUNT(*) as count 
      FROM santa_letters 
      WHERE parent_email = ? 
      AND DATE(created_at) = DATE(?)
    `).get(email, today) as { count: number };

    db.close();

    return NextResponse.json({ count: result.count });
  } catch (error) {
    console.error('Failed to check letter count:', error);
    return NextResponse.json({ error: 'Failed to check limit' }, { status: 500 });
  }
}
