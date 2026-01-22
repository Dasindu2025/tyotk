import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import prisma from "@/lib/prisma"
import type { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      emailVerified: Date | null
      role: UserRole
      workspaceId: string
      workspaceName: string
      firstName: string
      lastName: string
      employeeCode?: string
    }
  }

  interface User {
    id: string
    email: string
    role: UserRole
    workspaceId: string
    workspaceName: string
    firstName: string
    lastName: string
    employeeCode?: string
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required")
        }

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            workspace: true,
            profile: true,
          },
        })

        if (!user) {
          throw new Error("Invalid email or password")
        }

        if (!user.isActive) {
          throw new Error("Account is deactivated")
        }

        const isPasswordValid = await compare(password, user.passwordHash)

        if (!isPasswordValid) {
          throw new Error("Invalid email or password")
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          workspaceId: user.workspaceId,
          workspaceName: user.workspace.name,
          firstName: user.profile?.firstName ?? "",
          lastName: user.profile?.lastName ?? "",
          employeeCode: user.profile?.employeeCode,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.role = user.role
        token.workspaceId = user.workspaceId
        token.workspaceName = user.workspaceName
        token.firstName = user.firstName
        token.lastName = user.lastName
        token.employeeCode = user.employeeCode
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        id: token.id as string,
        email: token.email as string,
        emailVerified: null,
        role: token.role as UserRole,
        workspaceId: token.workspaceId as string,
        workspaceName: token.workspaceName as string,
        firstName: token.firstName as string,
        lastName: token.lastName as string,
        employeeCode: token.employeeCode as string | undefined,
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  trustHost: true,
})
