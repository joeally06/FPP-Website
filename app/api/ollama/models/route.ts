import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ollama/models
 * Fetch available models from Ollama server
 * ADMIN ONLY
 */
export async function GET() {
  try {
    await requireAdmin();

    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    
    console.log('[Ollama] Fetching models from:', ollamaUrl);
    
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[Ollama] Failed to fetch models:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch models from Ollama server', models: [] },
        { status: 500 }
      );
    }

    const data = await response.json();
    
    // Extract model names from response
    // Ollama /api/tags returns { models: [{ name: "model:tag", ... }, ...] }
    const models = data.models?.map((model: any) => model.name) || [];
    
    console.log('[Ollama] Found models:', models);

    return NextResponse.json({
      success: true,
      models,
      count: models.length,
    });
  } catch (error: any) {
    if (error.message?.includes('Authentication required')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    console.error('[Ollama] Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models', models: [] },
      { status: 500 }
    );
  }
}
