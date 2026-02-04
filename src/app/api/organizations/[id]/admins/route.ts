import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { hash } from "bcryptjs"

// POST /api/organizations/[id]/admins - Assign an admin to a company
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id: organizationId } = await params
    const body = await request.json()
    const { email, firstName, lastName, password } = body

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, first name, and last name are required" },
        { status: 400 }
      )
    }

    // Normalize email to lowercase for case-insensitive comparison
    const normalizedEmail = email.toLowerCase().trim()

    // Get the organization and its main workspace
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { workspaces: true },
    })

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      )
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      )
    }

    // Get the first workspace (main workspace)
    const workspace = organization.workspaces[0]
    if (!workspace) {
      return NextResponse.json(
        { error: "Organization has no workspace" },
        { status: 400 }
      )
    }

    // Hash the password (use a default if not provided)
    const plainPassword = password || "Admin123!"
    const passwordHash = await hash(plainPassword, 12)
    
    // Generate unique admin code
    const timestamp = Date.now().toString(36).toUpperCase()
    const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase()
    const adminCode = `ADM${timestamp}${randomPart}`

    // Create the admin user with profile
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        plainPassword, // Store for super admin viewing
        role: "ADMIN",
        workspaceId: workspace.id,
        profile: {
          create: {
            firstName,
            lastName,
            employeeCode: adminCode,
          },
        },
      },
      include: {
        profile: true,
        workspace: {
          include: { organization: true },
        },
      },
    })

    return NextResponse.json({
      data: {
        id: user.id,
        email: user.email,
        password: plainPassword, // Return password so super admin can see it
        role: user.role,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        organizationName: organization.name,
        workspaceName: workspace.name,
      },
      message: "Admin assigned successfully",
    })
  } catch (error) {
    console.error("Failed to assign admin:", error)
    return NextResponse.json(
      { error: "Failed to assign admin" },
      { status: 500 }
    )
  }
}

// GET /api/organizations/[id]/admins - List admins for a company
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id: organizationId } = await params

    // Get all admins in the organization's workspaces
    const admins = await prisma.user.findMany({
      where: {
        role: "ADMIN",
        workspace: {
          organizationId,
        },
      },
      include: {
        profile: true,
        workspace: true,
      },
    })

    return NextResponse.json({
      data: admins.map((admin) => ({
        id: admin.id,
        email: admin.email,
        password: admin.plainPassword || "********", // Show plain password for super admin
        firstName: admin.profile?.firstName,
        lastName: admin.profile?.lastName,
        workspaceName: admin.workspace.name,
        isActive: admin.isActive,
      })),
    })
  } catch (error) {
    console.error("Failed to fetch admins:", error)
    return NextResponse.json(
      { error: "Failed to fetch admins" },
      { status: 500 }
    )
  }
}
