import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getVoteCounts } from '../../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get vote data
    const voteCounts = getVoteCounts.all();

    // Transform data for analytics
    const analyticsData = voteCounts.map((row: any) => ({
      sequence_name: row.sequence_name,
      upvotes: row.upvotes,
      downvotes: row.downvotes,
      total_votes: row.upvotes + row.downvotes,
      score: row.upvotes - row.downvotes
    }));

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to get analytics' }, { status: 500 });
  }
}