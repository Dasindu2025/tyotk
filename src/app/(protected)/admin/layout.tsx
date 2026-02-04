"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  Users,
  FileCheck,
  FolderKanban,
  MapPin,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Clock,
  ChevronRight,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const adminNavigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Employees", href: "/admin/employees", icon: Users },
  { name: "Approvals", href: "/admin/approvals", icon: FileCheck },
  { name: "Projects", href: "/admin/projects", icon: FolderKanban },
  { name: "Workspaces", href: "/admin/workspaces", icon: Layers },
  { name: "Workplaces", href: "/admin/workplaces", icon: MapPin },
  { name: "Reports", href: "/admin/reports", icon: BarChart3 },
  { name: "Settings", href: "/admin/settings", icon: Settings },
]

const superAdminNavigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Settings", href: "/admin/settings", icon: Settings },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"
  const navigation = isSuperAdmin ? superAdminNavigation : adminNavigation

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col glass border-r border-slate-800/50">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 px-6 border-b border-slate-800/50">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">TyoTrack</h1>
              <p className="text-xs text-slate-500">Admin Panel</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto lg:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-white border border-indigo-500/30"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                      )}
                    >
                      <item.icon className={cn("w-5 h-5", isActive && "text-indigo-400")} />
                      {item.name}
                      {isActive && (
                        <ChevronRight className="w-4 h-4 ml-auto text-indigo-400" />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-slate-800/50">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                {session?.user?.firstName?.[0] || "A"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {session?.user?.firstName} {session?.user?.lastName}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {session?.user?.role?.replace("_", " ")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-slate-400 hover:text-red-400"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 glass border-b border-slate-800/50 px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-slate-400">
            {session?.user?.organizationName && (
              <span className="hidden sm:inline font-medium text-slate-300">
                {session.user.organizationName}
              </span>
            )}
            {session?.user?.workspaceName && (
              <span className="hidden sm:inline">
                {session.user.organizationName ? "•" : ""} {session.user.workspaceName}
              </span>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
