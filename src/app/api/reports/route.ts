import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { startOfDay, endOfDay, parseISO, format } from "date-fns"
import { calculatePeriodSplit } from "@/lib/services/time-entry"

// GET - Get reports data for date range
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admin roles can view reports
    if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Build date filter
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = startOfDay(parseISO(startDate))
    }
    if (endDate) {
      dateFilter.lte = endOfDay(parseISO(endDate))
    }

    // Get all APPROVED time entries for the workspace within date range
    const entries = await prisma.timeEntry.findMany({
      where: {
        user: {
          workspaceId: session.user.workspaceId
        },
        status: "APPROVED", // Only count approved entries
        ...(Object.keys(dateFilter).length > 0 ? { entryDate: dateFilter } : {})
      },
      include: {
        user: {
          include: { profile: true }
        },
        project: true,
        workplace: true
      },
      orderBy: [{ entryDate: "desc" }, { startTime: "desc" }]
    })

    // Get workspace settings for day/evening/night calculation
    const workspace = await prisma.workspace.findUnique({
      where: { id: session.user.workspaceId }
    }) as { dayStartHour?: number; dayEndHour?: number; eveningEndHour?: number } | null

    const dayStartHour = workspace?.dayStartHour ?? 6
    const dayEndHour = workspace?.dayEndHour ?? 18
    const eveningEndHour = workspace?.eveningEndHour ?? 22

    // Transform entries with hour type calculations
    const data = entries.map(entry => {
      const totalMinutes = entry.durationMinutes
      
      // Calculate day/evening/night split based on actual time ranges using shared utility
      const startTime = new Date(entry.startTime)
      const endTime = new Date(entry.endTime)
      const split = calculatePeriodSplit(startTime, endTime, dayStartHour, dayEndHour, eveningEndHour)
      
      const dayMinutes = split.dayMins
      const eveningMinutes = split.eveningMins
      const nightMinutes = split.nightMins

      // Format times using UTC methods to get exact time values
      const formatTimeLocal = (date: Date) => {
        const hours = date.getUTCHours().toString().padStart(2, '0')
        const minutes = date.getUTCMinutes().toString().padStart(2, '0')
        return `${hours}:${minutes}`
      }

      return {
        id: entry.id,
        date: format(new Date(entry.entryDate), "yyyy-MM-dd"),
        entryDate: format(new Date(entry.entryDate), "yyyy-MM-dd"),
        startTime: entry.startTime,
        endTime: entry.endTime,
        timeIn: formatTimeLocal(new Date(entry.startTime)),
        timeOut: formatTimeLocal(new Date(entry.endTime)),
        durationMinutes: totalMinutes,
        totalHours: (totalMinutes / 60).toFixed(1),
        dayHours: (dayMinutes / 60).toFixed(1),
        eveningHours: (eveningMinutes / 60).toFixed(1),
        nightHours: (nightMinutes / 60).toFixed(1),
        status: entry.status,
        project: entry.project ? {
          id: entry.project.id,
          name: entry.project.name,
          projectCode: entry.project.projectCode
        } : null,
        workplace: entry.workplace ? {
          id: entry.workplace.id,
          name: entry.workplace.name
        } : null,
        employee: {
          id: entry.user.id,
          employeeCode: entry.user.profile?.employeeCode || "",
          firstName: entry.user.profile?.firstName || "",
          lastName: entry.user.profile?.lastName || "",
          fullName: `${entry.user.profile?.firstName || ""} ${entry.user.profile?.lastName || ""}`.trim()
        }
      }
    })

    // Calculate summary stats
    const totalMinutes = data.reduce((sum, e) => sum + e.durationMinutes, 0)
    const approvedMinutes = data.filter(e => e.status === "APPROVED").reduce((sum, e) => sum + e.durationMinutes, 0)
    const pendingCount = data.filter(e => e.status === "PENDING").length
    const uniqueEmployees = new Set(data.map(e => e.employee.id)).size

    // Group by employee
    const employeeSummary = Object.values(
      data.reduce((acc: any, entry) => {
        const empId = entry.employee.id
        if (!acc[empId]) {
          acc[empId] = {
            ...entry.employee,
            totalMinutes: 0,
            approvedMinutes: 0,
            pendingCount: 0,
            dayMinutes: 0,
            eveningMinutes: 0,
            nightMinutes: 0
          }
        }
        acc[empId].totalMinutes += entry.durationMinutes
        acc[empId].dayMinutes += parseFloat(entry.dayHours) * 60
        acc[empId].eveningMinutes += parseFloat(entry.eveningHours) * 60
        acc[empId].nightMinutes += parseFloat(entry.nightHours) * 60
        if (entry.status === "APPROVED") {
          acc[empId].approvedMinutes += entry.durationMinutes
        }
        if (entry.status === "PENDING") {
          acc[empId].pendingCount++
        }
        return acc
      }, {})
    )

    return NextResponse.json({
      entries: data,
      summary: {
        totalHours: (totalMinutes / 60).toFixed(1),
        approvedHours: (approvedMinutes / 60).toFixed(1),
        totalEntries: data.length,
        pendingEntries: pendingCount,
        activeEmployees: uniqueEmployees
      },
      employeeSummary
    })
  } catch (error) {
    console.error("[Reports API] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch report data" },
      { status: 500 }
    )
  }
}
