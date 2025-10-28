import { NextResponse } from 'next/server';
import { getPopularSequences } from '@/lib/database';

export async function GET() {
  try {
    const popularSequences = getPopularSequences.all(20); // Get top 20 popular sequences
    return NextResponse.json(popularSequences);
  } catch (error) {
    console.error('Error fetching popular sequences:', error);
    return NextResponse.json({ error: 'Failed to fetch popular sequences' }, { status: 500 });
  }
}
