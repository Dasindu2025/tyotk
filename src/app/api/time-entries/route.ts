import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { validateTimeEntry, type SplitTimeEntry } from "@/lib/services/time-entry"
import { startOfDay, endOfDay, parseISO, format, addDays } from "date-fns"
import { emitRealtimeEvent } from "@/lib/services/realtime"

// Validation schemas
const createTimeEntrySchema = z.object({
  // Accept datetime strings in format YYYY-MM-DDTHH:mm:ss (local time, no timezone)
  startTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, "Invalid start time format. Expected: YYYY-MM-DDTHH:mm:ss"),
  endTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, "Invalid end time format. Expected: YYYY-MM-DDTHH:mm:ss"),
  projectId: z.string().optional(),
  workplaceId: z.string().min(1, "Workplace is required"),
  notes: z.string().optional(),
  // Timezone-aware splitting fields
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected: YYYY-MM-DD").optional(), // YYYY-MM-DD format
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
        // Filter by workspace through user relation - eliminates extra DB query
        where.user = { workspaceId: session.user.workspaceId }
      }
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
    // IMPORTANT: Format entryDate as YYYY-MM-DD string to prevent timezone conversion issues
    // When entryDate (stored as @db.Date) is serialized as ISO timestamp (e.g., 2024-01-23T00:00:00.000Z),
    // clients in different timezones may interpret it as a different calendar date
    
    // IST timezone offset: +5:30 = 330 minutes
    // To convert UTC to local IST: add 330 minutes
    const TIMEZONE_OFFSET_MS = 330 * 60 * 1000
    
    // Convert UTC Date to local IST Date for display
    const convertUTCToLocal = (utcDate: Date): Date => {
      return new Date(utcDate.getTime() + TIMEZONE_OFFSET_MS)
    }
    
    const data = entries.map((entry) => ({
      id: entry.id,
      entryDate: format(entry.entryDate, "yyyy-MM-dd"),
      // Convert UTC times to local IST for display
      startTime: convertUTCToLocal(entry.startTime),
      endTime: convertUTCToLocal(entry.endTime),
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
    
    // Clean up empty strings to undefined for optional fields
    if (body.projectId === "") body.projectId = undefined
    if (body.notes === "") body.notes = undefined
    
    const validation = createTimeEntrySchema.safeParse(body)

    if (!validation.success) {
      // Return more detailed error message
      const errorMessages = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten(), message: errorMessages },
        { status: 400 }
      )
    }

    const { startTime, endTime, projectId, workplaceId, notes, entryDate, crossesMidnight } = validation.data
    
    // IST timezone offset: +5:30 = 330 minutes
    // To convert local IST time to UTC: subtract 330 minutes
    const TIMEZONE_OFFSET_MINUTES = 330
    
    // Parse local datetime string and convert to UTC
    // Input format: "2026-01-26T21:00:00" (local IST time)
    // Output: UTC Date object (21:00 IST = 15:30 UTC)
    const parseLocalToUTC = (dtString: string): Date => {
      const [datePart, timePart] = dtString.split('T')
      const [year, month, day] = datePart.split('-').map(Number)
      const [hour, minute, second] = timePart.split(':').map(Number)
      
      // Create date in local time (treating input as local time)
      const localDate = new Date(year, month - 1, day, hour, minute, second || 0)
      
      // Convert to UTC by subtracting timezone offset
      // IST is UTC+5:30, so subtract 330 minutes to get UTC
      return new Date(localDate.getTime() - TIMEZONE_OFFSET_MINUTES * 60 * 1000)
    }
    
    const startDate = parseLocalToUTC(startTime)
    const endDate = parseLocalToUTC(endTime)

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
    
    // Split hour is hardcoded to midnight (00:00)
    const splitHour = 0
    
    // Check if entry date is within allowed backdate range
    // Use entryDate parameter directly to avoid timezone issues
    const today = new Date()
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0))
    
    let entryDayUTC: Date
    if (entryDate) {
      const [year, month, day] = entryDate.split('-').map(Number)
      entryDayUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
    } else {
      const [startDateStr] = startTime.split('T')
      const [year, month, day] = startDateStr.split('-').map(Number)
      entryDayUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
    }
    
    const daysDiff = Math.floor((todayUTC.getTime() - entryDayUTC.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff > backdateLimit) {
      return NextResponse.json(
        { error: `Cannot create entries more than ${backdateLimit} days in the past` },
        { status: 400 }
      )
    }

    // Check for overlapping time entries
    // Use entryDate parameter directly to avoid timezone issues
    // entryDate is in format "YYYY-MM-DD" from frontend
    let queryStartDate: Date
    let queryEndDate: Date
    
    if (entryDate) {
      // Parse entryDate directly using UTC to avoid timezone shifts
      const [year, month, day] = entryDate.split('-').map(Number)
      queryStartDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
      queryEndDate = new Date(Date.UTC(year, month - 1, day + 2, 0, 0, 0, 0)) // Check current and next day to handle cross-midnight
    } else {
      // Fallback: extract date from startTime string
      const [startDateStr] = startTime.split('T')
      const [year, month, day] = startDateStr.split('-').map(Number)
      queryStartDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
      queryEndDate = new Date(Date.UTC(year, month - 1, day + 2, 0, 0, 0, 0))
    }

    // Query existing entries for this user on the same day(s)
    const existingEntries = await prisma.timeEntry.findMany({
      where: {
        userId: session.user.id,
        entryDate: {
          gte: queryStartDate,
          lt: queryEndDate,
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
    const splitEntries: SplitTimeEntry[] = []
    const totalMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
    
    if (crossesMidnight && entryDate) {
      // TIMEZONE-SAFE SPLIT LOGIC using UTC methods
      const [startDateStr] = startTime.split('T')
      const [endDateStr] = endTime.split('T')
      
      // Parse date components
      const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number)
      const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number)
      
      // Create dates using UTC methods to avoid timezone issues
      // First entry date: the start date at midnight UTC
      const firstDate = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0))
      
      // Second entry date: the end date at midnight UTC
      const secondDate = new Date(Date.UTC(endYear, endMonth - 1, endDay, 0, 0, 0, 0))
      
      // Midnight split point: start of the end date at midnight UTC
      const splitPointTime = new Date(Date.UTC(endYear, endMonth - 1, endDay, splitHour, 0, 0, 0))
      const splitPointUTC = splitPointTime.getTime()
      
      // First entry: from startDate to split point
      const firstDuration = Math.round((splitPointUTC - startDate.getTime()) / (1000 * 60))
      // Second entry: from split point to endDate  
      const secondDuration = Math.round((endDate.getTime() - splitPointUTC) / (1000 * 60))
      
      if (firstDuration > 0) {
        splitEntries.push({
          entryDate: firstDate,
          startTime: startDate,
          endTime: new Date(splitPointUTC),
          durationMinutes: firstDuration,
          isSplit: true,
          originalStart: startDate,
          originalEnd: endDate,
        })
      }
      
      if (secondDuration > 0) {
        splitEntries.push({
          entryDate: secondDate,
          startTime: new Date(splitPointUTC),
          endTime: endDate,
          durationMinutes: secondDuration,
          isSplit: true,
          originalStart: startDate,
          originalEnd: endDate,
        })
      }
    } else {
      // Same day entry - no split needed
      // Use entryDate parameter directly to avoid timezone issues
      let parsedEntryDate: Date
      if (entryDate) {
        // Parse entryDate directly using UTC to avoid timezone shifts
        const [year, month, day] = entryDate.split('-').map(Number)
        parsedEntryDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
      } else {
        // Fallback: extract date from startTime string
        const [startDateStr] = startTime.split('T')
        const [year, month, day] = startDateStr.split('-').map(Number)
        parsedEntryDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
      }
      splitEntries.push({
        entryDate: parsedEntryDate,
        startTime: startDate,
        endTime: endDate,
        durationMinutes: totalMinutes,
        isSplit: false,
      })
    }
    
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

      // Create audit logs for each entry (including splits)
      await tx.auditLog.createMany({
        data: results.map(entry => ({
          workspaceId: session.user.workspaceId,
          userId: session.user.id,
          userEmail: session.user.email,
          action: "CREATE",
          entityType: "TimeEntry",
          entityId: entry.id,
          newValue: { 
            status: entry.status, 
            durationMinutes: entry.durationMinutes,
            entryDate: format(entry.entryDate, "yyyy-MM-dd")
          },
        }))
      })

      return results
    })

    // Emit realtime events for new entries
    // These will notify the manager and update the employee dashboard
    createdEntries.forEach(entry => {
      emitRealtimeEvent(
        session.user.workspaceId,
        "time_entry_created",
        { entryId: entry.id, status: entry.status },
        session.user.id
      )
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
