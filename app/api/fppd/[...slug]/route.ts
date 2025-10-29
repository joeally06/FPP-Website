import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const url = `http://192.168.5.2/api/fppd/${slug.join('/')}`;
  try {
    const response = await fetch(url);
    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching from FPPD:', error);
    return NextResponse.json({ error: `Failed to fetch from FPPD: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  
  // Require admin authentication for all POST requests
  try {
    await requireAdmin();
  } catch (error) {
    console.error('Unauthorized API access attempt:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unauthorized' },
      { status: 401 }
    );
  }
  
  const url = `http://192.168.5.2/api/fppd/${slug.join('/')}`;
  try {
    const body = await request.text();
    const response = await fetch(url, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
      },
    });
    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching from FPPD:', error);
    return NextResponse.json({ error: `Failed to fetch from FPPD: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}
