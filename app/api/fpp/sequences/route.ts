import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'votes.db');

export async function GET() {
  let db: Database.Database | null = null;
  
  try {
    // Read sequences from database cache
    db = new Database(dbPath);
    
    const sequences = db.prepare(`
      SELECT name, filename, length_ms, channel_count, raw_data, synced_at
      FROM fpp_sequences
      ORDER BY name ASC
    `).all();

    console.log(`[FPP Sequences] Returning ${sequences.length} cached sequences`);

    // Parse raw_data JSON for each sequence
    const parsedSequences = sequences.map((sequence: any) => {
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

    return NextResponse.json(parsedSequences);

  } catch (error: any) {
    console.error('[FPP Sequences] Database error:', error);
    
    return NextResponse.json({
      error: 'Failed to load sequences from cache',
      details: error.message
    }, { status: 500 });
  } finally {
    if (db) {
      db.close();
    }
  }
}
