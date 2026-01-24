import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { validateTimeEntry, type SplitTimeEntry } from "@/lib/services/time-entry"
import { startOfDay, endOfDay, parseISO, format, addDays } from "date-fns"

// Validation schemas
const createTimeEntrySchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  projectId: z.string().optional(),
  workplaceId: z.string().min(1, "Workplace is required"),
  notes: z.string().optional(),
  // Timezone-aware splitting fields
  entryDate: z.string().optional(), // YYYY-MM-DD format
  crossesMidnight: z.boolean().optional(),
  timezoneOffset: z.number().optional(), // minutes offset from UTC
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
      } else {
        // Get all user IDs in the workspace first
        const workspaceUsers = await prisma.user.findMany({
          where: { workspaceId: session.user.workspaceId },
          select: { id: true }
        })
        const workspaceUserIds = workspaceUsers.map(u => u.id)
        
        console.log("[TimeEntries API] Workspace users:", workspaceUserIds.length)
        
        if (workspaceUserIds.length > 0) {
          where.userId = { in: workspaceUserIds }
        } else {
          // No users in workspace, return empty
          return NextResponse.json({
            data: [],
            pagination: { page, limit, total: 0, totalPages: 0 }
          })
        }
      }
    }

    console.log("[TimeEntries API] Query params:", { startDate, endDate, status, projectId, userId })
    console.log("[TimeEntries API] Session workspace:", session.user.workspaceId)

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
    // IMPORTANT: Format entryDate as YYYY-MM-DD string to prevent timezone conversion issues
    // When entryDate (stored as @db.Date) is serialized as ISO timestamp (e.g., 2024-01-23T00:00:00.000Z),
    // clients in different timezones may interpret it as a different calendar date
    const data = entries.map((entry) => ({
      id: entry.id,
      entryDate: format(entry.entryDate, "yyyy-MM-dd"),
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

    const { startTime, endTime, projectId, workplaceId, notes, entryDate, crossesMidnight } = validation.data
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

    // Get user's backdate limit and auto-approve setting
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { backdateLimit: true, autoApprove: true },
    })
    
    const backdateLimit = (user as { backdateLimit?: number } | null)?.backdateLimit ?? 7
    const autoApprove = (user as { autoApprove?: boolean } | null)?.autoApprove ?? false
    
    console.log("[TimeEntry POST] Backdate check:", {
      userId: session.user.id,
      userBackdateLimitFromDB: (user as { backdateLimit?: number } | null)?.backdateLimit,
      backdateLimitUsed: backdateLimit,
    })
    
    // Check if entry date is within allowed backdate range
    const today = startOfDay(new Date())
    const entryDay = startOfDay(startDate)
    const daysDiff = Math.floor((today.getTime() - entryDay.getTime()) / (1000 * 60 * 60 * 24))
    
    console.log("[TimeEntry POST] Date comparison:", {
      today: today.toISOString(),
      entryDay: entryDay.toISOString(),
      daysDiff,
      allowed: daysDiff <= backdateLimit,
    })
    
    if (daysDiff > backdateLimit) {
      return NextResponse.json(
        { error: `Cannot create entries more than ${backdateLimit} days in the past` },
        { status: 400 }
      )
    }

    // Check for overlapping time entries
    // Get start and end of the day for the entry
    const entryDayStart = startOfDay(startDate)
    const entryDayEnd = new Date(entryDayStart)
    entryDayEnd.setDate(entryDayEnd.getDate() + 2) // Check current and next day to handle cross-midnight

    // Query existing entries for this user on the same day(s)
    const existingEntries = await prisma.timeEntry.findMany({
      where: {
        userId: session.user.id,
        entryDate: {
          gte: entryDayStart,
          lt: entryDayEnd,
        },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        entryDate: true,
      },
    })

    // Check for overlaps
    for (const existing of existingEntries) {
      const existingStart = new Date(existing.startTime)
      const existingEnd = new Date(existing.endTime)
      
      // Check if times overlap (new start < existing end) AND (new end > existing start)
      if (startDate < existingEnd && endDate > existingStart) {
        const existingStartStr = format(existingStart, "HH:mm")
        const existingEndStr = format(existingEnd, "HH:mm")
        return NextResponse.json(
          { error: `Time entry overlaps with existing entry (${existingStartStr} - ${existingEndStr})` },
          { status: 400 }
        )
      }
    }

    // TIMEZONE-AWARE SPLITTING
    // Use explicit entryDate and crossesMidnight from frontend instead of UTC date comparison
    console.log("[TimeEntry POST] Input:", {
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      entryDate,
      crossesMidnight,
    })
    
    const splitEntries: SplitTimeEntry[] = []
    const totalMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
    
    if (crossesMidnight && entryDate) {
      // Entry crosses midnight - split into two entries based on user's local dates
      const firstDate = parseISO(entryDate) // User's selected date (e.g., 2026-01-19)
      const secondDate = addDays(firstDate, 1) // Next day (e.g., 2026-01-20)
      
      // Calculate midnight in UTC based on user's local date
      // The startTime is already in UTC, we need to find when midnight occurs
      // For the split, we use the entryDate as the anchor
      
      // Entry 1: From start time until midnight (on entryDate)
      // Entry 2: From midnight until end time (on next day)
      
      // Calculate durations based on the times
      // startTime is in UTC, endTime is in UTC
      // We know: startTime is on entryDate (local), endTime is on entryDate+1 (local)
      
      // Find midnight between them (this is the next day at 00:00 local time)
      // Since we have startDate and endDate in UTC, and we know entry crosses midnight,
      // we can calculate the split point
      
      // Simplified: Use the timestamps directly
      // Entry 1 ends at the start of the second date (midnight local)
      // We can construct midnight by using the secondDate at 00:00 local
      // Since secondDate is parsed from entryDate+1, it's at 00:00 UTC of that day
      
      // Calculate midnight timestamp (when entry 1 ends and entry 2 starts)
      // secondDate is already at 00:00:00 of the next day
      const midnightUTC = secondDate.getTime()
      
      // First entry: from startDate to midnight
      const firstDuration = Math.round((midnightUTC - startDate.getTime()) / (1000 * 60))
      // Second entry: from midnight to endDate  
      const secondDuration = Math.round((endDate.getTime() - midnightUTC) / (1000 * 60))
      
      console.log("[TimeEntry POST] Split calculation:", {
        firstDate: format(firstDate, "yyyy-MM-dd"),
        secondDate: format(secondDate, "yyyy-MM-dd"),
        midnightUTC: new Date(midnightUTC).toISOString(),
        firstDuration,
        secondDuration,
        totalMinutes,
      })
      
      if (firstDuration > 0) {
        splitEntries.push({
          entryDate: firstDate,
          startTime: startDate,
          endTime: new Date(midnightUTC),
          durationMinutes: firstDuration,
          isSplit: true,
          originalStart: startDate,
          originalEnd: endDate,
        })
      }
      
      if (secondDuration > 0) {
        splitEntries.push({
          entryDate: secondDate,
          startTime: new Date(midnightUTC),
          endTime: endDate,
          durationMinutes: secondDuration,
          isSplit: true,
          originalStart: startDate,
          originalEnd: endDate,
        })
      }
    } else {
      // Same day entry - no split needed
      const parsedEntryDate = entryDate ? parseISO(entryDate) : startOfDay(startDate)
      splitEntries.push({
        entryDate: parsedEntryDate,
        startTime: startDate,
        endTime: endDate,
        durationMinutes: totalMinutes,
        isSplit: false,
      })
    }
    
    console.log("[TimeEntry POST] Split result:", {
      numberOfEntries: splitEntries.length,
      entries: splitEntries.map(e => ({
        entryDate: format(e.entryDate, "yyyy-MM-dd"),
        startTime: e.startTime.toISOString(),
        endTime: e.endTime.toISOString(),
        durationMinutes: e.durationMinutes,
        isSplit: e.isSplit,
      }))
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
          status: autoApprove ? "APPROVED" : "PENDING",
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
            status: autoApprove ? "APPROVED" : "PENDING",
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
          entryDate: format(e.entryDate, "yyyy-MM-dd"),
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
