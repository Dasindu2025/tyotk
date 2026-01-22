import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET /api/organizations - List all organizations (Super Admin only)
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const organizations = await prisma.organization.findMany({
      include: {
        workspaces: {
          include: {
            users: {
              where: { role: "ADMIN" },
              select: { id: true },
            },
            _count: {
              select: { users: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Transform data to include admin count
    const data = organizations.map((org) => ({
      ...org,
      workspaces: org.workspaces.map((ws) => ({
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        isActive: ws.isActive,
        adminCount: ws.users.length, // Only ADMIN users
        _count: ws._count,
      })),
    }))

    return NextResponse.json({
      data,
      count: organizations.length,
    })
  } catch (error) {
    console.error("Failed to fetch organizations:", error)
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    )
  }
}

// POST /api/organizations - Create a new organization (Super Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, slug } = body

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const existing = await prisma.organization.findUnique({
      where: { slug },
    })

    if (existing) {
      return NextResponse.json(
        { error: "An organization with this slug already exists" },
        { status: 409 }
      )
    }

    // Create organization with a default workspace
    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        workspaces: {
          create: {
            name: "Main Workspace",
            slug: `${slug}-main`,
          },
        },
      },
      include: {
        workspaces: {
          include: {
            _count: {
              select: { users: true },
            },
          },
        },
      },
    })

    return NextResponse.json({
      data: organization,
      message: "Organization created successfully",
    })
  } catch (error) {
    console.error("Failed to create organization:", error)
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    )
  }
}
