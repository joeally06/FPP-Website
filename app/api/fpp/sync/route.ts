import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { syncFppData, getSyncStatus } from '@/lib/fpp-sync';

/**
 * POST /api/fpp/sync - Trigger manual sync
 * Requires admin authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - login required' },
        { status: 401 }
      );
    }

    // Check admin access
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
    if (!adminEmails.includes(session.user.email)) {
      return NextResponse.json(
        { error: 'Forbidden - admin access required' },
        { status: 403 }
      );
    }

    console.log(`[API] Manual sync triggered by ${session.user.email}`);

    // Perform sync
    const result = await syncFppData();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Synced ${result.playlistsCount} playlists and ${result.sequencesCount} sequences`,
        data: result
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Sync failed',
        error: result.error,
        data: result
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[API] Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      message: 'Sync failed with exception',
      error: errorMessage
    }, { status: 500 });
  }
}

/**
 * GET /api/fpp/sync - Get current sync status
 * Public endpoint (used to display sync status on UI)
 */
export async function GET(request: NextRequest) {
  try {
    const status = getSyncStatus();
    
    return NextResponse.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('[API] Failed to get sync status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
