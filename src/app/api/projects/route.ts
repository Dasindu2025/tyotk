import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

// Validation schema - now includes optional workspaceId
const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
  workspaceId: z.string().optional(), // Admin can specify which workspace
})

// GET - List projects (optionally filter by workspace)
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const activeOnly = searchParams.get("active") !== "false"
    const workspaceId = searchParams.get("workspaceId") // Optional filter

    // Get user's organization to verify workspace access
    const currentWorkspace = await prisma.workspace.findUnique({
      where: { id: session.user.workspaceId },
    })

    const where: any = {}

    // If workspaceId specified, verify it belongs to same org
    if (workspaceId) {
      const targetWorkspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
      })
      if (targetWorkspace?.organizationId !== currentWorkspace?.organizationId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      where.workspaceId = workspaceId
    } else {
      // Default to current workspace
      where.workspaceId = session.user.workspaceId
    }

    if (activeOnly) {
      where.isActive = true
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { projectCode: { contains: search, mode: "insensitive" } },
      ]
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        workspace: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      data: projects.map((p) => ({
        id: p.id,
        projectCode: p.projectCode,
        name: p.name,
        description: p.description,
        color: p.color,
        isActive: p.isActive,
        workspaceId: p.workspaceId,
        workspaceName: p.workspace.name,
        createdAt: p.createdAt,
      })),
    })
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    )
  }
}

// POST - Create project (optionally in a specific workspace)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can create projects
    if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validation = createProjectSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { name, description, color, workspaceId: targetWorkspaceId } = validation.data

    // Determine which workspace to use
    let workspaceId = session.user.workspaceId

    if (targetWorkspaceId) {
      // Verify the target workspace belongs to the same organization
      const currentWorkspace = await prisma.workspace.findUnique({
        where: { id: session.user.workspaceId },
      })
      const targetWorkspace = await prisma.workspace.findUnique({
        where: { id: targetWorkspaceId },
      })

      if (!targetWorkspace) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
      }

      if (targetWorkspace.organizationId !== currentWorkspace?.organizationId) {
        return NextResponse.json({ error: "Cannot create project in another organization's workspace" }, { status: 403 })
      }

      workspaceId = targetWorkspaceId
    }

    // Generate unique project code
    const timestamp = Date.now().toString(36).toUpperCase()
    const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase()
    const projectCode = `PRO${timestamp}${randomPart}`

    // Create project
    const project = await prisma.project.create({
      data: {
        workspaceId,
        projectCode,
        name,
        description,
        color: color || "#6366F1",
        isActive: true,
      },
      include: {
        workspace: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(
      {
        id: project.id,
        projectCode: project.projectCode,
        name: project.name,
        description: project.description,
        color: project.color,
        workspaceId: project.workspaceId,
        workspaceName: project.workspace.name,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    )
  }
}
