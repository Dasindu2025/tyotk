import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

// Validation schema
const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
})

// GET - List workspaces for the admin's organization
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can list workspaces
    if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get the organization from the user's current workspace
    const currentWorkspace = await prisma.workspace.findUnique({
      where: { id: session.user.workspaceId },
      include: { organization: true },
    })

    if (!currentWorkspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    // Get all workspaces in the same organization
    const workspaces = await prisma.workspace.findMany({
      where: {
        organizationId: currentWorkspace.organizationId,
        isActive: true,
      },
      include: {
        _count: {
          select: { users: true, projects: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({
      data: workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        slug: w.slug,
        isActive: w.isActive,
        userCount: w._count.users,
        projectCount: w._count.projects,
        createdAt: w.createdAt,
      })),
    })
  } catch (error) {
    console.error("Error fetching workspaces:", error)
    return NextResponse.json(
      { error: "Failed to fetch workspaces" },
      { status: 500 }
    )
  }
}

// POST - Create a new workspace
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can create workspaces
    if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validation = createWorkspaceSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { name } = validation.data

    // Get the organization from the user's current workspace
    const currentWorkspace = await prisma.workspace.findUnique({
      where: { id: session.user.workspaceId },
      include: { organization: true },
    })

    if (!currentWorkspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    // Generate slug
    const slug = `${currentWorkspace.organization.slug}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`

    // Check if slug already exists
    const existing = await prisma.workspace.findUnique({
      where: { slug },
    })

    if (existing) {
      return NextResponse.json(
        { error: "A workspace with this name already exists" },
        { status: 409 }
      )
    }

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        organizationId: currentWorkspace.organizationId,
        name,
        slug,
        isActive: true,
      },
      include: {
        _count: {
          select: { users: true, projects: true },
        },
      },
    })

    return NextResponse.json(
      {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        userCount: workspace._count.users,
        projectCount: workspace._count.projects,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating workspace:", error)
    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    )
  }
}
