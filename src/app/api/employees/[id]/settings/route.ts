import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Get employee backdateLimit
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        backdateLimit: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      backdateLimit: (user as { backdateLimit?: number }).backdateLimit ?? 7,
    })
  } catch (error) {
    console.error("Error fetching employee settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch employee settings" },
      { status: 500 }
    )
  }
}

// PUT - Update employee backdateLimit
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can update employee settings
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { backdateLimit } = body

    // Validate backdateLimit
    if (typeof backdateLimit !== "number" || backdateLimit < 0 || backdateLimit > 365) {
      return NextResponse.json(
        { error: "Backdate limit must be between 0 and 365 days" },
        { status: 400 }
      )
    }

    // Update user with raw query to handle pre-regeneration schema
    await prisma.$executeRaw`
      UPDATE "User" 
      SET "backdateLimit" = ${backdateLimit}, 
          "updatedAt" = NOW()
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating employee settings:", error)
    return NextResponse.json(
      { error: "Failed to update employee settings" },
      { status: 500 }
    )
  }
}
