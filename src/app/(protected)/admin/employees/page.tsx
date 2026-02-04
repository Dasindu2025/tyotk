"use client"

import { useState, useEffect, useMemo, useCallback, memo } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Users,
  Plus,
  Search,
  Mail,
  Key,
  Loader2,
  Copy,
  Eye,
  EyeOff,
  Settings,
  Calendar,
  Save,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useDebounce } from "@/hooks/use-debounce"
import { TableSkeleton } from "@/components/loading-skeletons"

interface Employee {
  id: string
  email: string
  password: string
  role: string
  isActive: boolean
  employeeCode: string
  firstName: string
  lastName: string
  createdAt: string
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)

  // Settings dialog state
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [settingsForm, setSettingsForm] = useState({
    newPassword: "",
    backdateLimit: 7,
    autoApprove: false,
    isActive: true,
  })
  const [savingSettings, setSavingSettings] = useState(false)

  // Simplified form state - only required fields
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  })

  // Debounce search to reduce API calls
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    fetchEmployees()
  }, [debouncedSearch, statusFilter])

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (statusFilter !== "all") params.set("status", statusFilter)
      
      const res = await fetch(`/api/employees?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEmployees(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error)
      toast.error("Failed to load employees")
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter])

  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to create employee")
      }
      
      toast.success(
        <div>
          <p className="font-semibold">Employee created!</p>
          <p className="text-sm">Email: {data.email}</p>
          <p className="text-sm">Password: {data.password}</p>
        </div>,
        { duration: 10000 }
      )
      setDialogOpen(false)
      setFormData({ email: "", password: "", firstName: "", lastName: "" })
      fetchEmployees()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setCreating(false)
    }
  }

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }, [])

  async function openSettingsDialog(employee: Employee) {
    setSelectedEmployee(employee)
    setSettingsForm({ newPassword: "", backdateLimit: 7, autoApprove: false, isActive: employee.isActive })
    
    // Fetch current settings
    try {
      const res = await fetch(`/api/employees/${employee.id}/settings`)
      if (res.ok) {
        const data = await res.json()
        setSettingsForm(prev => ({ 
          ...prev, 
          backdateLimit: data.backdateLimit || 7,
          autoApprove: data.autoApprove || false,
          isActive: data.isActive ?? true,
        }))
      }
    } catch (error) {
      console.error("Failed to fetch employee settings:", error)
    }
    
    setSettingsDialogOpen(true)
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEmployee) return

    setSavingSettings(true)
    
    try {
      const updateData: any = {}
      
      // Only include fields that have values
      if (settingsForm.newPassword.trim()) {
        updateData.newPassword = settingsForm.newPassword
      }
      updateData.backdateLimit = settingsForm.backdateLimit
      updateData.autoApprove = settingsForm.autoApprove
      updateData.isActive = settingsForm.isActive

      const res = await fetch(`/api/employees/${selectedEmployee.id}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to update settings")
      }

      toast.success(
        settingsForm.newPassword.trim() 
          ? "Password and settings updated!" 
          : "Settings updated!"
      )
      setSettingsDialogOpen(false)
      fetchEmployees()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Employee Management
          </h1>
          <p className="text-slate-400 mt-1">
            Manage employees and view their credentials
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowPasswords(!showPasswords)}
            className="gap-2"
          >
            {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPasswords ? "Hide" : "Show"} Passwords
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {(["all", "active", "inactive"] as const).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className="capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
          <CardDescription>
            {loading ? "Loading..." : `${employees.length} employees found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={5} />
          ) : employees.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No employees found</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add your first employee
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {employees.map((employee, index) => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  index={index}
                  showPasswords={showPasswords}
                  onCopy={copyToClipboard}
                  onSettingsClick={openSettingsDialog}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Employee Dialog - Simplified */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Create a new employee account. Code will be auto-generated.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateEmployee} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="text"
                placeholder="Enter password (min 6 characters)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
              <p className="text-xs text-slate-500">Password will be visible to admins</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Employee"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Employee Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-400" />
              Employee Settings
            </DialogTitle>
            <DialogDescription>
              {selectedEmployee && (
                <span>
                  Manage settings for <strong>{selectedEmployee.firstName} {selectedEmployee.lastName}</strong> ({selectedEmployee.employeeCode})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSaveSettings} className="space-y-4">
            {/* Change Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-400" />
                New Password
              </Label>
              <Input
                id="newPassword"
                type="text"
                placeholder="Leave empty to keep current password"
                value={settingsForm.newPassword}
                onChange={(e) => setSettingsForm({ ...settingsForm, newPassword: e.target.value })}
              />
              <p className="text-xs text-slate-500">Enter a new password (min 6 characters) or leave empty</p>
            </div>

            {/* Backdate Limit */}
            <div className="space-y-2">
              <Label htmlFor="backdateLimit" className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                Backdate Limit (Days)
              </Label>
              <Input
                id="backdateLimit"
                type="number"
                min={0}
                max={365}
                value={settingsForm.backdateLimit}
                onChange={(e) => setSettingsForm({ ...settingsForm, backdateLimit: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-slate-500">
                How many days back can this employee create time entries (0-365)
              </p>
            </div>

            {/* Auto Approve Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-white">Auto-Approve Entries</p>
                  <p className="text-xs text-slate-500">Skip manual approval for this employee</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettingsForm({ ...settingsForm, autoApprove: !settingsForm.autoApprove })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settingsForm.autoApprove ? 'bg-emerald-600' : 'bg-slate-700'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settingsForm.autoApprove ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Active Status Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
              <div className="flex items-center gap-2">
                {settingsForm.isActive ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-white">Active Status</p>
                  <p className="text-xs text-slate-500">Inactive employees cannot log time</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettingsForm({ ...settingsForm, isActive: !settingsForm.isActive })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settingsForm.isActive ? 'bg-emerald-600' : 'bg-slate-700'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settingsForm.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSettingsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingSettings}>
                {savingSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Memoized Employee Card Component for better performance
const EmployeeCard = memo(function EmployeeCard({
  employee,
  index,
  showPasswords,
  onCopy,
  onSettingsClick,
}: {
  employee: Employee
  index: number
  showPasswords: boolean
  onCopy: (text: string, label: string) => void
  onSettingsClick: (employee: Employee) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-medium flex-shrink-0">
            {employee.firstName?.[0]}{employee.lastName?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-white">
                {employee.firstName} {employee.lastName}
              </p>
              <Badge variant="secondary" className="text-xs">
                {employee.employeeCode}
              </Badge>
              <Badge
                variant={employee.isActive ? "success" : "destructive"}
                className="text-xs"
              >
                {employee.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            
            {/* Credentials */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-3 h-3 text-slate-500 flex-shrink-0" />
                <span className="text-slate-300 truncate">{employee.email}</span>
                <button
                  onClick={() => onCopy(employee.email, "Email")}
                  className="text-slate-500 hover:text-slate-300 flex-shrink-0"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Key className="w-3 h-3 text-slate-500 flex-shrink-0" />
                <span className="text-slate-300 font-mono">
                  {showPasswords ? employee.password : "••••••••"}
                </span>
                {showPasswords && (
                  <button
                    onClick={() => onCopy(employee.password, "Password")}
                    className="text-slate-500 hover:text-slate-300 flex-shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Settings Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSettingsClick(employee)}
          className="gap-2 w-full sm:w-auto mt-2 sm:mt-0"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Button>
      </div>
    </motion.div>
  )
})
