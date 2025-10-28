import { NextRequest, NextResponse } from 'next/server';
import { insertVote, getVoteCounts, getUserVote } from '../../../lib/database';

export async function POST(request: NextRequest) {
  try {
    const { sequenceName, voteType } = await request.json();

    if (!sequenceName || !['up', 'down'].includes(voteType)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Get user IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

    // Insert or update vote
    insertVote.run(sequenceName, voteType, ip);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json({ error: 'Failed to save vote' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sequenceName = searchParams.get('sequence');
    const userIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    if (sequenceName) {
      // Get user's vote for specific sequence
      const userVote = getUserVote.get(sequenceName, userIp) as { vote_type: string } | undefined;
      return NextResponse.json({ userVote: userVote?.vote_type || null });
    } else {
      // Get all vote counts
      const voteCounts = getVoteCounts.all();
      const countsMap = voteCounts.reduce((acc: any, row: any) => {
        acc[row.sequence_name] = {
          upvotes: row.upvotes,
          downvotes: row.downvotes
        };
        return acc;
      }, {});
      return NextResponse.json(countsMap);
    }
  } catch (error) {
    console.error('Get votes error:', error);
    return NextResponse.json({ error: 'Failed to get votes' }, { status: 500 });
  }
}