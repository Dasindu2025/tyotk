import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"

// GET - Get employee statistics
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const now = new Date()
    
    // Get workspace settings for day/night hour boundaries
    // Using type assertion since Prisma client may not be regenerated yet
    const workspace = await prisma.workspace.findUnique({
      where: { id: session.user.workspaceId },
    }) as { dayStartHour?: number; dayEndHour?: number } | null

    const dayStartHour = workspace?.dayStartHour ?? 6  // Default 6 AM
    const dayEndHour = workspace?.dayEndHour ?? 18     // Default 6 PM

    // Date ranges
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    // Get all entries for this month (includes week entries)
    const monthEntries = await prisma.timeEntry.findMany({
      where: {
        userId,
        entryDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      select: {
        startTime: true,
        endTime: true,
        durationMinutes: true,
        entryDate: true,
      },
    })

    // Calculate stats
    let weekMinutes = 0
    let monthMinutes = 0
    let dayMinutes = 0
    let nightMinutes = 0

    for (const entry of monthEntries) {
      const entryDate = new Date(entry.entryDate)
      
      // Month total
      monthMinutes += entry.durationMinutes

      // Week total (if entry is in current week)
      if (entryDate >= weekStart && entryDate <= weekEnd) {
        weekMinutes += entry.durationMinutes
      }

      // Calculate day/night split for each entry
      const startHour = new Date(entry.startTime).getHours()
      const endHour = new Date(entry.endTime).getHours()
      const durationMins = entry.durationMinutes

      // Simplified calculation: determine if entry is primarily day or night
      if (startHour >= dayStartHour && endHour <= dayEndHour) {
        // Entirely during day shift
        dayMinutes += durationMins
      } else if (startHour >= dayEndHour || endHour <= dayStartHour) {
        // Entirely during night shift
        nightMinutes += durationMins
      } else {
        // Entry spans both day and night - proportional split
        const entryMidpoint = (startHour + endHour) / 2
        if (entryMidpoint >= dayStartHour && entryMidpoint < dayEndHour) {
          // Mostly day
          dayMinutes += Math.round(durationMins * 0.7)
          nightMinutes += Math.round(durationMins * 0.3)
        } else {
          // Mostly night
          nightMinutes += Math.round(durationMins * 0.7)
          dayMinutes += Math.round(durationMins * 0.3)
        }
      }
    }

    // Convert to hours
    const stats = {
      weekHours: Math.round((weekMinutes / 60) * 10) / 10,
      monthHours: Math.round((monthMinutes / 60) * 10) / 10,
      dayHours: Math.round((dayMinutes / 60) * 10) / 10,
      nightHours: Math.round((nightMinutes / 60) * 10) / 10,
      weekMinutes,
      monthMinutes,
      dayMinutes,
      nightMinutes,
      dayStartHour,
      dayEndHour,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    )
  }
}
