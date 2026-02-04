import { PrismaClient, UserRole, EntityType } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting database seed...")

  // Create organization
  const organization = await prisma.organization.upsert({
    where: { slug: "tyotrack-demo" },
    update: {},
    create: {
      name: "TyoTrack Demo Organization",
      slug: "tyotrack-demo",
      isActive: true,
    },
  })
  console.log("✅ Organization created:", organization.name)

  // Create workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: "main-workspace" },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Main Workspace",
      slug: "main-workspace",
      isActive: true,
    },
  })
  console.log("✅ Workspace created:", workspace.name)

  // Create Super Admin user
  const superAdminPassword = await hash("Admin123!", 12)
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@tyotrack.com" },
    update: {},
    create: {
      workspaceId: workspace.id,
      email: "admin@tyotrack.com",
      passwordHash: superAdminPassword,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      profile: {
        create: {
          employeeCode: "EMP001",
          firstName: "Super",
          lastName: "Admin",
          department: "Management",
          position: "System Administrator",
        },
      },
    },
    include: { profile: true },
  })
  console.log("✅ Super Admin created:", superAdmin.email)

  // Update code counter for employee
  await prisma.codeCounter.upsert({
    where: {
      workspaceId_entityType: {
        workspaceId: workspace.id,
        entityType: EntityType.EMPLOYEE,
      },
    },
    update: { lastNumber: 1 },
    create: {
      workspaceId: workspace.id,
      entityType: EntityType.EMPLOYEE,
      lastNumber: 1,
    },
  })

  // Create Admin user
  const adminPassword = await hash("Admin123!", 12)
  const admin = await prisma.user.upsert({
    where: { email: "manager@tyotrack.com" },
    update: {},
    create: {
      workspaceId: workspace.id,
      email: "manager@tyotrack.com",
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      isActive: true,
      profile: {
        create: {
          employeeCode: "EMP002",
          firstName: "John",
          lastName: "Manager",
          department: "Operations",
          position: "Operations Manager",
        },
      },
    },
    include: { profile: true },
  })
  console.log("✅ Admin created:", admin.email)

  // Update code counter
  await prisma.codeCounter.update({
    where: {
      workspaceId_entityType: {
        workspaceId: workspace.id,
        entityType: EntityType.EMPLOYEE,
      },
    },
    data: { lastNumber: 2 },
  })

  // Create Employee user
  const employeePassword = await hash("Employee123!", 12)
  const employee = await prisma.user.upsert({
    where: { email: "employee@tyotrack.com" },
    update: {},
    create: {
      workspaceId: workspace.id,
      email: "employee@tyotrack.com",
      passwordHash: employeePassword,
      role: UserRole.EMPLOYEE,
      isActive: true,
      profile: {
        create: {
          employeeCode: "EMP003",
          firstName: "Jane",
          lastName: "Employee",
          department: "Development",
          position: "Software Developer",
        },
      },
    },
    include: { profile: true },
  })
  console.log("✅ Employee created:", employee.email)

  // Update code counter
  await prisma.codeCounter.update({
    where: {
      workspaceId_entityType: {
        workspaceId: workspace.id,
        entityType: EntityType.EMPLOYEE,
      },
    },
    data: { lastNumber: 3 },
  })

  // Create sample projects
  const projects = [
    { name: "Website Redesign", description: "Complete overhaul of company website", color: "#6366F1" },
    { name: "Mobile App Development", description: "Native mobile application", color: "#8B5CF6" },
    { name: "API Integration", description: "Third-party API integrations", color: "#EC4899" },
  ]

  for (let i = 0; i < projects.length; i++) {
    const projectCode = `PRO${String(i + 1).padStart(3, "0")}`
    await prisma.project.upsert({
      where: { 
        workspaceId_projectCode: {
          workspaceId: workspace.id,
          projectCode,
        }
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        projectCode,
        name: projects[i].name,
        description: projects[i].description,
        color: projects[i].color,
        isActive: true,
      },
    })
    console.log(`✅ Project created: ${projects[i].name} (${projectCode})`)
  }

  // Update project counter
  await prisma.codeCounter.upsert({
    where: {
      workspaceId_entityType: {
        workspaceId: workspace.id,
        entityType: EntityType.PROJECT,
      },
    },
    update: { lastNumber: 3 },
    create: {
      workspaceId: workspace.id,
      entityType: EntityType.PROJECT,
      lastNumber: 3,
    },
  })

  // Create sample workplaces
  const workplaces = [
    { name: "Main Office", address: "123 Business St", city: "New York", country: "USA" },
    { name: "Remote", address: "Work from home", city: "Various", country: "Global" },
    { name: "Client Site", address: "456 Client Ave", city: "Los Angeles", country: "USA" },
  ]

  for (let i = 0; i < workplaces.length; i++) {
    const locationCode = `LOC${String(i + 1).padStart(3, "0")}`
    await prisma.workplace.upsert({
      where: { 
        workspaceId_locationCode: {
          workspaceId: workspace.id,
          locationCode,
        }
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        locationCode,
        name: workplaces[i].name,
        address: workplaces[i].address,
        city: workplaces[i].city,
        country: workplaces[i].country,
        isActive: true,
      },
    })
    console.log(`✅ Workplace created: ${workplaces[i].name} (${locationCode})`)
  }

  // Update workplace counter
  await prisma.codeCounter.upsert({
    where: {
      workspaceId_entityType: {
        workspaceId: workspace.id,
        entityType: EntityType.WORKPLACE,
      },
    },
    update: { lastNumber: 3 },
    create: {
      workspaceId: workspace.id,
      entityType: EntityType.WORKPLACE,
      lastNumber: 3,
    },
  })

  console.log("\n🎉 Database seed completed successfully!")
  console.log("\n📋 Login credentials:")
  console.log("  Super Admin: admin@tyotrack.com / Admin123!")
  console.log("  Admin:       manager@tyotrack.com / Admin123!")
  console.log("  Employee:    employee@tyotrack.com / Employee123!")
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
