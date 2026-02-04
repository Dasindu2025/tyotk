"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users,
  Clock,
  CheckCircle2,
  TrendingUp,
  Calendar,
  AlertCircle,
  Plus,
  Building2,
  Loader2,
  UserPlus,
  Mail,
  Eye,
  EyeOff,
  Copy,
  X,
  KeyRound,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DashboardStats {
  totalEmployees: number
  pendingApprovals: number
  approvedToday: number
  rejectedToday: number
  totalHoursThisWeek: number
}

interface Admin {
  id: string
  email: string
  password: string
  firstName: string
  lastName: string
  workspaceName: string
  isActive: boolean
}

interface Organization {
  id: string
  name: string
  slug: string
  workspaces: {
    id: string
    name: string
    adminCount: number
    _count: { users: number }
  }[]
  createdAt: string
}

export default function AdminDashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    pendingApprovals: 0,
    approvedToday: 0,
    rejectedToday: 0,
    totalHoursThisWeek: 0,
  })
  const [recentEntries, setRecentEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"

  // Super Admin state
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [companyName, setCompanyName] = useState("")
  const [companySlug, setCompanySlug] = useState("")
  const [creating, setCreating] = useState(false)

  // Admin assignment state
  const [selectedCompanyId, setSelectedCompanyId] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [adminFirstName, setAdminFirstName] = useState("")
  const [adminLastName, setAdminLastName] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [assigning, setAssigning] = useState(false)

  // Company details modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Organization | null>(null)
  const [companyAdmins, setCompanyAdmins] = useState<Admin[]>([])
  const [loadingAdmins, setLoadingAdmins] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      if (isSuperAdmin) {
        // Fetch organizations for super admin
        const orgsRes = await fetch("/api/organizations")
        if (orgsRes.ok) {
          const orgsData = await orgsRes.json()
          setOrganizations(orgsData.data || [])
        }
      }

      const [employeesRes, approvalsRes] = await Promise.all([
        fetch("/api/employees?limit=1"),
        fetch("/api/approvals?status=PENDING&limit=5"),
      ])

      const employeesData = employeesRes.ok ? await employeesRes.json() : { pagination: { total: 0 } }
      const approvalsData = approvalsRes.ok ? await approvalsRes.json() : { pagination: { total: 0 }, data: [] }

      setStats({
        totalEmployees: employeesData.pagination?.total || 0,
        pendingApprovals: approvalsData.pagination?.total || 0,
        approvedToday: 0,
        rejectedToday: 0,
        totalHoursThisWeek: 0,
      })

      setRecentEntries(approvalsData.data || [])
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }, [isSuperAdmin])

  useEffect(() => {
    if (session) {
      fetchData()
    }
  }, [session, fetchData])

  // Auto-generate slug from name
  useEffect(() => {
    setCompanySlug(companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""))
  }, [companyName])

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName.trim() || !companySlug.trim()) {
      toast.error("Please enter company name and slug")
      return
    }

    setCreating(true)
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: companyName, slug: companySlug }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to create company")
        return
      }

      toast.success("Company created successfully!")
      setOrganizations([data.data, ...organizations])
      setCompanyName("")
      setCompanySlug("")
    } catch (error) {
      toast.error("Failed to create company")
    } finally {
      setCreating(false)
    }
  }

  async function handleAssignAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCompanyId || !adminEmail.trim() || !adminFirstName.trim() || !adminLastName.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    setAssigning(true)
    try {
      const res = await fetch(`/api/organizations/${selectedCompanyId}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail,
          firstName: adminFirstName,
          lastName: adminLastName,
          password: adminPassword || "Admin123!",
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to assign admin")
        return
      }

      toast.success(`Admin ${adminFirstName} ${adminLastName} assigned successfully!`)
      
      // Refresh organizations to update user counts
      const orgsRes = await fetch("/api/organizations")
      if (orgsRes.ok) {
        const orgsData = await orgsRes.json()
        setOrganizations(orgsData.data || [])
      }

      // Clear form
      setAdminEmail("")
      setAdminFirstName("")
      setAdminLastName("")
      setAdminPassword("")
      setSelectedCompanyId("")
    } catch (error) {
      toast.error("Failed to assign admin")
    } finally {
      setAssigning(false)
    }
  }

  async function handleViewCompanyDetails(org: Organization) {
    setSelectedCompany(org)
    setDetailsModalOpen(true)
    setLoadingAdmins(true)
    setShowPasswords(false)

    try {
      const res = await fetch(`/api/organizations/${org.id}/admins`)
      if (res.ok) {
        const data = await res.json()
        setCompanyAdmins(data.data || [])
      } else {
        setCompanyAdmins([])
        toast.error("Failed to load admins")
      }
    } catch (error) {
      setCompanyAdmins([])
      toast.error("Failed to load admins")
    } finally {
      setLoadingAdmins(false)
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }

  const statCards = useMemo(() => [
    {
      title: "Total Employees",
      value: stats.totalEmployees,
      icon: Users,
      color: "from-blue-600 to-cyan-600",
      shadowColor: "shadow-blue-500/25",
    },
    {
      title: "Pending Approvals",
      value: stats.pendingApprovals,
      icon: Clock,
      color: "from-amber-600 to-orange-600",
      shadowColor: "shadow-amber-500/25",
      urgent: stats.pendingApprovals > 0,
    },
    {
      title: "Approved Today",
      value: stats.approvedToday,
      icon: CheckCircle2,
      color: "from-emerald-600 to-green-600",
      shadowColor: "shadow-emerald-500/25",
    },
    {
      title: "Weekly Hours",
      value: `${stats.totalHoursThisWeek}h`,
      icon: TrendingUp,
      color: "from-indigo-600 to-purple-600",
      shadowColor: "shadow-indigo-500/25",
    },
  ], [stats])

  return (
    <div className="space-y-6">
      {/* Super Admin Dashboard */}
      {isSuperAdmin ? (
        <>
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-white">System Administration</h1>
            <p className="text-slate-400 mt-1">Manage companies and system administrators</p>
          </div>

          {/* Create Company Section */}
          <Card className="border-indigo-500/50 bg-indigo-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                Create New Company
              </CardTitle>
              <CardDescription>Add a new company to the system</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Company Name</label>
                    <input
                      type="text"
                      placeholder="Enter company name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={creating}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Company Slug</label>
                    <input
                      type="text"
                      placeholder="company-name"
                      value={companySlug}
                      onChange={(e) => setCompanySlug(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={creating}
                    />
                  </div>
                </div>
                <Button type="submit" className="gap-2" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Company
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Assign Admin Section */}
          <Card className="border-blue-500/50 bg-blue-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                Assign Company Admin
              </CardTitle>
              <CardDescription>Create and assign an admin user to a company</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAssignAdmin} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Select Company *</label>
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={assigning}
                    >
                      <option value="">-- Select a company --</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name} ({org.workspaces.reduce((sum, w) => sum + (w._count?.users || 0), 0)} users)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">First Name *</label>
                    <input
                      type="text"
                      placeholder="John"
                      value={adminFirstName}
                      onChange={(e) => setAdminFirstName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={assigning}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Last Name *</label>
                    <input
                      type="text"
                      placeholder="Doe"
                      value={adminLastName}
                      onChange={(e) => setAdminLastName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={assigning}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Email *</label>
                    <input
                      type="email"
                      placeholder="admin@company.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value.toLowerCase())}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={assigning}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Password (default: Admin123!)</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={assigning}
                    />
                  </div>
                </div>
                <Button type="submit" className="gap-2" disabled={assigning || !selectedCompanyId}>
                  {assigning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Assign Admin
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Companies List */}
          <Card>
            <CardHeader>
              <CardTitle>Companies</CardTitle>
              <CardDescription>Click on a company to view its admins and credentials ({organizations.length})</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-slate-800/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : organizations.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No companies registered yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {organizations.map((org) => (
                    <motion.div
                      key={org.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleViewCompanyDetails(org)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-indigo-500/50 cursor-pointer transition-colors group gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white group-hover:text-indigo-300 transition-colors truncate">{org.name}</p>
                          <p className="text-sm text-slate-500">/{org.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap pl-13 sm:pl-0">
                        <Badge variant="secondary">
                          {org.workspaces.reduce((sum, w) => sum + (w.adminCount || 0), 0)} admins
                        </Badge>
                        <Badge variant="outline">
                          {org.workspaces.reduce((sum, w) => sum + (w._count?.users || 0), 0)} users
                        </Badge>
                        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors hidden sm:block" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Company Details Modal */}
          <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  {selectedCompany?.name}
                </DialogTitle>
                <DialogDescription>
                  View all admins and their login credentials for this company
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Show/Hide Passwords Toggle */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    Admin Credentials
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="gap-2"
                  >
                    {showPasswords ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Hide Passwords
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Show Passwords
                      </>
                    )}
                  </Button>
                </div>

                {/* Admins List */}
                {loadingAdmins ? (
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="h-24 bg-slate-800/50 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : companyAdmins.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 bg-slate-800/30 rounded-lg">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No admins assigned to this company yet</p>
                    <p className="text-sm text-slate-500 mt-1">Use the "Assign Company Admin" form above to add one</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {companyAdmins.map((admin) => (
                      <div
                        key={admin.id}
                        className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-medium">
                            {admin.firstName?.[0]}{admin.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {admin.firstName} {admin.lastName}
                            </p>
                            <p className="text-xs text-slate-500">{admin.workspaceName}</p>
                          </div>
                          <Badge variant={admin.isActive ? "success" : "secondary"} className="ml-auto">
                            {admin.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>

                        {/* Credentials */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Email */}
                          <div className="flex items-center gap-2 p-2 rounded bg-slate-900/50">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-300 flex-1 font-mono">{admin.email}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => copyToClipboard(admin.email, "Email")}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </div>

                          {/* Password */}
                          <div className="flex items-center gap-2 p-2 rounded bg-slate-900/50">
                            <KeyRound className={`w-4 h-4 ${admin.password === "********" ? "text-slate-500" : "text-amber-400"}`} />
                            <span className={`text-sm flex-1 font-mono ${admin.password === "********" ? "text-slate-500 italic" : "text-slate-300"}`}>
                              {admin.password === "********" 
                                ? "Not available (seeded user)" 
                                : showPasswords 
                                  ? admin.password 
                                  : "••••••••"}
                            </span>
                            {admin.password !== "********" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => copyToClipboard(admin.password, "Password")}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <>
          {/* Regular Admin Dashboard */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              {session?.user?.organizationName && (
                <Badge variant="secondary" className="text-sm">
                  {session.user.organizationName}
                </Badge>
              )}
            </div>
            <p className="text-slate-400 mt-1">
              Workforce management overview
              {session?.user?.workspaceName && (
                <span className="ml-2 text-slate-500">• {session.user.workspaceName}</span>
              )}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="relative overflow-hidden card-hover">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-slate-400">{stat.title}</p>
                        <p className="text-3xl font-bold text-white mt-2">
                          {loading ? "..." : stat.value}
                        </p>
                      </div>
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg ${stat.shadowColor}`}
                      >
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    {stat.urgent && (
                      <Badge variant="warning" className="mt-3">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Needs attention
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Approvals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Recent Pending Entries
                </CardTitle>
                <CardDescription>Time entries awaiting approval</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-slate-800/50 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : recentEntries.length > 0 ? (
                  <div className="space-y-3">
                    {recentEntries.slice(0, 5).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 gap-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                            {entry.employee?.firstName?.[0]}{entry.employee?.lastName?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {entry.employee?.firstName} {entry.employee?.lastName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {entry.project?.name || "No project"} • {Math.round(entry.durationMinutes / 60 * 10) / 10}h
                            </p>
                          </div>
                        </div>
                        <Badge variant="warning" className="self-start sm:self-center">Pending</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No pending entries</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <a
                  href="/admin/employees"
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-indigo-500/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                    <span className="text-sm text-slate-300">Manage Employees</span>
                  </div>
                  <span className="text-xs text-slate-500">{stats.totalEmployees} total</span>
                </a>
                <a
                  href="/admin/approvals"
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-amber-500/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-slate-400 group-hover:text-amber-400 transition-colors" />
                    <span className="text-sm text-slate-300">Review Time Entries</span>
                  </div>
                  {stats.pendingApprovals > 0 && (
                    <Badge variant="warning">{stats.pendingApprovals} pending</Badge>
                  )}
                </a>
                <a
                  href="/admin/projects"
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-purple-500/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition-colors" />
                    <span className="text-sm text-slate-300">Manage Projects</span>
                  </div>
                </a>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
