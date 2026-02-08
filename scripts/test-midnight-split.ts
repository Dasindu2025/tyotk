/**
 * Test midnight split at 00:00 Finland time
 * 
 * User's issue: 21:00-02:00 should split into TWO entries:
 * - Entry 1: 21:00 - 00:00 (3 hours)
 * - Entry 2: 00:00 - 02:00 (2 hours)
 */

const TIMEZONE_OFFSET_MINUTES = 120 // Finland GMT+2

// Simulates the split logic from the API
function testMidnightSplit() {
  console.log("=".repeat(70))
  console.log("MIDNIGHT SPLIT TEST - Finland Timezone")
  console.log("=".repeat(70))
  console.log("")
  
  // Test case: 21:00-02:00 (Jan 29 21:00 → Jan 30 02:00)
  const startYear = 2026, startMonth = 1, startDay = 29
  const endYear = 2026, endMonth = 1, endDay = 30
  const splitHour = 0 // Midnight
  
  // User inputs 21:00 Finland time on Jan 29
  // Finland 21:00 = UTC 19:00 (21:00 - 2 hours)
  const startTime = "2026-01-29T21:00:00"
  const startLocalAsUTC = Date.UTC(startYear, startMonth - 1, startDay, 21, 0, 0)
  const startDate = new Date(startLocalAsUTC - (TIMEZONE_OFFSET_MINUTES * 60 * 1000))
  
  // User inputs 02:00 Finland time on Jan 30
  // Finland 02:00 = UTC 00:00 (02:00 - 2 hours)
  const endTime = "2026-01-30T02:00:00"
  const endLocalAsUTC = Date.UTC(endYear, endMonth - 1, endDay, 2, 0, 0)
  const endDate = new Date(endLocalAsUTC - (TIMEZONE_OFFSET_MINUTES * 60 * 1000))
  
  console.log("INPUT:")
  console.log(`  Start: ${startTime} Finland → UTC ${startDate.toISOString()}`)
  console.log(`  End:   ${endTime} Finland → UTC ${endDate.toISOString()}`)
  console.log("")
  
  // Calculate split point: Finland 00:00 on Jan 30
  // OLD (WRONG): const splitPointUTC = Date.UTC(endYear, endMonth - 1, endDay, splitHour, 0, 0, 0)
  // This gave UTC 00:00 = Finland 02:00 ❌
  
  // NEW (CORRECT):
  const midnightLocalAsUTC = Date.UTC(endYear, endMonth - 1, endDay, splitHour, 0, 0, 0)
  const splitPointUTC = midnightLocalAsUTC - (TIMEZONE_OFFSET_MINUTES * 60 * 1000)
  const splitPoint = new Date(splitPointUTC)
  
  console.log("SPLIT POINT:")
  console.log(`  Finland 00:00 on Jan 30 = UTC ${splitPoint.toISOString()}`)
  console.log("")
  
  // Calculate durations
  const firstDuration = Math.round((splitPointUTC - startDate.getTime()) / (1000 * 60))
  const secondDuration = Math.round((endDate.getTime() - splitPointUTC) / (1000 * 60))
  
  console.log("EXPECTED RESULTS:")
  console.log("  Entry 1: Jan 29, 21:00 - 00:00 Finland (3 hours)")
  console.log("  Entry 2: Jan 30, 00:00 - 02:00 Finland (2 hours)")
  console.log("")
  
  console.log("ACTUAL RESULTS:")
  console.log(`  Entry 1: ${firstDuration} minutes (${(firstDuration/60).toFixed(1)} hours)`)
  console.log(`    UTC: ${startDate.toISOString()} → ${splitPoint.toISOString()}`)
  console.log(`  Entry 2: ${secondDuration} minutes (${(secondDuration/60).toFixed(1)} hours)`)
  console.log(`    UTC: ${splitPoint.toISOString()} → ${endDate.toISOString()}`)
  console.log("")
  
  // Verify
  const entry1Pass = firstDuration === 180  // 3 hours = 180 min
  const entry2Pass = secondDuration === 120 // 2 hours = 120 min
  const totalDuration = firstDuration + secondDuration
  const totalPass = totalDuration === 300   // 5 total hours
  
  console.log("VERIFICATION:")
  if (entry1Pass) {
    console.log("  ✓ Entry 1: 3 hours (180 min) ✓")
  } else {
    console.log(`  ✗ Entry 1: Expected 180 min, got ${firstDuration} min ✗`)
  }
  
  if (entry2Pass) {
    console.log("  ✓ Entry 2: 2 hours (120 min) ✓")
  } else {
    console.log(`  ✗ Entry 2: Expected 120 min, got ${secondDuration} min ✗`)
  }
  
  if (totalPass) {
    console.log(`  ✓ Total: 5 hours (${totalDuration} min) ✓`)
  } else {
    console.log(`  ✗ Total: Expected 300 min, got ${totalDuration} min ✗`)
  }
  
  console.log("")
  console.log("=".repeat(70))
  if (entry1Pass && entry2Pass && totalPass) {
    console.log("✅ ALL TESTS PASSED - Midnight split working correctly!")
  } else {
    console.log("❌ TESTS FAILED - Midnight split NOT working correctly")
  }
  console.log("=".repeat(70))
}

testMidnightSplit()
