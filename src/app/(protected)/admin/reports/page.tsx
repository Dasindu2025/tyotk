"use client"

import { useEffect, useState } from "react"
import { format, startOfMonth, endOfMonth } from "date-fns"
import {
  BarChart3,
  Users,
  Clock,
  CheckCircle,
  TrendingUp,
  Calendar,
  Download,
  FileSpreadsheet,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface ReportEntry {
  id: string
  date: string
  timeIn: string
  timeOut: string
  totalHours: string
  dayHours: string
  eveningHours: string
  nightHours: string
  status: string
  project: { name: string; projectCode: string } | null
  employee: {
    employeeCode: string
    firstName: string
    lastName: string
    fullName: string
  }
}

interface ReportSummary {
  totalHours: string
  approvedHours: string
  totalEntries: number
  pendingEntries: number
  activeEmployees: number
}

interface EmployeeSummary {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  fullName: string
  totalMinutes: number
  approvedMinutes: number
  pendingCount: number
  dayMinutes: number
  eveningMinutes: number
  nightMinutes: number
}

export default function AdminReportsPage() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"))
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<ReportEntry[]>([])
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [employeeSummaries, setEmployeeSummaries] = useState<EmployeeSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports?startDate=${startDate}&endDate=${endDate}`)
      
      if (!res.ok) {
        throw new Error("Failed to fetch reports")
      }

      const data = await res.json()
      console.log("[Reports Page] Data received:", data)

      setEntries(data.entries || [])
      setSummary(data.summary || null)
      setEmployeeSummaries(data.employeeSummary || [])
    } catch (error) {
      console.error("Failed to fetch report data:", error)
      setError("Failed to load report data")
    } finally {
      setLoading(false)
    }
  }

  // Export to Excel/CSV with detailed format
  function exportToExcel() {
    // Headers matching user's request: date, project, time in, time out, total hours, evening hours, night hours
    const headers = ["Date", "Employee", "Employee Code", "Project", "Time In", "Time Out", "Total Hours", "Day Hours", "Evening Hours", "Night Hours", "Status"]
    
    const rows = entries.map((e) => [
      e.date,
      e.employee.fullName,
      e.employee.employeeCode,
      e.project?.name || "No Project",
      e.timeIn,
      e.timeOut,
      e.totalHours,
      e.dayHours,
      e.eveningHours,
      e.nightHours,
      e.status
    ])

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `time-report-${startDate}-to-${endDate}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Export summary by employee
  function exportSummary() {
    const headers = ["Employee Code", "Name", "Total Hours", "Day Hours", "Evening Hours", "Night Hours", "Pending Entries"]
    
    const rows = employeeSummaries.map((e) => [
      e.employeeCode,
      e.fullName,
      (e.totalMinutes / 60).toFixed(1),
      (e.dayMinutes / 60).toFixed(1),
      (e.eveningMinutes / 60).toFixed(1),
      (e.nightMinutes / 60).toFixed(1),
      e.pendingCount
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `employee-summary-${startDate}-to-${endDate}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            Team Reports
          </h1>
          <p className="text-slate-400 mt-1">Overview of team time tracking</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToExcel} variant="outline" className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Export Detailed
          </Button>
          <Button onClick={exportSummary} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Summary
          </Button>
        </div>
      </div>

      {/* Date Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-slate-900/50">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-indigo-400" />
            <p className="text-2xl font-bold text-white">{summary?.totalHours || 0}h</p>
            <p className="text-xs text-slate-500">Total Hours</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
            <p className="text-2xl font-bold text-white">{summary?.approvedHours || 0}h</p>
            <p className="text-xs text-slate-500">Approved</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50">
          <CardContent className="p-4 text-center">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-purple-400" />
            <p className="text-2xl font-bold text-white">{summary?.totalEntries || 0}</p>
            <p className="text-xs text-slate-500">Entries</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-amber-400" />
            <p className="text-2xl font-bold text-white">{summary?.pendingEntries || 0}</p>
            <p className="text-xs text-slate-500">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
            <p className="text-2xl font-bold text-white">{summary?.activeEmployees || 0}</p>
            <p className="text-xs text-slate-500">Active Employees</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Time Entries</CardTitle>
          <CardDescription>
            {loading ? "Loading..." : `${entries.length} entries in date range`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-800/50 rounded animate-pulse" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No entries found for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-3 px-2 text-slate-400 font-medium">Date</th>
                    <th className="text-left py-3 px-2 text-slate-400 font-medium">Employee</th>
                    <th className="text-left py-3 px-2 text-slate-400 font-medium">Project</th>
                    <th className="text-center py-3 px-2 text-slate-400 font-medium">Time In</th>
                    <th className="text-center py-3 px-2 text-slate-400 font-medium">Time Out</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">Total</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">Day</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">Evening</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">Night</th>
                    <th className="text-center py-3 px-2 text-slate-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.slice(0, 50).map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-3 px-2 text-white">{entry.date}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs">
                            {entry.employee.firstName?.[0]}{entry.employee.lastName?.[0]}
                          </div>
                          <span className="text-white">{entry.employee.fullName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-slate-300">{entry.project?.name || "-"}</td>
                      <td className="py-3 px-2 text-center text-emerald-400">{entry.timeIn}</td>
                      <td className="py-3 px-2 text-center text-red-400">{entry.timeOut}</td>
                      <td className="py-3 px-2 text-right text-indigo-400 font-medium">{entry.totalHours}h</td>
                      <td className="py-3 px-2 text-right text-yellow-400">{entry.dayHours}h</td>
                      <td className="py-3 px-2 text-right text-orange-400">{entry.eveningHours}h</td>
                      <td className="py-3 px-2 text-right text-blue-400">{entry.nightHours}h</td>
                      <td className="py-3 px-2 text-center">
                        <Badge variant={entry.status === "APPROVED" ? "success" : entry.status === "REJECTED" ? "destructive" : "warning"}>
                          {entry.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {entries.length > 50 && (
                <p className="text-center text-slate-500 py-4">Showing first 50 entries. Export to see all.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Summary</CardTitle>
          <CardDescription>
            {loading ? "Loading..." : `${employeeSummaries.length} employees with entries`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-800/50 rounded animate-pulse" />
              ))}
            </div>
          ) : employeeSummaries.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No entries found for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-3 px-2 text-slate-400 font-medium">Employee</th>
                    <th className="text-left py-3 px-2 text-slate-400 font-medium">Code</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">Total Hours</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">Day Hours</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">Evening Hours</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">Night Hours</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeSummaries.map((emp) => (
                    <tr key={emp.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                          </div>
                          <span className="text-white">{emp.fullName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="secondary">{emp.employeeCode}</Badge>
                      </td>
                      <td className="py-3 px-2 text-right text-indigo-400 font-medium">
                        {formatHours(emp.totalMinutes)}
                      </td>
                      <td className="py-3 px-2 text-right text-yellow-400">
                        {formatHours(emp.dayMinutes)}
                      </td>
                      <td className="py-3 px-2 text-right text-orange-400">
                        {formatHours(emp.eveningMinutes)}
                      </td>
                      <td className="py-3 px-2 text-right text-blue-400">
                        {formatHours(emp.nightMinutes)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {emp.pendingCount > 0 ? (
                          <Badge variant="warning">{emp.pendingCount}</Badge>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
