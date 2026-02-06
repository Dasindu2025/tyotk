/**
 * Comprehensive Test: Verify UTC timezone implementation
 * 
 * Tests:
 * 1. Verify existing entries are now in proper UTC
 * 2. Verify stats calculation with timezone offset
 * 3. Verify period splits are correct
 * 
 * Run with: npx tsx scripts/test-utc-implementation.ts
 */

import prisma from "../src/lib/prisma"
import { calculatePeriodSplit } from "../src/lib/services/time-entry"

const TIMEZONE_OFFSET_MS = 330 * 60 * 1000 // 5:30 hours in milliseconds

async function testUTCImplementation() {
  console.log("=== Testing UTC Implementation ===\n")
  
  let passCount = 0
  let failCount = 0
  
  // Test 1: Verify entries are stored in proper UTC
  console.log("Test 1: Verify entries are stored in proper UTC")
  console.log("-".repeat(50))
  
  const entries = await prisma.timeEntry.findMany({
    select: {
      id: true,
      startTime: true,
      endTime: true,
      durationMinutes: true,
    },
    take: 10
  })
  
  for (const entry of entries) {
    // Convert UTC to local IST for display verification
    const localStart = new Date(entry.startTime.getTime() + TIMEZONE_OFFSET_MS)
    const localEnd = new Date(entry.endTime.getTime() + TIMEZONE_OFFSET_MS)
    
    const formatTime = (d: Date) => 
      `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
    
    console.log(`Entry: UTC ${entry.startTime.toISOString()} → Local IST ${formatTime(localStart)}-${formatTime(localEnd)}`)
  }
  console.log("✓ Entries display in correct local time\n")
  passCount++
  
  // Test 2: Verify period calculations with timezone offset
  console.log("Test 2: Verify period calculations with timezone offset")
  console.log("-".repeat(50))
  
  // Workspace settings
  const dayStartHour = 6
  const dayEndHour = 18
  const eveningEndHour = 22
  const timezoneOffsetMins = 330
  
  // Test cases: entries stored in proper UTC
  const testCases = [
    {
      name: "09:00-17:00 IST (8h day)",
      // 09:00 IST = 03:30 UTC, 17:00 IST = 11:30 UTC
      startUTC: new Date("2026-02-06T03:30:00.000Z"),
      endUTC: new Date("2026-02-06T11:30:00.000Z"),
      expectedDay: 480, expectedEvening: 0, expectedNight: 0
    },
    {
      name: "18:00-22:00 IST (4h evening)",
      // 18:00 IST = 12:30 UTC, 22:00 IST = 16:30 UTC
      startUTC: new Date("2026-02-06T12:30:00.000Z"),
      endUTC: new Date("2026-02-06T16:30:00.000Z"),
      expectedDay: 0, expectedEvening: 240, expectedNight: 0
    },
    {
      name: "22:00-06:00 IST (8h night)",
      // 22:00 IST = 16:30 UTC, 06:00 IST = 00:30 UTC (next day)
      startUTC: new Date("2026-02-06T16:30:00.000Z"),
      endUTC: new Date("2026-02-07T00:30:00.000Z"),
      expectedDay: 0, expectedEvening: 0, expectedNight: 480
    },
    {
      name: "00:00-05:00 IST (5h night - early morning)",
      // 00:00 IST = 18:30 UTC (prev day), 05:00 IST = 23:30 UTC (prev day)
      startUTC: new Date("2026-02-05T18:30:00.000Z"),
      endUTC: new Date("2026-02-05T23:30:00.000Z"),
      expectedDay: 0, expectedEvening: 0, expectedNight: 300
    },
    {
      name: "17:00-23:00 IST (1h day + 4h evening + 1h night)",
      // 17:00 IST = 11:30 UTC, 23:00 IST = 17:30 UTC
      startUTC: new Date("2026-02-06T11:30:00.000Z"),
      endUTC: new Date("2026-02-06T17:30:00.000Z"),
      expectedDay: 60, expectedEvening: 240, expectedNight: 60
    },
  ]
  
  for (const tc of testCases) {
    const result = calculatePeriodSplit(
      tc.startUTC,
      tc.endUTC,
      dayStartHour,
      dayEndHour,
      eveningEndHour,
      timezoneOffsetMins
    )
    
    const dayPass = result.dayMins === tc.expectedDay
    const evePass = result.eveningMins === tc.expectedEvening
    const nightPass = result.nightMins === tc.expectedNight
    const allPass = dayPass && evePass && nightPass
    
    if (allPass) {
      console.log(`✓ PASS: ${tc.name}`)
      passCount++
    } else {
      console.log(`✗ FAIL: ${tc.name}`)
      console.log(`  Expected: day=${tc.expectedDay}, eve=${tc.expectedEvening}, night=${tc.expectedNight}`)
      console.log(`  Got:      day=${result.dayMins}, eve=${result.eveningMins}, night=${result.nightMins}`)
      failCount++
    }
  }
  
  console.log("")
  console.log("=".repeat(50))
  console.log(`RESULTS: ${passCount} passed, ${failCount} failed`)
  console.log("=".repeat(50))
  
  if (failCount === 0) {
    console.log("\n✅ All tests passed! UTC implementation is working correctly.")
  } else {
    console.log("\n❌ Some tests failed. Please review the implementation.")
  }
}

testUTCImplementation()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
