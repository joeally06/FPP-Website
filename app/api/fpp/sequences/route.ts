import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'votes.db');

export async function GET() {
  let db: Database.Database | null = null;
  
  try {
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

      return NextResponse.json(parsedSequences);
    }

    // If cache is empty, fetch live from FPP (using same route as Jukebox)
    console.log('[FPP Sequences] Cache empty, fetching live from FPP...');
    
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/fppd/sequence`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`FPP API returned ${response.status}`);
    }

    const liveData = await response.json();
    console.log('[FPP Sequences] Returning', liveData.length, 'sequences live from FPP');
    
    return NextResponse.json(liveData);

  } catch (error: any) {
    console.error('[FPP Sequences] Error:', error);
    
    return NextResponse.json({
      error: 'Failed to load sequences',
      details: error.message,
      hint: 'Try clicking "Sync Now" to cache data from FPP'
    }, { status: 500 });
  } finally {
    if (db) {
      db.close();
    }
  }
}
