import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET - Get workspace settings
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: session.user.workspaceId },
    }) as { dayStartHour?: number; dayEndHour?: number; name: string } | null

    return NextResponse.json({
      dayStartHour: workspace?.dayStartHour ?? 6,
      dayEndHour: workspace?.dayEndHour ?? 18,
      name: workspace?.name,
    })
  } catch (error) {
    console.error("Error fetching workspace settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

// PUT - Update workspace settings
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can update workspace settings
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { dayStartHour, dayEndHour } = body

    // Validate hours
    if (typeof dayStartHour !== "number" || typeof dayEndHour !== "number") {
      return NextResponse.json({ error: "Invalid hour values" }, { status: 400 })
    }

    if (dayStartHour < 0 || dayStartHour > 23 || dayEndHour < 0 || dayEndHour > 23) {
      return NextResponse.json({ error: "Hours must be between 0 and 23" }, { status: 400 })
    }

    // Update workspace with raw query to handle pre-regeneration schema
    await prisma.$executeRaw`
      UPDATE "Workspace" 
      SET "dayStartHour" = ${dayStartHour}, 
          "dayEndHour" = ${dayEndHour},
          "updatedAt" = NOW()
      WHERE id = ${session.user.workspaceId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating workspace settings:", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
