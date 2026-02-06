import { startOfDay, addDays, differenceInMinutes, isAfter, isBefore, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns"

/**
 * Time Entry Service
 * 
 * Handles the critical cross-day time entry splitting logic.
 * When a user enters a time range spanning multiple days,
 * this service automatically splits it into separate entries per day.
 * 
 * Example (with splitHour=0, midnight):
 * Input: Saturday 9:00 PM – Sunday 2:00 AM
 * Output:
 *   Entry 1: Saturday, 21:00-00:00, 180 minutes
 *   Entry 2: Sunday, 00:00-02:00, 120 minutes
 * 
 * Example (with splitHour=6, 6AM):
 * Input: Saturday 9:00 PM – Sunday 2:00 AM
 * Output:
 *   Entry 1: Saturday, 21:00-02:00, 300 minutes (no split, both before 6AM cutoff)
 */

export interface TimeEntryInput {
  startTime: Date
  endTime: Date
  userId: string
  projectId?: string
  workplaceId?: string
  notes?: string
  splitHour?: number  // Hour when day splits (0-23, default 0 = midnight)
}

export interface SplitTimeEntry {
  entryDate: Date          // The calendar date this entry belongs to
  startTime: Date          // Start datetime
  endTime: Date            // End datetime
  durationMinutes: number  // Duration in minutes
  isSplit: boolean         // Whether this was created from a split
  originalStart?: Date     // Original start time if split
  originalEnd?: Date       // Original end time if split
}

/**
 * Get the split point for a given date and hour
 * If splitHour is 0, returns midnight of next day
 * If splitHour is 6, returns 6:00 AM of appropriate day
 */
function getSplitPoint(date: Date, splitHour: number): Date {
  // Get the split hour on the NEXT calendar day
  const nextDay = addDays(startOfDay(date), 1)
  return setMilliseconds(setSeconds(setMinutes(setHours(nextDay, splitHour), 0), 0), 0)
}

/**
 * Check if a time range crosses the split point
 */
export function crossesSplitPoint(startTime: Date, endTime: Date, splitHour: number = 0): boolean {
  const splitPoint = getSplitPoint(startTime, splitHour)
  return isAfter(endTime, splitPoint)
}

/**
 * Split a time entry that crosses the split hour into multiple entries
 * Each entry represents work done on a single "work day"
 */
export function splitTimeEntry(input: TimeEntryInput): SplitTimeEntry[] {
  const { startTime, endTime, splitHour = 0 } = input
  
  // Validate times
  if (isAfter(startTime, endTime)) {
    throw new Error("Start time must be before end time")
  }
  
  // Check if we need to split
  const splitPoint = getSplitPoint(startTime, splitHour)
  const needsSplit = isAfter(endTime, splitPoint)
  
  // If no split needed, return single entry
  if (!needsSplit) {
    // Entry date is the start date (adjusted for split hour)
    const entryDate = startOfDay(startTime)
    return [{
      entryDate,
      startTime,
      endTime,
      durationMinutes: differenceInMinutes(endTime, startTime),
      isSplit: false,
    }]
  }
  
  // Cross-day entry - need to split
  const entries: SplitTimeEntry[] = []
  let currentStart = startTime
  
  while (isBefore(currentStart, endTime)) {
    // Determine the split point from current start
    const nextSplit = getSplitPoint(currentStart, splitHour)
    const currentEnd = isBefore(nextSplit, endTime) ? nextSplit : endTime
    
    // Calculate duration
    const durationMinutes = differenceInMinutes(currentEnd, currentStart)
    
    // Only add if there's actual time
    if (durationMinutes > 0) {
      entries.push({
        entryDate: startOfDay(currentStart),
        startTime: currentStart,
        endTime: currentEnd,
        durationMinutes,
        isSplit: true,
        originalStart: startTime,
        originalEnd: endTime,
      })
    }
    
    // Move to next split point
    currentStart = nextSplit
  }
  
  return entries
}

/**
 * Calculate total hours from multiple entries
 */
export function calculateTotalHours(entries: SplitTimeEntry[]): number {
  const totalMinutes = entries.reduce((sum, entry) => sum + entry.durationMinutes, 0)
  return Math.round((totalMinutes / 60) * 100) / 100 // Round to 2 decimal places
}

/**
 * Validate time entry input
 */
export function validateTimeEntry(input: TimeEntryInput): { valid: boolean; error?: string } {
  const { startTime, endTime } = input
  
  if (!startTime || !endTime) {
    return { valid: false, error: "Start and end times are required" }
  }
  
  if (isAfter(startTime, endTime)) {
    return { valid: false, error: "Start time must be before end time" }
  }
  
  const durationMinutes = differenceInMinutes(endTime, startTime)
  
  if (durationMinutes < 1) {
    return { valid: false, error: "Duration must be at least 1 minute" }
  }
  
  if (durationMinutes > 24 * 60) {
    return { valid: false, error: "Duration cannot exceed 24 hours" }
  }
  
  return { valid: true }
}

/**
 * Get date range for a month (for calendar view)
 */
export function getMonthDateRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

/**
 * Group entries by date (for calendar display)
 */
export function groupEntriesByDate<T extends { entryDate: Date }>(
  entries: T[]
): Map<string, T[]> {
  const grouped = new Map<string, T[]>()
  
  for (const entry of entries) {
    const dateKey = startOfDay(entry.entryDate).toISOString().split("T")[0]
    const existing = grouped.get(dateKey) || []
    existing.push(entry)
    grouped.set(dateKey, existing)
  }
  
  return grouped
}

/**
 * Calculate the split of time across Day, Evening, and Night periods
 * based on workspace hour configurations.
 */
export function calculatePeriodSplit(
  startTime: Date,
  endTime: Date,
  dayStartHour: number,
  dayEndHour: number,
  eveningEndHour: number
): { dayMins: number; eveningMins: number; nightMins: number } {
  // Use LOCAL hours since workspace settings are configured in local time
  // (e.g., admin sets "Evening starts at 6 PM" meaning local 6 PM)
  const startMins = startTime.getHours() * 60 + startTime.getMinutes()
  let endMins = endTime.getHours() * 60 + endTime.getMinutes()
  
  // Handle cross-midnight by adding 24 hours to end minutes
  if (endMins <= startMins) {
    endMins += 24 * 60
  }
  
  const dayStartMins = dayStartHour * 60
  const dayEndMins = dayEndHour * 60
  const eveningEndMins = eveningEndHour * 60
  
  const getOverlap = (pStart: number, pEnd: number) => {
    // Check overlap for current day window
    const overlapStart = Math.max(startMins, pStart)
    const overlapEnd = Math.min(endMins, pEnd)
    const currentDay = Math.max(0, overlapEnd - overlapStart)

    // Check overlap for next day window (if it crosses midnight)
    const overlapStartNext = Math.max(startMins, pStart + 24 * 60)
    const overlapEndNext = Math.min(endMins, pEnd + 24 * 60)
    const nextDay = Math.max(0, overlapEndNext - overlapStartNext)

    return currentDay + nextDay
  }
  
  const dayMins = getOverlap(dayStartMins, dayEndMins)
  const eveningMins = getOverlap(dayEndMins, eveningEndMins)
  // Night period spans from eveningEnd to dayStart (crosses midnight)
  const nightMins = getOverlap(eveningEndMins, dayStartMins + 24 * 60)
  
  return { dayMins, eveningMins, nightMins }
}
