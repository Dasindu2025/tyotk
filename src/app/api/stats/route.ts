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
    
    // Get workspace settings for day/evening/night hour boundaries
    const workspace = await prisma.workspace.findUnique({
      where: { id: session.user.workspaceId },
    }) as { dayStartHour?: number; dayEndHour?: number; eveningEndHour?: number } | null

    const dayStartHour = workspace?.dayStartHour ?? 6     // Default 6 AM
    const dayEndHour = workspace?.dayEndHour ?? 18        // Default 6 PM (evening starts)
    const eveningEndHour = workspace?.eveningEndHour ?? 22 // Default 10 PM (night starts)

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
    let eveningMinutes = 0
    let nightMinutes = 0

    for (const entry of monthEntries) {
      const entryDate = new Date(entry.entryDate)
      
      // Month total
      monthMinutes += entry.durationMinutes

      // Week total (if entry is in current week)
      if (entryDate >= weekStart && entryDate <= weekEnd) {
        weekMinutes += entry.durationMinutes
      }

      // Calculate day/evening/night split for each entry
      const startHour = new Date(entry.startTime).getHours()
      const durationMins = entry.durationMinutes

      // Determine which period the entry belongs to based on start hour
      // Day: dayStartHour to dayEndHour (e.g., 6-18)
      // Evening: dayEndHour to eveningEndHour (e.g., 18-22)
      // Night: eveningEndHour to dayStartHour (e.g., 22-6)
      
      if (startHour >= dayStartHour && startHour < dayEndHour) {
        // Day period
        dayMinutes += durationMins
      } else if (startHour >= dayEndHour && startHour < eveningEndHour) {
        // Evening period
        eveningMinutes += durationMins
      } else {
        // Night period (either late night or early morning)
        nightMinutes += durationMins
      }
    }

    // Convert to hours
    const stats = {
      weekHours: Math.round((weekMinutes / 60) * 10) / 10,
      monthHours: Math.round((monthMinutes / 60) * 10) / 10,
      dayHours: Math.round((dayMinutes / 60) * 10) / 10,
      eveningHours: Math.round((eveningMinutes / 60) * 10) / 10,
      nightHours: Math.round((nightMinutes / 60) * 10) / 10,
      weekMinutes,
      monthMinutes,
      dayMinutes,
      eveningMinutes,
      nightMinutes,
      dayStartHour,
      dayEndHour,
      eveningEndHour,
    }

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    )
  }
}
