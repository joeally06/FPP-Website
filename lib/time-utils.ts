import { DateTime } from 'luxon';

// Global timezone configuration
export const APP_TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || 'America/Chicago';

/**
 * Convert database UTC timestamp to local timezone
 */
export function formatDateTime(
  utcTimestamp: string | null,
  format: 'short' | 'medium' | 'long' | 'relative' = 'medium'
): string {
  if (!utcTimestamp) return 'Never';

  try {
    const dt = DateTime.fromISO(utcTimestamp, { zone: 'utc' })
      .setZone(APP_TIMEZONE);

    switch (format) {
      case 'short':
        return dt.toLocaleString(DateTime.TIME_SIMPLE); // "4:30 PM"
      case 'medium':
        return dt.toLocaleString(DateTime.DATETIME_SHORT); // "10/30/2025, 4:30 PM"
      case 'long':
        return dt.toLocaleString(DateTime.DATETIME_MED); // "Oct 30, 2025, 4:30 PM"
      case 'relative':
        return dt.toRelative() || 'Unknown'; // "5 minutes ago"
      default:
        return dt.toLocaleString(DateTime.DATETIME_SHORT);
    }
  } catch (error) {
    console.error('[Time Utils] Error formatting timestamp:', error);
    return 'Invalid date';
  }
}

/**
 * Get current time in app timezone
 */
export function getCurrentTime(format: 'iso' | 'display' | 'simple' = 'display'): string {
  const now = DateTime.now().setZone(APP_TIMEZONE);
  
  if (format === 'iso') {
    return now.toISO() || '';
  }
  
  if (format === 'simple') {
    return now.toLocaleString(DateTime.DATETIME_SHORT);
  }
  
  return now.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
}

/**
 * Check if timestamp is within last N minutes
 */
export function isRecent(utcTimestamp: string | null, minutes: number = 5): boolean {
  if (!utcTimestamp) return false;
  
  try {
    const dt = DateTime.fromISO(utcTimestamp, { zone: 'utc' });
    const now = DateTime.now();
    
    return now.diff(dt, 'minutes').minutes <= minutes;
  } catch (error) {
    return false;
  }
}

/**
 * Format time range (for monitoring schedule)
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  const start = formatTime(startTime);
  const end = formatTime(endTime);
  return `${start} - ${end}`;
}

/**
 * Convert 24-hour time to 12-hour display
 */
export function formatTime(time24: string): string {
  try {
    const [hour, minute] = time24.split(':').map(Number);
    const dt = DateTime.now()
      .setZone(APP_TIMEZONE)
      .set({ hour, minute });
    
    return dt.toLocaleString(DateTime.TIME_SIMPLE); // "4:00 PM"
  } catch (error) {
    return time24;
  }
}

/**
 * Get timezone abbreviation (CST/CDT)
 */
export function getTimezoneAbbr(): string {
  return DateTime.now()
    .setZone(APP_TIMEZONE)
    .toFormat('ZZZZ'); // "CST" or "CDT"
}

/**
 * Get timezone display name
 */
export function getTimezoneName(): string {
  return APP_TIMEZONE;
}

/**
 * Format duration in seconds to readable format
 */
export function formatDuration(seconds: number): string {
  const duration = DateTime.fromSeconds(0).plus({ seconds });
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}
