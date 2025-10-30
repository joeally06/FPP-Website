import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllDevices, 
  insertDevice, 
  updateDevice, 
  deleteDevice,
  getDeviceById 
} from '@/lib/database';

// GET - Get all devices
export async function GET() {
  try {
    const devices = getAllDevices.all();
    return NextResponse.json({ success: true, devices });
  } catch (error) {
    console.error('[Device API] Failed to get devices:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get devices' }, 
      { status: 500 }
    );
  }
}

// POST - Create new device
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, type, ip, enabled, description } = body;

    // Validation
    if (!id || !name || !type || !ip) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id, name, type, ip' },
        { status: 400 }
      );
    }

    // Check if ID already exists
    const existing = getDeviceById.get(id);
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Device ID already exists' },
        { status: 409 }
      );
    }

    // Validate IP format
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(ip)) {
      return NextResponse.json(
        { success: false, error: 'Invalid IP address format' },
        { status: 400 }
      );
    }

    insertDevice.run(
      id,
      name,
      type,
      ip,
      enabled ? 1 : 0,
      description || null
    );

    console.log(`✅ [Device API] Device created: ${name} (${ip})`);

    return NextResponse.json({ 
      success: true, 
      message: 'Device created successfully',
      device: { id, name, type, ip, enabled, description }
    });
  } catch (error) {
    console.error('[Device API] Failed to create device:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create device' }, 
      { status: 500 }
    );
  }
}

// PUT - Update existing device
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, type, ip, enabled, description } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Device ID required' }, 
        { status: 400 }
      );
    }

    // Check if device exists
    const existing = getDeviceById.get(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Device not found' }, 
        { status: 404 }
      );
    }

    // Validate IP format
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(ip)) {
      return NextResponse.json(
        { success: false, error: 'Invalid IP address format' },
        { status: 400 }
      );
    }

    updateDevice.run(
      name,
      type,
      ip,
      enabled ? 1 : 0,
      description || null,
      id
    );

    console.log(`✅ [Device API] Device updated: ${name} (${ip})`);

    return NextResponse.json({ 
      success: true, 
      message: 'Device updated successfully' 
    });
  } catch (error) {
    console.error('[Device API] Failed to update device:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update device' }, 
      { status: 500 }
    );
  }
}

// DELETE - Delete device
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Device ID required' }, 
        { status: 400 }
      );
    }

    // Check if device exists
    const existing = getDeviceById.get(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Device not found' }, 
        { status: 404 }
      );
    }

    deleteDevice.run(id);

    console.log(`✅ [Device API] Device deleted: ${id}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Device deleted successfully' 
    });
  } catch (error) {
    console.error('[Device API] Failed to delete device:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete device' }, 
      { status: 500 }
    );
  }
}
