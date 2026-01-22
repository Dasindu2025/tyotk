import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hash } from "bcryptjs"
import { z } from "zod"

// Validation schema - simplified to just required fields
const createEmployeeSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
})

// GET - List all employees in workspace
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admin roles can list employees
    if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") // "active" | "inactive" | null (all)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      workspaceId: session.user.workspaceId,
      role: "EMPLOYEE", // Only get employees, not admins
    }

    if (status === "active") {
      where.isActive = true
    } else if (status === "inactive") {
      where.isActive = false
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { profile: { firstName: { contains: search, mode: "insensitive" } } },
        { profile: { lastName: { contains: search, mode: "insensitive" } } },
        { profile: { employeeCode: { contains: search, mode: "insensitive" } } },
      ]
    }

    // Get employees with profiles
    const [employees, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          profile: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    // Transform data for response - include plainPassword for admin viewing
    const data = employees.map((user) => ({
      id: user.id,
      email: user.email,
      password: user.plainPassword || "********", // Show plain password if available
      role: user.role,
      isActive: user.isActive,
      employeeCode: user.profile?.employeeCode,
      firstName: user.profile?.firstName,
      lastName: user.profile?.lastName,
      createdAt: user.createdAt,
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
    console.error("Error fetching employees:", error)
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    )
  }
}

// POST - Create new employee
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admin roles can create employees
    if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validation = createEmployeeSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { email, password, firstName, lastName } = validation.data

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      )
    }

    // Generate unique employee code with timestamp to avoid collisions
    const timestamp = Date.now().toString(36).toUpperCase()
    const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase()
    const employeeCode = `EMP${timestamp}${randomPart}`

    // Hash password
    const passwordHash = await hash(password, 12)

    // Create user with profile
    const user = await prisma.user.create({
      data: {
        workspaceId: session.user.workspaceId,
        email,
        passwordHash,
        plainPassword: password, // Store plain password for admin viewing
        role: "EMPLOYEE",
        isActive: true,
        profile: {
          create: {
            employeeCode,
            firstName,
            lastName,
          },
        },
      },
      include: { profile: true },
    })

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        password: password, // Return password so admin can see it
        employeeCode: user.profile?.employeeCode,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating employee:", error)
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    )
  }
}
