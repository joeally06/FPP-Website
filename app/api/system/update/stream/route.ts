import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { spawn } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * GET /api/system/update/stream
 * Stream live update process output
 * ADMIN ONLY - System update operations can modify critical files
 */
export async function GET(request: NextRequest) {
  // Require admin authentication
  try {
    await requireAdmin();
  } catch (error: any) {
    if (error.message?.includes('Authentication required')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const encoder = new TextEncoder();

  // Create a ReadableStream that will stream the update output
  const stream = new ReadableStream({
    start(controller) {
      const updateScript = path.join(process.cwd(), 'update.sh');
      
      // Spawn the update script
      const updateProcess = spawn('bash', [updateScript], {
        cwd: process.cwd(),
        env: { ...process.env, FORCE_COLOR: '1' },
        shell: true,
      });

      // Send initial message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'start', message: '🔄 Starting update process...' })}\n\n`)
      );

      // Stream stdout
      updateProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'stdout', message: line })}\n\n`)
            );
          }
        });
      });

      // Stream stderr
      updateProcess.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'stderr', message: line })}\n\n`)
            );
          }
        });
      });

      // Handle process completion
      updateProcess.on('close', (code) => {
        if (code === 0) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'complete', 
              message: '✅ Update completed successfully! Server is restarting...', 
              code 
            })}\n\n`)
          );
        } else {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              message: `❌ Update failed with exit code ${code}`, 
              code 
            })}\n\n`)
          );
        }
        controller.close();
      });

      // Handle errors
      updateProcess.on('error', (error) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            message: `❌ Error executing update: ${error.message}` 
          })}\n\n`)
        );
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
