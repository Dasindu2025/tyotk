/**
 * Create 5 test time entries to verify UTC implementation
 * 
 * Test entries:
 * 1. Day only: 09:00-17:00 IST (8h day)
 * 2. Evening only: 18:00-22:00 IST (4h evening)
 * 3. Night only (early morning): 00:00-05:00 IST (5h night)
 * 4. Cross-midnight: 22:00-02:00 IST (4h night)
 * 5. Mixed periods: 17:00-23:00 IST (1h day + 4h evening + 1h night)
 */

import prisma from "../src/lib/prisma"

const TIMEZONE_OFFSET_MS = 330 * 60 * 1000 // 5:30 hours

// Convert local IST time to UTC (subtract 5:30 hours)
function localToUTC(year: number, month: number, day: number, hour: number, minute: number): Date {
  const localDate = new Date(year, month - 1, day, hour, minute, 0)
  return new Date(localDate.getTime() - TIMEZONE_OFFSET_MS)
}

async function createTestEntries() {
  console.log("Creating 5 test time entries to verify UTC implementation...\n")
  
  // Get the first employee user
  const employee = await prisma.user.findFirst({
    where: { role: "EMPLOYEE" },
    include: { workspace: true }
  })
  
  if (!employee) {
    console.error("No employee user found!")
    return
  }
  
  // Get a workplace
  const workplace = await prisma.workplace.findFirst({
    where: { workspaceId: employee.workspaceId }
  })
  
  if (!workplace) {
    console.error("No workplace found!")
    return
  }
  
  console.log(`Creating entries for employee: ${employee.email}`)
  console.log(`Workplace: ${workplace.name}\n`)
  
  // Today's date
  const today = new Date()
  const year = 2026
  const month = 2  // February
  const day = 10   // Use Feb 10 for test entries
  
  const testEntries = [
    {
      name: "Test 1: Day only (09:00-17:00 IST = 8h day)",
      startTime: localToUTC(year, month, day, 9, 0),
      endTime: localToUTC(year, month, day, 17, 0),
      entryDate: new Date(Date.UTC(year, month - 1, day)),
      durationMinutes: 480,
      expectedDay: 8, expectedEvening: 0, expectedNight: 0
    },
    {
      name: "Test 2: Evening only (18:00-22:00 IST = 4h evening)",
      startTime: localToUTC(year, month, day, 18, 0),
      endTime: localToUTC(year, month, day, 22, 0),
      entryDate: new Date(Date.UTC(year, month - 1, day)),
      durationMinutes: 240,
      expectedDay: 0, expectedEvening: 4, expectedNight: 0
    },
    {
      name: "Test 3: Early morning night (00:00-05:00 IST = 5h night)",
      startTime: localToUTC(year, month, day + 1, 0, 0),
      endTime: localToUTC(year, month, day + 1, 5, 0),
      entryDate: new Date(Date.UTC(year, month - 1, day + 1)),
      durationMinutes: 300,
      expectedDay: 0, expectedEvening: 0, expectedNight: 5
    },
    {
      name: "Test 4: Late night (22:00-02:00 IST = 4h night)",
      startTime: localToUTC(year, month, day, 22, 0),
      endTime: localToUTC(year, month, day + 1, 2, 0),
      entryDate: new Date(Date.UTC(year, month - 1, day)),
      durationMinutes: 240,
      expectedDay: 0, expectedEvening: 0, expectedNight: 4
    },
    {
      name: "Test 5: Mixed periods (17:00-23:00 IST = 1h day + 4h evening + 1h night)",
      startTime: localToUTC(year, month, day + 2, 17, 0),
      endTime: localToUTC(year, month, day + 2, 23, 0),
      entryDate: new Date(Date.UTC(year, month - 1, day + 2)),
      durationMinutes: 360,
      expectedDay: 1, expectedEvening: 4, expectedNight: 1
    },
  ]
  
  let created = 0
  
  for (const entry of testEntries) {
    try {
      const result = await prisma.timeEntry.create({
        data: {
          userId: employee.id,
          workplaceId: workplace.id,
          startTime: entry.startTime,
          endTime: entry.endTime,
          entryDate: entry.entryDate,
          durationMinutes: entry.durationMinutes,
          status: "APPROVED",
          isSplit: false,
        }
      })
      
      // Display the times for verification
      const localStart = new Date(entry.startTime.getTime() + TIMEZONE_OFFSET_MS)
      const localEnd = new Date(entry.endTime.getTime() + TIMEZONE_OFFSET_MS)
      const formatTime = (d: Date) => `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
      
      console.log(`✓ Created: ${entry.name}`)
      console.log(`  Stored UTC: ${entry.startTime.toISOString()} - ${entry.endTime.toISOString()}`)
      console.log(`  Display IST: ${formatTime(localStart)} - ${formatTime(localEnd)}`)
      console.log(`  Expected: Day ${entry.expectedDay}h, Evening ${entry.expectedEvening}h, Night ${entry.expectedNight}h`)
      console.log("")
      
      created++
    } catch (error: any) {
      console.error(`✗ Failed to create: ${entry.name}`)
      console.error(`  Error: ${error.message}\n`)
    }
  }
  
  console.log("=".repeat(60))
  console.log(`Created ${created}/5 test entries`)
  console.log("")
  console.log("Please check the employee dashboard to verify:")
  console.log("1. Times display correctly in local IST")
  console.log("2. Evening hours should increase by 8h (4h + 4h from mixed)")
  console.log("3. Night hours should increase by 10h (5h + 4h + 1h)")
  console.log("=".repeat(60))
}

createTestEntries()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
