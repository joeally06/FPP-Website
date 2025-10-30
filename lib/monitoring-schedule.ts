import { getMonitoringSchedule } from './database';

export interface MonitoringSchedule {
  id: number;
  enabled: boolean;
  start_time: string;
  end_time: string;
  timezone: string;
  updated_at: string;
}

/**
 * Check if device monitoring should be active based on the configured schedule
 */
export function isMonitoringActive(): boolean {
  try {
    const schedule = getMonitoringSchedule.get() as MonitoringSchedule | undefined;
    
    // If no schedule found or schedule is disabled, always monitor
    if (!schedule || !schedule.enabled) {
      return true;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = schedule.start_time.split(':').map(Number);
    const [endHour, endMin] = schedule.end_time.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Handle overnight schedules (e.g., 22:00 - 02:00)
    if (endMinutes < startMinutes) {
      return currentTime >= startMinutes || currentTime <= endMinutes;
    }

    // Normal schedule (e.g., 16:00 - 22:00)
    return currentTime >= startMinutes && currentTime <= endMinutes;
  } catch (error) {
    console.error('[Monitoring Schedule] Error checking schedule:', error);
    // On error, default to monitoring active to avoid missing critical alerts
    return true;
  }
}

/**
 * Get the current monitoring schedule configuration
 */
export function getSchedule(): MonitoringSchedule | null {
  try {
    return getMonitoringSchedule.get() as MonitoringSchedule | null;
  } catch (error) {
    console.error('[Monitoring Schedule] Error getting schedule:', error);
    return null;
  }
}

/**
 * Format time for display (e.g., "16:00" -> "4:00 PM")
 */
export function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}
