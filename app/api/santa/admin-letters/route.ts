// API Route: Admin Santa Letters Management

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  getAllSantaLetters,
  getSantaLetter,
  updateSantaReply,
  updateSantaLetterStatus,
} from '@/lib/database';
import { sendSantaReply } from '@/lib/email-service';

// GET: Fetch all letters (admin only)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const letters = getAllSantaLetters.all();
    return NextResponse.json(letters);
  } catch (error) {
    console.error('Error fetching Santa letters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch letters' },
      { status: 500 }
    );
  }
}

// PUT: Update letter status (admin only)
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { letterId, status, adminNotes } = await request.json();

    if (!letterId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'approved', 'sent', 'rejected'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    updateSantaLetterStatus.run(status, adminNotes || null, letterId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating letter status:', error);
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }
}

// PATCH: Update Santa's reply (admin only)
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { letterId, santaReply } = await request.json();

    if (!letterId || !santaReply) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    updateSantaReply.run(
      santaReply,
      'approved',
      new Date().toISOString(),
      letterId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating reply:', error);
    return NextResponse.json(
      { error: 'Failed to update reply' },
      { status: 500 }
    );
  }
}
