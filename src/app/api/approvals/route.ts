import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { format } from "date-fns"
import { emitRealtimeEvent } from "@/lib/services/realtime"

// Validation schemas
const approvalActionSchema = z.object({
  entryIds: z.array(z.string()).min(1, "At least one entry ID required"),
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().optional(),
})

// GET - List pending entries for approval
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admin roles can access approvals
    if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "PENDING"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    // Get the manager's workspace and organization
    const managerWorkspace = await prisma.workspace.findUnique({
      where: { id: session.user.workspaceId },
      include: { organization: true },
    })

    if (!managerWorkspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    // Get all workspace IDs in the same organization
    // This allows managers to see entries from employees in any workspace within their organization
    const organizationWorkspaces = await prisma.workspace.findMany({
      where: {
        organizationId: managerWorkspace.organizationId,
        isActive: true,
      },
      select: { id: true },
    })

    const workspaceIds = organizationWorkspaces.map(w => w.id)

    // Query entries from all workspaces in the same organization
    const where: any = {
      user: {
        workspaceId: {
          in: workspaceIds,
        },
      },
    }

    if (status && status !== "ALL") {
      where.status = status
    }

    const [entries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        include: {
          user: {
            include: { profile: true },
          },
          project: true,
          workplace: true,
          approvedBy: {
            include: { profile: true },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.timeEntry.count({ where }),
    ])

    // IST timezone offset: +5:30 = 330 minutes
    const TIMEZONE_OFFSET_MINS = 330
    
    // Format UTC time as local IST time string (HH:mm format)
    // This prevents double timezone conversion - uses UTC methods, server-agnostic
    const formatUTCToLocalTimeString = (utcDate: Date): string => {
      // Get UTC hours and minutes
      const utcMins = utcDate.getUTCHours() * 60 + utcDate.getUTCMinutes()
      // Add IST offset
      let localMins = utcMins + TIMEZONE_OFFSET_MINS
      // Handle day overflow
      if (localMins >= 24 * 60) localMins -= 24 * 60
      if (localMins < 0) localMins += 24 * 60
      
      const hours = Math.floor(localMins / 60)
      const mins = localMins % 60
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
    }
    
    const data = entries.map((entry) => {
      return {
        id: entry.id,
        entryDate: format(entry.entryDate, "yyyy-MM-dd"),
        // Return original UTC ISO strings for API compatibility
        startTime: entry.startTime.toISOString(),
        endTime: entry.endTime.toISOString(),
        // Formatted times for UI display - these are the correct local IST times
        startTimeFormatted: formatUTCToLocalTimeString(entry.startTime),
        endTimeFormatted: formatUTCToLocalTimeString(entry.endTime),
      durationMinutes: entry.durationMinutes,
      status: entry.status,
      notes: entry.notes,
      rejectionReason: entry.rejectionReason,
      isSplit: entry.isSplit,
      project: entry.project ? {
        id: entry.project.id,
        projectCode: entry.project.projectCode,
        name: entry.project.name,
        color: entry.project.color,
      } : null,
      workplace: entry.workplace ? {
        id: entry.workplace.id,
        locationCode: entry.workplace.locationCode,
        name: entry.workplace.name,
      } : null,
      employee: {
        id: entry.user.id,
        email: entry.user.email,
        employeeCode: entry.user.profile?.employeeCode,
        firstName: entry.user.profile?.firstName,
        lastName: entry.user.profile?.lastName,
      },
      approvedBy: entry.approvedBy ? {
        firstName: entry.approvedBy.profile?.firstName,
        lastName: entry.approvedBy.profile?.lastName,
      } : null,
      approvedAt: entry.approvedAt,
      createdAt: entry.createdAt,
    }})

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching approvals:", error)
    return NextResponse.json(
      { error: "Failed to fetch approvals" },
      { status: 500 }
    )
  }
}

// POST - Approve or reject entries (supports bulk)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admin roles can approve/reject
    if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validation = approvalActionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { entryIds, action, rejectionReason } = validation.data

    // Verify all entries belong to the admin's workspace
    const entries = await prisma.timeEntry.findMany({
      where: {
        id: { in: entryIds },
        user: { workspaceId: session.user.workspaceId },
        status: "PENDING",
      },
    })

    if (entries.length !== entryIds.length) {
      return NextResponse.json(
        { error: "Some entries not found or already processed" },
        { status: 400 }
      )
    }

    // Update entries
    const updateData: any = {
      status: action === "approve" ? "APPROVED" : "REJECTED",
      approvedById: session.user.id,
      approvedAt: new Date(),
    }

    if (action === "reject" && rejectionReason) {
      updateData.rejectionReason = rejectionReason
    }

    const result = await prisma.timeEntry.updateMany({
      where: {
        id: { in: entryIds },
        status: "PENDING",
      },
      data: updateData,
    })

    // Create audit logs
    await prisma.auditLog.createMany({
      data: entryIds.map((entryId) => ({
        workspaceId: session.user.workspaceId,
        userId: session.user.id,
        userEmail: session.user.email,
        action: action === "approve" ? "APPROVE" : "REJECT",
        entityType: "TimeEntry",
        entityId: entryId,
        newValue: { status: updateData.status, rejectionReason },
      })),
    })

    // Emit realtime event for each affected entry
    // These will be picked up by the employee dashboard
    entryIds.forEach(entryId => {
      // Find the specific entry to get its userId
      const entry = entries.find(e => e.id === entryId)
      if (entry) {
        emitRealtimeEvent(
          session.user.workspaceId,
          "time_entry_updated",
          { entryId, status: updateData.status, action },
          entry.userId
        )
      }
    })

    return NextResponse.json({
      message: `${result.count} entries ${action === "approve" ? "approved" : "rejected"}`,
      count: result.count,
    })
  } catch (error) {
    console.error("Error processing approvals:", error)
    return NextResponse.json(
      { error: "Failed to process approvals" },
      { status: 500 }
    )
  }
}
