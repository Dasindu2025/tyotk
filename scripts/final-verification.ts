/**
 * Final Verification with Date.UTC approach
 * 
 * Tests the corrected IST→UTC conversion logic using Date.UTC()
 */

import prisma from "../src/lib/prisma"
import { calculatePeriodSplit } from "../src/lib/services/time-entry"

// Convert IST time to UTC using Date.UTC (same as the fixed API code)
function istToUTC(year: number, month: number, day: number, hour: number, minute: number = 0): Date {
  // Create timestamp as if input was UTC, then subtract IST offset
  const asUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0)
  return new Date(asUtcMs - 330 * 60 * 1000)
}

async function verify() {
  console.log("=".repeat(70))
  console.log("FINAL VERIFICATION - Using Date.UTC Approach")
  console.log("=".repeat(70))
  console.log("")
  
  // Workspace settings
  const dayStartHour = 6
  const dayEndHour = 18
  const eveningEndHour = 22
  const timezoneOffsetMins = 330
  
  console.log(`Workspace Settings: Day ${dayStartHour}:00-${dayEndHour}:00, Evening ${dayEndHour}:00-${eveningEndHour}:00, Night ${eveningEndHour}:00-${dayStartHour}:00`)
  console.log("")
  
  let allPassed = true
  
  const testCases = [
    {
      name: "09:00-17:00 IST (8h day)",
      start: istToUTC(2026, 2, 10, 9, 0),
      end: istToUTC(2026, 2, 10, 17, 0),
      expectedDay: 480,
      expectedEvening: 0,
      expectedNight: 0,
    },
    {
      name: "18:00-22:00 IST (4h evening)",
      start: istToUTC(2026, 2, 10, 18, 0),
      end: istToUTC(2026, 2, 10, 22, 0),
      expectedDay: 0,
      expectedEvening: 240,
      expectedNight: 0,
    },
    {
      name: "22:00-02:00 IST (4h night, cross-midnight)",
      start: istToUTC(2026, 2, 10, 22, 0),
      end: istToUTC(2026, 2, 11, 2, 0),
      expectedDay: 0,
      expectedEvening: 0,
      expectedNight: 240,
    },
    {
      name: "00:00-06:00 IST (6h night, early morning)",
      start: istToUTC(2026, 2, 11, 0, 0),
      end: istToUTC(2026, 2, 11, 6, 0),
      expectedDay: 0,
      expectedEvening: 0,
      expectedNight: 360,
    },
    {
      name: "17:00-23:00 IST (1h day + 4h evening + 1h night)",
      start: istToUTC(2026, 2, 10, 17, 0),
      end: istToUTC(2026, 2, 10, 23, 0),
      expectedDay: 60,
      expectedEvening: 240,
      expectedNight: 60,
    },
    {
      name: "06:00-18:00 IST (12h day - full day shift)",
      start: istToUTC(2026, 2, 10, 6, 0),
      end: istToUTC(2026, 2, 10, 18, 0),
      expectedDay: 720,
      expectedEvening: 0,
      expectedNight: 0,
    },
    {
      name: "21:00-05:30 IST (next day, 8.5h mostly night)",
      start: istToUTC(2026, 2, 10, 21, 0),
      end: istToUTC(2026, 2, 11, 5, 30),
      expectedDay: 0,
      expectedEvening: 60, // 21:00-22:00
      expectedNight: 450, // 22:00-05:30 = 7.5h = 450m
    },
  ]
  
  console.log("PERIOD CALCULATION TESTS:")
  console.log("-".repeat(70))
  
  for (const tc of testCases) {
    // Show the UTC times being tested
    const utcStart = tc.start.toISOString().slice(11, 16)
    const utcEnd = tc.end.toISOString().slice(11, 16)
    
    const result = calculatePeriodSplit(
      tc.start,
      tc.end,
      dayStartHour,
      dayEndHour,
      eveningEndHour,
      timezoneOffsetMins
    )
    
    const dayMatch = result.dayMins === tc.expectedDay
    const eveMatch = result.eveningMins === tc.expectedEvening
    const nightMatch = result.nightMins === tc.expectedNight
    const passed = dayMatch && eveMatch && nightMatch
    
    if (passed) {
      console.log(`✓ PASS: ${tc.name}`)
      console.log(`         UTC: ${utcStart}-${utcEnd}, day=${result.dayMins}m, eve=${result.eveningMins}m, night=${result.nightMins}m`)
    } else {
      console.log(`✗ FAIL: ${tc.name}`)
      console.log(`  UTC times: ${utcStart}-${utcEnd}`)
      console.log(`  Expected: day=${tc.expectedDay}m, eve=${tc.expectedEvening}m, night=${tc.expectedNight}m`)
      console.log(`  Got:      day=${result.dayMins}m, eve=${result.eveningMins}m, night=${result.nightMins}m`)
      allPassed = false
    }
  }
  
  console.log("")
  
  // Verify database entries
  console.log("DATABASE ENTRIES VERIFICATION:")
  console.log("-".repeat(70))
  const entries = await prisma.timeEntry.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, startTime: true, endTime: true }
  })
  
  for (const entry of entries) {
    // Convert UTC back to IST for display
    const localStart = new Date(entry.startTime.getTime() + 330 * 60 * 1000)
    const localEnd = new Date(entry.endTime.getTime() + 330 * 60 * 1000)
    const formatTime = (d: Date) => `${d.getUTCHours().toString().padStart(2,'0')}:${d.getUTCMinutes().toString().padStart(2,'0')}`
    
    console.log(`Entry: Stored UTC ${entry.startTime.toISOString().slice(11,16)} → Display IST ${formatTime(localStart)}-${formatTime(localEnd)}`)
  }
  
  console.log("")
  console.log("=".repeat(70))
  if (allPassed) {
    console.log("✅ ALL TESTS PASSED - Implementation is production-ready!")
  } else {
    console.log("❌ SOME TESTS FAILED - Review required before deployment")
  }
  console.log("=".repeat(70))
  
  return allPassed
}

verify()
  .then(passed => process.exit(passed ? 0 : 1))
  .catch(console.error)
  .finally(() => prisma.$disconnect())
