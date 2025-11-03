import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    // Validate required fields
    if (!data.model_name || !data.channel_count) {
      return NextResponse.json(
        { error: 'Model name and channel count are required' },
        { status: 400 }
      );
    }

    // Update the model
    const stmt = db.prepare(`
      UPDATE fpp_models SET
        model_name = ?,
        display_as = ?,
        string_type = ?,
        string_count = ?,
        node_count = ?,
        channel_count = ?,
        start_channel_no = ?,
        end_channel_no = ?,
        controller_name = ?,
        controller_ip = ?,
        controller_ports = ?,
        protocol = ?,
        connection_protocol = ?,
        connection_attributes = ?,
        est_current_amps = ?,
        universe_id = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      data.model_name,
      data.display_as || '',
      data.string_type || '',
      data.string_count || 0,
      data.node_count || 0,
      data.channel_count || 0,
      data.start_channel_no || 0,
      data.end_channel_no || 0,
      data.controller_name || '',
      data.controller_ip || '',
      data.controller_ports || '',
      data.protocol || '',
      data.connection_protocol || '',
      data.connection_attributes || '',
      data.est_current_amps || 0,
      data.universe_id || '',
      id
    );

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Model updated successfully'
    });

  } catch (error) {
    console.error('Error updating model:', error);
    return NextResponse.json(
      { error: 'Failed to update model' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stmt = db.prepare('DELETE FROM fpp_models WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Model deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting model:', error);
    return NextResponse.json(
      { error: 'Failed to delete model' },
      { status: 500 }
    );
  }
}
