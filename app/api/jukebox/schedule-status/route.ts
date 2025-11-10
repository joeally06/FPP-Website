/**
 * Jukebox Schedule Status API
 * 
 * PUBLIC endpoint - Returns whether the light show is currently active
 * Determines if jukebox features should be enabled based on FPP schedule
 * 
 * SECURITY:
 * - No authentication required (public status info)
 * - Read-only operation (no user input)
 * - Uses cached FPP state (no direct FPP polling)
 * - Timeout protection on optional schedule fetch (3 seconds)
 */

import { NextResponse } from 'next/server';
import { getFPPState } from '@/lib/database';

export async function GET() {
  try {
    // Get cached FPP state (already being polled by fpp-poller.ts)
    const state = getFPPState.get() as any;

    if (!state) {
      return NextResponse.json({
        isActive: false,
        currentPlaylist: null,
        status: 'unknown',
        message: 'Unable to determine show status - polling service may not be running',
        nextShowTime: null,
        lastChecked: null
      });
    }

    // Try to get schedule and determine if show is active
    let nextShowTime = null;
    let isActiveBySchedule = false;
    try {
      const fppUrl = process.env.FPP_URL || process.env.NEXT_PUBLIC_FPP_URL;
      
      if (fppUrl) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        const scheduleResponse = await fetch(`${fppUrl}/api/schedule`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        
        clearTimeout(timeoutId);
        
        if (scheduleResponse.ok) {
          const scheduleData = await scheduleResponse.json();
          
          // Find next enabled playlist in schedule
          const now = new Date();
          const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
          const currentTime = now.getHours() * 60 + now.getMinutes();
          const currentDateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
          
          // Look for next scheduled show
          let foundNextShow = false;
          
          // Filter schedule entries to only active ones with playlists
          const activeEntries = (scheduleData.value || scheduleData).filter((entry: any) => {
            if (!entry.enabled || !entry.playlist || entry.playlist.trim() === '') return false;
            
            // Check date range if specified
            if (entry.startDate && entry.endDate) {
              return currentDateStr >= entry.startDate && currentDateStr <= entry.endDate;
            }
            return true;
          });
          
          if (activeEntries.length === 0) {
            // No active schedule entries - show is not scheduled
            nextShowTime = null;
          } else {
            for (const entry of activeEntries) {
              // FPP uses 'day' (singular) field: 0 = Sunday, 7 = Daily
              let appliesToToday = false;
              if (entry.day === 7) {
                // Daily schedule
                appliesToToday = true;
              } else if (entry.day === currentDay) {
                // Specific day matches
                appliesToToday = true;
              }
              
              // Check if this entry applies to today
              if (appliesToToday) {
                // Parse start and end times (format: "HH:MM:SS")
                const startParts = entry.startTime.split(':');
                const startHours = parseInt(startParts[0]);
                const startMinutes = parseInt(startParts[1]);
                const startTime = startHours * 60 + startMinutes;
                
                const endParts = entry.endTime.split(':');
                const endHours = parseInt(endParts[0]);
                const endMinutes = parseInt(endParts[1]);
                const endTime = endHours * 60 + endMinutes;
                
                // Check if we're currently within the show time
                if (currentTime >= startTime && currentTime < endTime) {
                  isActiveBySchedule = true;
                  // Don't set nextShowTime if we're currently in the show
                  break;
                }
                
                // If show hasn't started yet today, this is the next show
                if (startTime > currentTime && !foundNextShow) {
                  const nextShow = new Date(now);
                  nextShow.setHours(startHours, startMinutes, 0, 0);
                  nextShowTime = nextShow.toISOString();
                  foundNextShow = true;
                }
              }
            }
            
            // If no show today, look for tomorrow
            if (!foundNextShow) {
              const tomorrowDay = (currentDay + 1) % 7;
              
              for (const entry of activeEntries) {
                let appliesToTomorrow = false;
                if (entry.day === 7) {
                  appliesToTomorrow = true;
                } else if (entry.day === tomorrowDay) {
                  appliesToTomorrow = true;
                }
                
                if (appliesToTomorrow) {
                  const timeParts = entry.startTime.split(':');
                  const hours = parseInt(timeParts[0]);
                  const minutes = parseInt(timeParts[1]);
                  
                  const nextShow = new Date(now);
                  nextShow.setDate(nextShow.getDate() + 1);
                  nextShow.setHours(hours, minutes, 0, 0);
                  nextShowTime = nextShow.toISOString();
                  break;
                }
              }
            }
          }
        }
      }
    } catch (error) {
      // Silently fail - next show time is optional enhancement
      console.debug('[Schedule Status] Could not fetch next show time:', error);
    }

    // Determine if show is active
    // Active if: 
    // 1. Within scheduled show time (isActiveBySchedule), OR
    // 2. FPP is playing (status === 'playing'), OR  
    // 3. FPP has a current playlist loaded (fallback for manual playlists)
    const isActive = Boolean(
      isActiveBySchedule || 
      state.status === 'playing' ||
      (state.current_playlist && state.current_playlist.trim() !== '')
    );

    // Build response
    return NextResponse.json({
      isActive,
      currentPlaylist: state.current_playlist || null,
      status: state.status || 'unknown',
      message: isActive 
        ? 'Light show is currently active!' 
        : 'Light show is not currently running',
      nextShowTime,
      lastChecked: state.last_updated || new Date().toISOString()
    });

  } catch (error) {
    console.error('[Schedule Status] Error:', error);
    
    return NextResponse.json({
      isActive: false,
      currentPlaylist: null,
      status: 'error',
      message: 'Failed to check show status',
      nextShowTime: null,
      lastChecked: new Date().toISOString()
    }, { status: 500 });
  }
}
