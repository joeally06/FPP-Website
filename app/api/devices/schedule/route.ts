import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { getMonitoringSchedule, updateMonitoringSchedule } from '@/lib/database';

/**
 * GET /api/devices/schedule
 * Get device monitoring schedule
 * 🔒 ADMIN ONLY - Contains device monitoring configuration
 */
export async function GET() {
  try {
    // Require admin authentication
    await requireAdmin();
    
    const schedule = getMonitoringSchedule.get();
    
    return NextResponse.json({
      success: true,
      schedule
    });
  } catch (error) {
    console.error('[Schedule API] Error getting schedule:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error && error.message.includes('Unauthorized') ? error.message : 'Failed to get monitoring schedule' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

/**
 * PUT /api/devices/schedule
 * Update device monitoring schedule
 * 🔒 ADMIN ONLY - Can modify monitoring behavior
 */
export async function PUT(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin();
    
    const body = await request.json();
    const { enabled, start_time, end_time, timezone } = body;

    // Validation
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Enabled must be a boolean' },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return NextResponse.json(
        { success: false, error: 'Invalid time format. Use HH:MM (24-hour format)' },
        { status: 400 }
      );
    }

    // Update schedule
    updateMonitoringSchedule.run(
      enabled ? 1 : 0,
      start_time,
      end_time,
      timezone || 'America/Chicago'
    );

    console.log(`✅ [Schedule API] Monitoring schedule updated: ${enabled ? 'Enabled' : 'Disabled'}, ${start_time} - ${end_time}`);

    const updatedSchedule = getMonitoringSchedule.get();

    return NextResponse.json({
      success: true,
      message: 'Monitoring schedule updated successfully',
      schedule: updatedSchedule
    });

  } catch (error) {
    console.error('[Schedule API] Error updating schedule:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error && error.message.includes('Unauthorized') ? error.message : 'Failed to update monitoring schedule' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
