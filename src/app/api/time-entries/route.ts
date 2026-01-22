import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { splitTimeEntry, validateTimeEntry, type SplitTimeEntry } from "@/lib/services/time-entry"
import { startOfDay, endOfDay, parseISO } from "date-fns"

// Validation schemas
const createTimeEntrySchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  projectId: z.string().optional(),
  workplaceId: z.string().optional(),
  notes: z.string().optional(),
})

const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  projectId: z.string().optional(),
  userId: z.string().optional(), // Only for admins
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
})

// GET - List time entries
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(searchParams))
    
    const { startDate, endDate, status, projectId, userId, page, limit } = query
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    // Employees can only see their own entries
    if (session.user.role === "EMPLOYEE") {
      where.userId = session.user.id
    } else {
      // Admins can filter by user or see all workspace entries
      if (userId) {
        where.userId = userId
      }
      // Scope to workspace
      where.user = { workspaceId: session.user.workspaceId }
    }

    if (startDate) {
      where.entryDate = { gte: startOfDay(parseISO(startDate)) }
    }
    if (endDate) {
      where.entryDate = { ...where.entryDate, lte: endOfDay(parseISO(endDate)) }
    }
    if (status) {
      where.status = status
    }
    if (projectId) {
      where.projectId = projectId
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
        orderBy: [{ entryDate: "desc" }, { startTime: "desc" }],
        skip,
        take: limit,
      }),
      prisma.timeEntry.count({ where }),
    ])

    // Transform for response
    const data = entries.map((entry) => ({
      id: entry.id,
      entryDate: entry.entryDate,
      startTime: entry.startTime,
      endTime: entry.endTime,
      durationMinutes: entry.durationMinutes,
      status: entry.status,
      notes: entry.notes,
      rejectionReason: entry.rejectionReason,
      isSplit: entry.isSplit,
      parentEntryId: entry.parentEntryId,
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
      user: {
        id: entry.user.id,
        email: entry.user.email,
        employeeCode: entry.user.profile?.employeeCode,
        firstName: entry.user.profile?.firstName,
        lastName: entry.user.profile?.lastName,
      },
      approvedBy: entry.approvedBy ? {
        id: entry.approvedBy.id,
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
    console.error("Error fetching time entries:", error)
    return NextResponse.json(
      { error: "Failed to fetch time entries" },
      { status: 500 }
    )
  }
}

// POST - Create time entry (with automatic cross-day splitting)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validation = createTimeEntrySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { startTime, endTime, projectId, workplaceId, notes } = validation.data
    const startDate = new Date(startTime)
    const endDate = new Date(endTime)

    // Validate the time entry
    const entryValidation = validateTimeEntry({
      startTime: startDate,
      endTime: endDate,
      userId: session.user.id,
    })

    if (!entryValidation.valid) {
      return NextResponse.json(
        { error: entryValidation.error },
        { status: 400 }
      )
    }

    // Split the entry if it crosses midnight
    const splitEntries: SplitTimeEntry[] = splitTimeEntry({
      startTime: startDate,
      endTime: endDate,
      userId: session.user.id,
      projectId,
      workplaceId,
      notes,
    })

    // Create all entries in a transaction
    interface CreatedEntryResult {
      id: string
      entryDate: Date
      startTime: Date
      endTime: Date
      durationMinutes: number
      status: string
      isSplit: boolean
    }

    const createdEntries: CreatedEntryResult[] = await prisma.$transaction(async (tx) => {
      const results: CreatedEntryResult[] = []
      
      // Create first entry (parent if split)
      const firstEntry = splitEntries[0]
      const parentEntry = await tx.timeEntry.create({
        data: {
          userId: session.user.id,
          entryDate: firstEntry.entryDate,
          startTime: firstEntry.startTime,
          endTime: firstEntry.endTime,
          durationMinutes: firstEntry.durationMinutes,
          status: "PENDING",
          notes,
          projectId,
          workplaceId,
          isSplit: firstEntry.isSplit,
          originalStart: firstEntry.originalStart,
          originalEnd: firstEntry.originalEnd,
          parentEntryId: null,
        },
      })

      results.push({
        id: parentEntry.id,
        entryDate: parentEntry.entryDate,
        startTime: parentEntry.startTime,
        endTime: parentEntry.endTime,
        durationMinutes: parentEntry.durationMinutes,
        status: parentEntry.status,
        isSplit: parentEntry.isSplit,
      })

      // Create remaining entries with parent reference if any
      for (let i = 1; i < splitEntries.length; i++) {
        const splitEntry = splitEntries[i]
        
        const childEntry = await tx.timeEntry.create({
          data: {
            userId: session.user.id,
            entryDate: splitEntry.entryDate,
            startTime: splitEntry.startTime,
            endTime: splitEntry.endTime,
            durationMinutes: splitEntry.durationMinutes,
            status: "PENDING",
            notes,
            projectId,
            workplaceId,
            isSplit: splitEntry.isSplit,
            originalStart: splitEntry.originalStart,
            originalEnd: splitEntry.originalEnd,
            parentEntryId: parentEntry.id,
          },
        })

        results.push({
          id: childEntry.id,
          entryDate: childEntry.entryDate,
          startTime: childEntry.startTime,
          endTime: childEntry.endTime,
          durationMinutes: childEntry.durationMinutes,
          status: childEntry.status,
          isSplit: childEntry.isSplit,
        })
      }

      return results
    })

    return NextResponse.json(
      {
        message: createdEntries.length > 1 
          ? `Time entry split into ${createdEntries.length} entries across days`
          : "Time entry created",
        entries: createdEntries.map((e) => ({
          id: e.id,
          entryDate: e.entryDate,
          startTime: e.startTime,
          endTime: e.endTime,
          durationMinutes: e.durationMinutes,
          status: e.status,
          isSplit: e.isSplit,
        })),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating time entry:", error)
    return NextResponse.json(
      { error: "Failed to create time entry" },
      { status: 500 }
    )
  }
}
