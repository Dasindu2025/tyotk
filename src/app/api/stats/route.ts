import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, startOfDay, endOfDay, parseISO } from "date-fns"
import { calculatePeriodSplit } from "@/lib/services/time-entry"

// GET - Get employee statistics
export async function GET(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const now = new Date()

    // Date ranges from query parameters or default to current month
    const { searchParams } = new URL(request.url)
    const queryStartDate = searchParams.get("startDate")
    const queryEndDate = searchParams.get("endDate")

    let monthStartLocal: Date
    let monthEndLocal: Date

    if (queryStartDate && queryEndDate) {
      monthStartLocal = startOfDay(parseISO(queryStartDate))
      monthEndLocal = endOfDay(parseISO(queryEndDate))
    } else {
      monthStartLocal = startOfDay(startOfMonth(now))
      monthEndLocal = endOfDay(endOfMonth(now))
    }

    // Determine the week range
    let weekStartLocal: Date
    let weekEndLocal: Date

    const isCurrentMonth = now >= monthStartLocal && now <= monthEndLocal

    if (isCurrentMonth) {
      weekStartLocal = startOfDay(startOfWeek(now, { weekStartsOn: 1 })) // Monday
      weekEndLocal = endOfDay(endOfWeek(now, { weekStartsOn: 1 }))
    } else {
      // For other months, "This week" shows stats for the first full week of that month
      weekStartLocal = startOfDay(startOfWeek(monthStartLocal, { weekStartsOn: 1 }))
      weekEndLocal = endOfDay(endOfWeek(monthStartLocal, { weekStartsOn: 1 }))
    }
    
    // Format dates as YYYY-MM-DD for string comparison
    const weekStartStr = format(weekStartLocal, "yyyy-MM-dd")
    const weekEndStr = format(weekEndLocal, "yyyy-MM-dd")
    const monthStartStr = format(monthStartLocal, "yyyy-MM-dd")
    const monthEndStr = format(monthEndLocal, "yyyy-MM-dd")

    // Get workspace settings
    const workspace = await prisma.workspace.findUnique({
      where: { id: session.user.workspaceId },
    })
    
    const dayStartHour = workspace?.dayStartHour ?? 6
    const dayEndHour = workspace?.dayEndHour ?? 18
    const eveningEndHour = workspace?.eveningEndHour ?? 22

    // Get approved entries for the requested month directly from database (optimized)
    const monthEntries = await prisma.timeEntry.findMany({
      where: {
        userId,
        status: "APPROVED",
        entryDate: {
          gte: monthStartLocal,
          lte: monthEndLocal,
        },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        durationMinutes: true,
        entryDate: true,
      },
    })

    let weekMinutes = 0
    let monthMinutes = 0
    let dayTotal = 0
    let eveTotal = 0
    let nightTotal = 0

    for (const entry of monthEntries) {
      const entryDateStr = format(entry.entryDate, "yyyy-MM-dd")
      monthMinutes += entry.durationMinutes

      if (entryDateStr >= weekStartStr && entryDateStr <= weekEndStr) {
        weekMinutes += entry.durationMinutes
      }

      const split = calculatePeriodSplit(
        new Date(entry.startTime), 
        new Date(entry.endTime), 
        dayStartHour, 
        dayEndHour, 
        eveningEndHour
      )
      
      dayTotal += split.dayMins
      eveTotal += split.eveningMins
      nightTotal += split.nightMins
    }

    const stats = {
      weekHours: Math.round((weekMinutes / 60) * 10) / 10,
      monthHours: Math.round((monthMinutes / 60) * 10) / 10,
      dayHours: Math.round((dayTotal / 60) * 10) / 10,
      eveningHours: Math.round((eveTotal / 60) * 10) / 10,
      nightHours: Math.round((nightTotal / 60) * 10) / 10,
      weekMinutes,
      monthMinutes,
      dayMinutes: dayTotal,
      eveningMinutes: eveTotal,
      nightMinutes: nightTotal,
    }

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error) {
    console.error("[Stats API] ERROR:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
