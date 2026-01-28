import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { generateCode } from "@/lib/services/code-generator"
import { EntityType } from "@prisma/client"

// Validation schema
const createWorkplaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
})

// GET - List workplaces
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const activeOnly = searchParams.get("active") !== "false"

    const where: any = {
      workspaceId: session.user.workspaceId,
    }

    if (activeOnly) {
      where.isActive = true
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { locationCode: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ]
    }

    const workplaces = await prisma.workplace.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      data: workplaces.map((w) => ({
        id: w.id,
        locationCode: w.locationCode,
        name: w.name,
        address: w.address,
        city: w.city,
        country: w.country,
        isActive: w.isActive,
        createdAt: w.createdAt,
      })),
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    console.error("Error fetching workplaces:", error)
    return NextResponse.json(
      { error: "Failed to fetch workplaces" },
      { status: 500 }
    )
  }
}

// POST - Create workplace
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can create workplaces
    if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validation = createWorkplaceSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { name, address, city, country } = validation.data

    // Create workplace with auto-generated code
    const workplace = await prisma.$transaction(async (tx) => {
      const locationCode = await generateCode(tx, session.user.workspaceId, EntityType.WORKPLACE)

      return tx.workplace.create({
        data: {
          workspaceId: session.user.workspaceId,
          locationCode,
          name,
          address,
          city,
          country,
          isActive: true,
        },
      })
    })

    return NextResponse.json(
      {
        id: workplace.id,
        locationCode: workplace.locationCode,
        name: workplace.name,
        address: workplace.address,
        city: workplace.city,
        country: workplace.country,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating workplace:", error)
    return NextResponse.json(
      { error: "Failed to create workplace" },
      { status: 500 }
    )
  }
}
