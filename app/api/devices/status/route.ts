import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { getAllDevices, getAllDeviceStatuses } from '@/lib/database';

/**
 * GET /api/devices/status
 * Get all device statuses
 * 🔒 ADMIN ONLY - Contains device health and network information
 */
export async function GET() {
  try {
    // Require admin authentication
    await requireAdmin();
    
    const devices = getAllDevices.all();
    const statuses = getAllDeviceStatuses.all();
    
    return NextResponse.json({
      success: true,
      devices,
      statuses,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Device Status API] Error fetching device statuses:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error && error.message.includes('Unauthorized') ? error.message : 'Failed to fetch device statuses' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
