import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

// Public routes that don't require authentication
const publicRoutes = ["/login", "/register"]

// Routes by role - SUPER_ADMIN has limited access, ADMIN and MANAGER have full admin access
const roleRoutes: Record<string, string[]> = {
  SUPER_ADMIN: ["/admin"], // Only admin panel, limited view
  ADMIN: ["/admin", "/employee"],
  MANAGER: ["/admin", "/employee"],
  EMPLOYEE: ["/employee"],
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow all API routes - they handle their own auth
  if (pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Get session with error handling
  let session
  try {
    session = await auth()
  } catch (error) {
    console.error("[Middleware] Auth error:", error)
    // If auth fails, redirect to login
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // No session - redirect to login
  if (!session?.user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const { role } = session.user
  const allowedPaths = roleRoutes[role] || []

  // Super Admin restrictions - block access to sub-pages
  if (role === "SUPER_ADMIN") {
    // Allow /admin and /admin/settings only
    if (pathname.startsWith("/admin/employees") ||
        pathname.startsWith("/admin/approvals") ||
        pathname.startsWith("/admin/projects") ||
        pathname.startsWith("/admin/workplaces") ||
        pathname.startsWith("/admin/reports")) {
      return NextResponse.redirect(new URL("/admin", request.url))
    }
  }

  // Check if user has access to the route
  const hasAccess = allowedPaths.some((path) => pathname.startsWith(path))

  if (!hasAccess && pathname !== "/") {
    // Redirect to appropriate dashboard based on role
    const dashboardUrl = role === "EMPLOYEE" ? "/employee" : "/admin"
    return NextResponse.redirect(new URL(dashboardUrl, request.url))
  }

  // Root redirect based on role
  if (pathname === "/") {
    const dashboardUrl = role === "EMPLOYEE" ? "/employee" : "/admin"
    return NextResponse.redirect(new URL(dashboardUrl, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
}
