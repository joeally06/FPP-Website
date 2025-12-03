import { NextRequest, NextResponse } from 'next/server';
import { insertVote, getVoteCounts, getUserVote } from '../../../lib/database';
import { fetchLocationFromIP, getDistanceInMiles } from '@/lib/location-utils';
import db from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { sequenceName, voteType } = await request.json();

    if (!sequenceName || !['up', 'down'].includes(voteType)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Get user IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

    // Get user's geolocation and check restrictions
    let userLocation = null;
    let distanceFromShow = null;

    try {
      userLocation = await fetchLocationFromIP(ip);
      
      if (userLocation) {
        // Check if location restrictions are enabled
        const restrictions = db.prepare(`
          SELECT is_active, max_distance_miles, show_latitude, show_longitude
          FROM location_restrictions WHERE id = 1
        `).get() as any;
        
        if (restrictions?.is_active && restrictions.show_latitude && restrictions.show_longitude) {
          distanceFromShow = getDistanceInMiles(
            userLocation.lat,
            userLocation.lng,
            restrictions.show_latitude,
            restrictions.show_longitude
          );
          
          if (distanceFromShow > restrictions.max_distance_miles) {
            console.log(`[Security] Vote blocked - ${ip} is ${distanceFromShow.toFixed(2)} miles away (limit: ${restrictions.max_distance_miles})`);
            
            return NextResponse.json({
              error: `You must be within ${restrictions.max_distance_miles} mile(s) of the light show to vote. You are ${distanceFromShow.toFixed(1)} miles away.`,
              distanceMiles: distanceFromShow,
              maxDistance: restrictions.max_distance_miles
            }, { status: 403 });
          }
        }
      }
    } catch (geoError) {
      console.warn('[Geo] Location check failed for vote:', geoError);
      // Allow vote if geolocation fails
    }

    // Insert or update vote with location data
    db.prepare(`
      INSERT INTO votes (sequence_name, vote_type, user_ip, latitude, longitude, city, region, country_code, distance_from_show)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(sequence_name, user_ip) 
      DO UPDATE SET 
        vote_type = excluded.vote_type,
        created_at = CURRENT_TIMESTAMP,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        city = excluded.city,
        region = excluded.region,
        country_code = excluded.country_code,
        distance_from_show = excluded.distance_from_show
    `).run(
      sequenceName,
      voteType,
      ip,
      userLocation?.lat || null,
      userLocation?.lng || null,
      userLocation?.city || null,
      userLocation?.region || null,
      userLocation?.countryCode || null,
      distanceFromShow
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json({ error: 'Failed to save vote' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sequenceName = searchParams.get('sequence');
    const userIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    if (sequenceName) {
      // Get user's vote for specific sequence
      const userVote = getUserVote.get(sequenceName, userIp) as { vote_type: string } | undefined;
      return NextResponse.json({ userVote: userVote?.vote_type || null });
    } else {
      // Get all vote counts
      const voteCounts = getVoteCounts.all();
      const countsMap = voteCounts.reduce((acc: any, row: any) => {
        acc[row.sequence_name] = {
          upvotes: row.upvotes,
          downvotes: row.downvotes
        };
        return acc;
      }, {});
      return NextResponse.json(countsMap);
    }
  } catch (error) {
    console.error('Get votes error:', error);
    return NextResponse.json({ error: 'Failed to get votes' }, { status: 500 });
  }
}