import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getActiveTheme, setActiveTheme } from '@/lib/database';

// GET /api/theme - Get active theme
export async function GET() {
  try {
    const result = getActiveTheme.get() as { active_theme_id: string; custom_particles: string | null } | undefined;
    const themeId = result?.active_theme_id || 'default';
    const customParticles = result?.custom_particles ? JSON.parse(result.custom_particles) : {};
    
    return NextResponse.json({ themeId, customParticles });
  } catch (error) {
    console.error('Error fetching theme:', error);
    return NextResponse.json({ themeId: 'default', customParticles: {} });
  }
}

// POST /api/theme - Set active theme (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is admin
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { themeId, customParticles } = await request.json();
    
    if (!themeId) {
      return NextResponse.json(
        { error: 'Theme ID is required' },
        { status: 400 }
      );
    }

    const customParticlesJson = customParticles ? JSON.stringify(customParticles) : null;
    setActiveTheme.run(themeId, customParticlesJson);
    
    return NextResponse.json({ 
      success: true, 
      themeId,
      customParticles 
    });
  } catch (error) {
    console.error('Error setting theme:', error);
    return NextResponse.json(
      { error: 'Failed to set theme' },
      { status: 500 }
    );
  }
}
