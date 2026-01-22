import { startOfDay, endOfDay, addDays, differenceInMinutes, isAfter, isBefore, isSameDay } from "date-fns"

/**
 * Time Entry Service
 * 
 * Handles the critical cross-day time entry splitting logic.
 * When a user enters a time range spanning multiple days,
 * this service automatically splits it into separate entries per day.
 * 
 * Example:
 * Input: Saturday 9:00 PM – Sunday 2:00 AM
 * Output:
 *   Entry 1: Saturday, 21:00-00:00, 180 minutes
 *   Entry 2: Sunday, 00:00-02:00, 120 minutes
 */

export interface TimeEntryInput {
  startTime: Date
  endTime: Date
  userId: string
  projectId?: string
  workplaceId?: string
  notes?: string
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
 * Check if a time range crosses midnight (spans multiple days)
 */
export function crossesMidnight(startTime: Date, endTime: Date): boolean {
  return !isSameDay(startTime, endTime)
}

/**
 * Get midnight of the next day
 */
function getMidnight(date: Date): Date {
  return startOfDay(addDays(date, 1))
}

/**
 * Split a time entry that crosses midnight into multiple entries
 * Each entry represents work done on a single calendar day
 */
export function splitTimeEntry(input: TimeEntryInput): SplitTimeEntry[] {
  const { startTime, endTime } = input
  
  // Validate times
  if (isAfter(startTime, endTime)) {
    throw new Error("Start time must be before end time")
  }
  
  // If same day, return single entry
  if (isSameDay(startTime, endTime)) {
    return [{
      entryDate: startOfDay(startTime),
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
    // Determine the end of the current day's entry
    const midnight = getMidnight(currentStart)
    const currentEnd = isBefore(midnight, endTime) ? midnight : endTime
    
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
    
    // Move to next day
    currentStart = midnight
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
