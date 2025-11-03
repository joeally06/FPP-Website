import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getSettings, getSettingsDetailed, updateSettings } from '@/lib/settings';

/**
 * GET /api/settings
 * Get all settings or filter by category
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const detailed = searchParams.get('detailed') === 'true';

    if (detailed) {
      const settings = getSettingsDetailed(category || undefined);
      return NextResponse.json({ settings });
    } else {
      const settings = getSettings(category || undefined);
      return NextResponse.json({ settings });
    }
  } catch (error) {
    console.error('Error in GET /api/settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings
 * Update multiple settings at once
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Invalid settings format' },
        { status: 400 }
      );
    }

    // Validate settings - all values must be strings
    for (const [key, value] of Object.entries(settings)) {
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        return NextResponse.json(
          { error: `Invalid value type for ${key}` },
          { status: 400 }
        );
      }
    }

    // Convert all values to strings
    const stringSettings: Record<string, string> = {};
    for (const [key, value] of Object.entries(settings)) {
      stringSettings[key] = String(value);
    }

    // Update settings
    updateSettings(stringSettings);

    return NextResponse.json({ 
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Error in PUT /api/settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
