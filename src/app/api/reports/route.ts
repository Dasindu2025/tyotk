import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { startOfDay, endOfDay, parseISO, format } from "date-fns"

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

    // Get all time entries for the workspace within date range
    const entries = await prisma.timeEntry.findMany({
      where: {
        user: {
          workspaceId: session.user.workspaceId
        },
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

    // Get workspace settings for day/night calculation
    const workspace = await prisma.workspace.findUnique({
      where: { id: session.user.workspaceId }
    }) as { dayStartHour?: number; dayEndHour?: number } | null

    const dayStartHour = workspace?.dayStartHour ?? 6
    const dayEndHour = workspace?.dayEndHour ?? 18

    // Transform entries with hour type calculations
    const data = entries.map(entry => {
      const startHour = new Date(entry.startTime).getHours()
      const endHour = new Date(entry.endTime).getHours()
      const totalMinutes = entry.durationMinutes

      // Simple calculation for day/evening/night hours
      // Day: dayStartHour to dayEndHour (default 6-18)
      // Evening: dayEndHour to 22 (default 18-22)  
      // Night: 22 to dayStartHour (default 22-6)
      let dayMinutes = 0
      let eveningMinutes = 0
      let nightMinutes = 0

      // Simplified: assign based on start hour
      if (startHour >= dayStartHour && startHour < dayEndHour) {
        dayMinutes = totalMinutes
      } else if (startHour >= dayEndHour && startHour < 22) {
        eveningMinutes = totalMinutes
      } else {
        nightMinutes = totalMinutes
      }

      return {
        id: entry.id,
        date: format(new Date(entry.entryDate), "yyyy-MM-dd"),
        entryDate: format(new Date(entry.entryDate), "yyyy-MM-dd"),
        startTime: entry.startTime,
        endTime: entry.endTime,
        timeIn: format(new Date(entry.startTime), "HH:mm"),
        timeOut: format(new Date(entry.endTime), "HH:mm"),
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
