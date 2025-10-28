import { NextResponse } from 'next/server';
import { getCachedSequences, getCacheAge } from '@/lib/database';

export async function GET() {
  try {
    const sequences = getCachedSequences.all().map((row: any) => row.sequence_name);
    const cacheInfo = getCacheAge.get() as { last_updated?: string } | undefined;

    return NextResponse.json({
      sequences,
      lastUpdated: cacheInfo?.last_updated || null,
      count: sequences.length
    });
  } catch (error) {
    console.error('Error fetching cached sequences:', error);
    return NextResponse.json({ error: 'Failed to fetch cached sequences' }, { status: 500 });
  }
}
