import { NextResponse } from 'next/server';
import { getAllYouTubeVideos } from '@/lib/database';

/**
 * GET /api/youtube-videos
 * Get all YouTube videos for light shows
 * PUBLIC - Accessible to all users for jukebox integration
 */
export async function GET() {
  try {
    const videos = getAllYouTubeVideos.all() as Array<{
      id: number;
      title: string;
      youtube_id: string;
      description: string | null;
      thumbnail_url: string | null;
      duration_seconds: number | null;
      created_at: string;
    }>;

    return NextResponse.json({
      success: true,
      videos: videos.map(video => ({
        id: video.id,
        title: video.title,
        youtube_id: video.youtube_id,
        description: video.description,
        thumbnail_url: video.thumbnail_url,
        duration_seconds: video.duration_seconds,
        created_at: video.created_at
      }))
    });
  } catch (error) {
    console.error('[YouTube Videos] Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}