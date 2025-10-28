import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const url = `http://192.168.5.2/api/${slug.map(encodeURIComponent).join('/')}`;
  try {
    const response = await fetch(url);
    const data = await response.text();
    console.log('FPP API call:', url, 'status:', response.status, 'body:', data);
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching from FPP web API:', error);
    return NextResponse.json({ error: `Failed to fetch from FPP web API: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const url = `http://192.168.5.2/api/${slug.map(encodeURIComponent).join('/')}`;
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
    console.log('FPP API call:', url, 'status:', response.status, 'body:', data);
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching from FPP web API:', error);
    return NextResponse.json({ error: `Failed to fetch from FPP web API: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}
