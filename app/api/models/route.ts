import { NextResponse } from 'next/server';
import db from '@/lib/database';

export async function GET() {
  try {
    const models = db.prepare(`
      SELECT * FROM fpp_models 
      ORDER BY controller_name, controller_ports, start_channel_no
    `).all();

    return NextResponse.json(models);
  } catch (error: any) {
    console.error('Error fetching models:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
