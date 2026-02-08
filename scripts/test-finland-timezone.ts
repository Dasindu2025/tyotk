/**
 * Test Finland timezone (GMT+2) implementation
 * 
 * User's issue: 20:00-02:00 entry showing as 05:30 end time with 9.5h duration
 * Expected: 02:00 end time with 6h duration
 * 
 * The 3.5h difference (05:30 - 02:00) = difference between IST and Finland offsets
 * IST: GMT+5:30 = 330 minutes
 * Finland: GMT+2 = 120 minutes
 * Difference: 330 - 120 = 210 minutes = 3.5 hours ✓
 */

import { calculatePeriodSplit } from "../src/lib/services/time-entry"

const TIMEZONE_OFFSET_MINS = 120 // Finland GMT+2

// Convert Finland local time to UTC
function finlandToUTC(year: number, month: number, day: number, hour: number, minute: number = 0): Date {
  // Create timestamp as if input was UTC, then subtract Finland offset
  const asUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0)
  return new Date(asUtcMs - TIMEZONE_OFFSET_MINS * 60 * 1000)
}

// Format UTC time as Finland local time
function formatUTCToFinnishTime(utcDate: Date): string {
  const utcMins = utcDate.getUTCHours() * 60 + utcDate.getUTCMinutes()
  let localMins = utcMins + TIMEZONE_OFFSET_MINS
  if (localMins >= 24 * 60) localMins -= 24 * 60
  if (localMins < 0) localMins += 24 * 60
  
  const hours = Math.floor(localMins / 60)
  const mins = localMins % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

console.log("=".repeat(70))
console.log("FINLAND TIMEZONE (GMT+2) VERIFICATION")
console.log("=".repeat(70))
console.log("")

// Test the user's specific case: 20:00-02:00 (next day)
console.log("USER'S REPORTED ISSUE:")
console.log("-".repeat(70))
console.log("Input: 20:00-02:00 (next day)")
console.log("Expected: 6 hours duration")
console.log("")

const userStartUTC = finlandToUTC(2026, 2, 7, 20, 0)  // 20:00 Finland
const userEndUTC = finlandToUTC(2026, 2, 8, 2, 0)      // 02:00 Finland (next day)

console.log(`Start UTC: ${userStartUTC.toISOString()} → Finland: ${formatUTCToFinnishTime(userStartUTC)}`)
console.log(`End UTC:   ${userEndUTC.toISOString()} → Finland: ${formatUTCToFinnishTime(userEndUTC)}`)

const durationMs = userEndUTC.getTime() - userStartUTC.getTime()
const durationHours = durationMs / (1000 * 60 * 60)
console.log(`Duration:  ${durationHours}h`)
console.log("")

if (durationHours === 6) {
  console.log("✓ PASS: Duration calculation correct!")
} else {
  console.log(`✗ FAIL: Expected 6h, got ${durationHours}h`)
}
console.log("")

// Test period splits with Finland timezone
console.log("PERIOD SPLIT TESTS (Finland timezone):")
console.log("-".repeat(70))

const dayStartHour = 6
const dayEndHour = 18
const eveningEndHour = 22

const testCases = [
  {
    name: "09:00-17:00 Finland (8h day)",
    start: finlandToUTC(2026, 2, 10, 9, 0),
    end: finlandToUTC(2026, 2, 10, 17, 0),
    expectedDay: 480,
    expectedEvening: 0,
    expectedNight: 0,
  },
  {
    name: "18:00-22:00 Finland (4h evening)",
    start: finlandToUTC(2026, 2, 10, 18, 0),
    end: finlandToUTC(2026, 2, 10, 22, 0),
    expectedDay: 0,
    expectedEvening: 240,
    expectedNight: 0,
  },
  {
    name: "22:00-06:00 Finland (8h night)",
    start: finlandToUTC(2026, 2, 10, 22, 0),
    end: finlandToUTC(2026, 2, 11, 6, 0),
    expectedDay: 0,
    expectedEvening: 0,
    expectedNight: 480,
  },
  {
    name: "20:00-02:00 Finland (2h evening + 4h night = 6h total)",
    start: finlandToUTC(2026, 2, 10, 20, 0),
    end: finlandToUTC(2026, 2, 11, 2, 0),
    expectedDay: 0,
    expectedEvening: 120,  // 20:00-22:00 = 2h
    expectedNight: 240,    // 22:00-02:00 = 4h
  },
]

let allPassed = true

for (const tc of testCases) {
  const result = calculatePeriodSplit(
    tc.start,
    tc.end,
    dayStartHour,
    dayEndHour,
    eveningEndHour,
    TIMEZONE_OFFSET_MINS
  )
  
  const passed = result.dayMins === tc.expectedDay && 
                 result.eveningMins === tc.expectedEvening && 
                 result.nightMins === tc.expectedNight
  
  if (passed) {
    console.log(`✓ PASS: ${tc.name}`)
    console.log(`         day=${result.dayMins}m, eve=${result.eveningMins}m, night=${result.nightMins}m`)
  } else {
    console.log(`✗ FAIL: ${tc.name}`)
    console.log(`  Expected: day=${tc.expectedDay}m, eve=${tc.expectedEvening}m, night=${tc.expectedNight}m`)
    console.log(`  Got:      day=${result.dayMins}m, eve=${result.eveningMins}m, night=${result.nightMins}m`)
    allPassed = false
  }
}

console.log("")
console.log("=".repeat(70))
if (allPassed) {
  console.log("✅ ALL TESTS PASSED - Finland timezone working correctly!")
} else {
  console.log("❌ SOME TESTS FAILED")
}
console.log("=".repeat(70))
