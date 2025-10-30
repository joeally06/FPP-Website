import { NextRequest, NextResponse } from 'next/server';
import { getMonitoringSchedule, updateMonitoringSchedule } from '@/lib/database';

export async function GET() {
  try {
    const schedule = getMonitoringSchedule.get();
    
    return NextResponse.json({
      success: true,
      schedule
    });
  } catch (error) {
    console.error('[Schedule API] Error getting schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get monitoring schedule' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
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
      { success: false, error: 'Failed to update monitoring schedule' },
      { status: 500 }
    );
  }
}
