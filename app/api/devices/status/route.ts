import { NextResponse } from 'next/server';
import { getAllDevices, getAllDeviceStatuses } from '@/lib/database';

export async function GET() {
  try {
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
      { success: false, error: 'Failed to fetch device statuses' },
      { status: 500 }
    );
  }
}
