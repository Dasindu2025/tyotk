/**
 * Data Migration: Convert existing time entries from "local-as-UTC" to proper UTC
 * 
 * Problem:
 * - Old code stored 09:00 IST as 09:00 UTC (wrong!)
 * - New code stores 09:00 IST as 03:30 UTC (correct)
 * 
 * This script adjusts existing entries by subtracting 5:30 hours (330 minutes)
 * from startTime and endTime to convert them to proper UTC.
 * 
 * Run with: npx tsx scripts/migrate-times-to-utc.ts
 */

import prisma from "../src/lib/prisma"

const TIMEZONE_OFFSET_MS = 330 * 60 * 1000 // 5:30 hours in milliseconds

async function migrateTimesToUTC() {
  console.log("Starting time entry migration to proper UTC...")
  console.log("IST offset: -5:30 hours (subtracting 330 minutes)")
  console.log("")
  
  // Get all time entries
  const entries = await prisma.timeEntry.findMany({
    select: {
      id: true,
      startTime: true,
      endTime: true,
      entryDate: true,
    }
  })
  
  console.log(`Found ${entries.length} entries to migrate`)
  console.log("")
  
  let successCount = 0
  let errorCount = 0
  
  for (const entry of entries) {
    try {
      // Convert from "local-as-UTC" to proper UTC by subtracting offset
      // Old: 09:00 UTC (which was meant to be 09:00 IST)
      // New: 03:30 UTC (correct UTC for 09:00 IST)
      const newStartTime = new Date(entry.startTime.getTime() - TIMEZONE_OFFSET_MS)
      const newEndTime = new Date(entry.endTime.getTime() - TIMEZONE_OFFSET_MS)
      
      // Debug output for first few entries
      if (successCount < 3) {
        console.log(`Entry ${entry.id}:`)
        console.log(`  Old: ${entry.startTime.toISOString()} - ${entry.endTime.toISOString()}`)
        console.log(`  New: ${newStartTime.toISOString()} - ${newEndTime.toISOString()}`)
        console.log("")
      }
      
      await prisma.timeEntry.update({
        where: { id: entry.id },
        data: {
          startTime: newStartTime,
          endTime: newEndTime,
        }
      })
      
      successCount++
    } catch (error) {
      console.error(`Error migrating entry ${entry.id}:`, error)
      errorCount++
    }
  }
  
  console.log("")
  console.log("=== Migration Complete ===")
  console.log(`Success: ${successCount}`)
  console.log(`Errors: ${errorCount}`)
}

migrateTimesToUTC()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
