import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { startOfWeek, endOfWeek, format, startOfDay, endOfDay } from "date-fns"
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

    console.log("[Stats API] Query parameters received:", { queryStartDate, queryEndDate })

    // Use UTC dates to match database DATE column storage
    // This prevents timezone issues at month boundaries
    let monthStartUTC: Date
    let monthEndUTC: Date

    if (queryStartDate && queryEndDate) {
      // Parse as UTC midnight to match database DATE storage
      monthStartUTC = new Date(queryStartDate + "T00:00:00.000Z")
      monthEndUTC = new Date(queryEndDate + "T23:59:59.999Z")
    } else {
      // Default to current month in UTC
      const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      monthStartUTC = new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), 1, 0, 0, 0, 0))
      const lastDayOfMonth = new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth() + 1, 0))
      monthEndUTC = new Date(Date.UTC(lastDayOfMonth.getUTCFullYear(), lastDayOfMonth.getUTCMonth(), lastDayOfMonth.getUTCDate(), 23, 59, 59, 999))
    }

    console.log("[Stats API] Date range (UTC):", { 
      monthStartUTC: monthStartUTC.toISOString(), 
      monthEndUTC: monthEndUTC.toISOString() 
    })

    // Determine the week range (Sunday-Saturday to match calendar display)
    let weekStartLocal: Date
    let weekEndLocal: Date

    const isCurrentMonth = now >= monthStartUTC && now <= monthEndUTC

    if (isCurrentMonth) {
      weekStartLocal = startOfDay(startOfWeek(now, { weekStartsOn: 0 })) // Sunday
      weekEndLocal = endOfDay(endOfWeek(now, { weekStartsOn: 0 }))
    } else {
      // For other months, "This week" shows stats for the first full week of that month
      weekStartLocal = startOfDay(startOfWeek(monthStartUTC, { weekStartsOn: 0 }))
      weekEndLocal = endOfDay(endOfWeek(monthStartUTC, { weekStartsOn: 0 }))
    }
    
    // Format dates as YYYY-MM-DD for string comparison
    const weekStartStr = format(weekStartLocal, "yyyy-MM-dd")
    const weekEndStr = format(weekEndLocal, "yyyy-MM-dd")

    // Get workspace settings
    const workspace = await prisma.workspace.findUnique({
      where: { id: session.user.workspaceId },
    })
    
    const dayStartHour = workspace?.dayStartHour ?? 6
    const dayEndHour = workspace?.dayEndHour ?? 18
    const eveningEndHour = workspace?.eveningEndHour ?? 22

    // Timezone offset for period calculations
    // NOTE: Entries are now stored in UTC. To calculate day/evening/night periods,
    // we need to convert UTC to local IST time. IST = UTC+5:30 = +330 minutes
    const timezoneOffsetMins = 330

    // Build where clause matching time-entries API behavior:
    // - Employees see only their own entries
    // - Admins see all workspace entries (same as calendar view)
    const entryWhereClause: Record<string, unknown> = {
      status: "APPROVED",
      entryDate: {
        gte: monthStartUTC,
        lte: monthEndUTC,
      },
    }

    if (session.user.role === "EMPLOYEE") {
      entryWhereClause.userId = userId
    } else {
      // Admins see stats for all workspace users (matching calendar view)
      entryWhereClause.user = { workspaceId: session.user.workspaceId }
    }

    // Get approved entries for the requested month
    const monthEntries = await prisma.timeEntry.findMany({
      where: entryWhereClause,
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

      const startDate = new Date(entry.startTime)
      const endDate = new Date(entry.endTime)
      
      const split = calculatePeriodSplit(
        startDate, 
        endDate, 
        dayStartHour, 
        dayEndHour, 
        eveningEndHour,
        timezoneOffsetMins
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
