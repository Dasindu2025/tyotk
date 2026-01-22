import prisma from "@/lib/prisma"
import { EntityType } from "@prisma/client"

/**
 * Code Generator Service
 * 
 * Generates unique, sequential, immutable codes for entities:
 * - Employee: EMP001, EMP002, ...
 * - Project: PRO001, PRO002, ...
 * - Workplace: LOC001, LOC002, ...
 * 
 * IMPORTANT: Codes are generated within a database transaction
 * to ensure uniqueness and prevent race conditions.
 */

const CODE_PREFIXES: Record<EntityType, string> = {
  EMPLOYEE: "EMP",
  PROJECT: "PRO",
  WORKPLACE: "LOC",
}

const CODE_LENGTH = 3 // Number of digits (e.g., 001, 002)

function formatCode(prefix: string, number: number): string {
  return `${prefix}${String(number).padStart(CODE_LENGTH, "0")}`
}

/**
 * Generate next sequential code for an entity type within a workspace
 * This function MUST be called within a Prisma transaction
 */
export async function generateCode(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  workspaceId: string,
  entityType: EntityType
): Promise<string> {
  // Upsert the counter - create if doesn't exist, increment if exists
  const counter = await tx.codeCounter.upsert({
    where: {
      workspaceId_entityType: {
        workspaceId,
        entityType,
      },
    },
    create: {
      workspaceId,
      entityType,
      lastNumber: 1,
    },
    update: {
      lastNumber: {
        increment: 1,
      },
    },
  })

  const prefix = CODE_PREFIXES[entityType]
  return formatCode(prefix, counter.lastNumber)
}

/**
 * Wrapper to generate employee code with transaction
 */
export async function generateEmployeeCode(workspaceId: string): Promise<string> {
  return prisma.$transaction(async (tx) => {
    return generateCode(tx, workspaceId, EntityType.EMPLOYEE)
  })
}

/**
 * Wrapper to generate project code with transaction
 */
export async function generateProjectCode(workspaceId: string): Promise<string> {
  return prisma.$transaction(async (tx) => {
    return generateCode(tx, workspaceId, EntityType.PROJECT)
  })
}

/**
 * Wrapper to generate workplace code with transaction
 */
export async function generateWorkplaceCode(workspaceId: string): Promise<string> {
  return prisma.$transaction(async (tx) => {
    return generateCode(tx, workspaceId, EntityType.WORKPLACE)
  })
}

/**
 * Get current counter value for an entity type (for display purposes)
 */
export async function getCurrentCounter(
  workspaceId: string,
  entityType: EntityType
): Promise<number> {
  const counter = await prisma.codeCounter.findUnique({
    where: {
      workspaceId_entityType: {
        workspaceId,
        entityType,
      },
    },
  })
  return counter?.lastNumber ?? 0
}
