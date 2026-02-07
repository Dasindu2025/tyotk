/**
 * Test the time display fix
 * Verifies that times are displayed correctly without double conversion
 */

import prisma from "../src/lib/prisma"

const TIMEZONE_OFFSET_MINS = 330

// Same function as in the API
const formatUTCToLocalTimeString = (utcDate: Date): string => {
  const utcMins = utcDate.getUTCHours() * 60 + utcDate.getUTCMinutes()
  let localMins = utcMins + TIMEZONE_OFFSET_MINS
  if (localMins >= 24 * 60) localMins -= 24 * 60
  if (localMins < 0) localMins += 24 * 60
  
  const hours = Math.floor(localMins / 60)
  const mins = localMins % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

async function testTimeDisplay() {
  console.log("=".repeat(60))
  console.log("TESTING TIME DISPLAY FIX")
  console.log("=".repeat(60))
  console.log("")
  
  // Test cases: UTC times that should display as specific IST times
  const testCases = [
    // UTC 20:30 should display as 02:00 IST (next day)
    { utc: new Date("2026-02-07T20:30:00.000Z"), expectedIST: "02:00" },
    // UTC 14:30 should display as 20:00 IST
    { utc: new Date("2026-02-07T14:30:00.000Z"), expectedIST: "20:00" },
    // UTC 03:30 should display as 09:00 IST
    { utc: new Date("2026-02-07T03:30:00.000Z"), expectedIST: "09:00" },
    // UTC 11:30 should display as 17:00 IST
    { utc: new Date("2026-02-07T11:30:00.000Z"), expectedIST: "17:00" },
    // UTC 16:30 should display as 22:00 IST
    { utc: new Date("2026-02-07T16:30:00.000Z"), expectedIST: "22:00" },
    // UTC 18:30 should display as 00:00 IST (midnight)
    { utc: new Date("2026-02-07T18:30:00.000Z"), expectedIST: "00:00" },
  ]
  
  let allPass = true
  
  console.log("FORMAT FUNCTION TESTS:")
  console.log("-".repeat(60))
  
  for (const tc of testCases) {
    const result = formatUTCToLocalTimeString(tc.utc)
    const pass = result === tc.expectedIST
    
    if (pass) {
      console.log(`✓ PASS: UTC ${tc.utc.toISOString().slice(11,16)} → IST ${result}`)
    } else {
      console.log(`✗ FAIL: UTC ${tc.utc.toISOString().slice(11,16)} → expected ${tc.expectedIST}, got ${result}`)
      allPass = false
    }
  }
  
  console.log("")
  
  // Test with actual database entries
  console.log("DATABASE ENTRIES:")
  console.log("-".repeat(60))
  
  const entries = await prisma.timeEntry.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      startTime: true,
      endTime: true,
      durationMinutes: true,
    }
  })
  
  for (const entry of entries) {
    const startIST = formatUTCToLocalTimeString(entry.startTime)
    const endIST = formatUTCToLocalTimeString(entry.endTime)
    const durationHours = (entry.durationMinutes / 60).toFixed(1)
    
    console.log(`Entry: ${startIST} - ${endIST} (${durationHours}h)`)
    console.log(`  Raw UTC: ${entry.startTime.toISOString().slice(11,16)} - ${entry.endTime.toISOString().slice(11,16)}`)
  }
  
  console.log("")
  console.log("=".repeat(60))
  if (allPass) {
    console.log("✅ ALL FORMAT TESTS PASSED")
  } else {
    console.log("❌ SOME TESTS FAILED")
  }
  console.log("=".repeat(60))
}

testTimeDisplay()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
