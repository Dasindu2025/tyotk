import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hash } from "bcryptjs"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Get employee settings (backdateLimit)
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

// PUT - Update employee settings (backdateLimit and/or password)
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
    const { backdateLimit, newPassword } = body

    // Validate backdateLimit if provided
    if (backdateLimit !== undefined) {
      if (typeof backdateLimit !== "number" || backdateLimit < 0 || backdateLimit > 365) {
        return NextResponse.json(
          { error: "Backdate limit must be between 0 and 365 days" },
          { status: 400 }
        )
      }
    }

    // Validate password if provided
    if (newPassword !== undefined) {
      if (typeof newPassword !== "string" || newPassword.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        )
      }
    }

    // Build update data
    const updateData: any = {
      updatedAt: new Date()
    }

    if (backdateLimit !== undefined) {
      updateData.backdateLimit = backdateLimit
    }

    if (newPassword) {
      const passwordHash = await hash(newPassword, 12)
      updateData.passwordHash = passwordHash
      updateData.plainPassword = newPassword  // Store plain password for admin viewing
    }

    console.log("[Employee Settings] Updating user:", id, "with data:", updateData)

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    })
    
    console.log("[Employee Settings] Updated user backdateLimit:", (updatedUser as { backdateLimit?: number }).backdateLimit)

    return NextResponse.json({ 
      success: true,
      message: newPassword ? "Password and settings updated" : "Settings updated"
    })
  } catch (error) {
    console.error("Error updating employee settings:", error)
    return NextResponse.json(
      { error: "Failed to update employee settings" },
      { status: 500 }
    )
  }
}

