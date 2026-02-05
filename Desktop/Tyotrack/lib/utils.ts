import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the start and end of the current week (Sunday to Saturday)
 */
export function getCurrentWeekRange() {
  const now = new Date();
  return {
    start: startOfWeek(now, { weekStartsOn: 0 }), // Sunday
    end: endOfWeek(now, { weekStartsOn: 0 }) // Saturday
  };
}

/**
 * Get the start and end of the current month
 */
export function getCurrentMonthRange() {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: endOfMonth(now)
  };
}

/**
 * Convert HH:mm time string to minutes from midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Calculate day/evening/night hours based on company shift settings
 */
export function calculateShiftHours(
  startMins: number,
  endMins: number,
  settings: { dayStart: string; eveningStart: string; nightStart: string }
) {
  const dayStart = timeToMinutes(settings.dayStart || "06:00");
  const eveningStart = timeToMinutes(settings.eveningStart || "18:00");
  const nightStart = timeToMinutes(settings.nightStart || "22:00");

  // Helper to calculate overlap between two time ranges
  const getOverlap = (s1: number, e1: number, s2: number, e2: number) => {
    const start = Math.max(s1, s2);
    const end = Math.min(e1, e2);
    return Math.max(0, end - start);
  };

  // Night hours: midnight to dayStart, nightStart to midnight
  const night1 = getOverlap(startMins, endMins, 0, dayStart);
  const night2 = getOverlap(startMins, endMins, nightStart, 1440);
  
  // Day hours: dayStart to eveningStart
  const day = getOverlap(startMins, endMins, dayStart, eveningStart);
  
  // Evening hours: eveningStart to nightStart
  const evening = getOverlap(startMins, endMins, eveningStart, nightStart);

  return {
    dayHours: day / 60,
    eveningHours: evening / 60,
    nightHours: (night1 + night2) / 60,
    totalHours: (endMins - startMins) / 60
  };
}
