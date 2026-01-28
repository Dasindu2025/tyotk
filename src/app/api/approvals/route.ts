import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { format } from "date-fns"

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

    const where: any = {
      user: { workspaceId: session.user.workspaceId },
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

    const data = entries.map((entry) => ({
      id: entry.id,
      entryDate: format(entry.entryDate, "yyyy-MM-dd"),
      startTime: entry.startTime.toISOString(),
      endTime: entry.endTime.toISOString(),
      // Also provide formatted time strings for direct display in 24h format
      startTimeFormatted: format(entry.startTime, "HH:mm"),
      endTimeFormatted: format(entry.endTime, "HH:mm"),
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
    }))

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
