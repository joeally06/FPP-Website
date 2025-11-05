import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'votes.db');

/**
 * GET /api/fpp/sequences
 * Returns cached sequences from database
 * 🔒 AUTHENTICATED USERS ONLY
 */
export async function GET() {
  let db: Database.Database | null = null;
  
  try {
    // Check authentication (any logged-in user)
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - login required to view sequences' },
        { status: 401 }
      );
    }

    // Try to read sequences from database cache first
    db = new Database(dbPath);
    
    const cachedSequences = db.prepare(`
      SELECT name, filename, length_ms, channel_count, raw_data, synced_at
      FROM fpp_sequences
      ORDER BY name ASC
    `).all();

    db.close();
    db = null;

    if (cachedSequences.length > 0) {
      console.log(`[FPP Sequences] Returning ${cachedSequences.length} sequences from cache`);
      
      // Parse raw_data JSON for each sequence
      const parsedSequences = cachedSequences.map((sequence: any) => {
        try {
          return JSON.parse(sequence.raw_data);
        } catch {
          // Fallback to basic structure if JSON parse fails
          return {
            name: sequence.name,
            filename: sequence.filename,
            length: sequence.length_ms,
            channelCount: sequence.channel_count
          };
        }
      });

      console.log('[FPP Sequences] Sample parsed sequence:', parsedSequences[0]);
      return NextResponse.json(parsedSequences);
    }

    // If cache is empty, suggest syncing
    console.log('[FPP Sequences] Cache empty - suggesting sync');
    
    return NextResponse.json({
      error: 'No cached sequences available',
      hint: 'Click "Sync Now" to load sequences from FPP device',
      sequences: []
    }, { status: 404 });

  } catch (error: any) {
    console.error('[FPP Sequences] Error:', error);
    
    return NextResponse.json({
      error: 'Failed to load sequences',
      details: error.message,
      sequences: []
    }, { status: 500 });
  } finally {
    if (db) {
      db.close();
    }
  }
}
