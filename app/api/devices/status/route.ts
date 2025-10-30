import { NextResponse } from 'next/server';
import { DEVICES } from '@/lib/device-config';
import { getAllDeviceStatuses } from '@/lib/database';

export async function GET() {
  try {
    const statuses = getAllDeviceStatuses.all();
    
    return NextResponse.json({
      success: true,
      devices: DEVICES,
      statuses,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Device Status API] Error fetching device statuses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch device statuses' },
      { status: 500 }
    );
  }
}
