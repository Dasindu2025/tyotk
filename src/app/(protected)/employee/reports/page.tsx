"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns"
import {
  BarChart3,
  Download,
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { formatMinutesToHours } from "@/lib/utils"

interface TimeEntry {
  id: string
  entryDate: string
  startTime: string
  endTime: string
  durationMinutes: number
  status: "PENDING" | "APPROVED" | "REJECTED"
  notes?: string
  project?: { name: string; projectCode: string; color: string }
  workplace?: { name: string; locationCode: string }
}

export default function EmployeeReportsPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"))
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [projectFilter, setProjectFilter] = useState<string>("")
  const [projects, setProjects] = useState<any[]>([])

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [startDate, endDate, statusFilter, projectFilter])

  async function fetchProjects() {
    const res = await fetch("/api/projects")
    const data = await res.json()
    setProjects(data.data || [])
  }

  async function fetchEntries() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("startDate", startDate)
      params.set("endDate", endDate)
      if (statusFilter) params.set("status", statusFilter)
      if (projectFilter) params.set("projectId", projectFilter)

      const res = await fetch(`/api/time-entries?${params}`)
      const data = await res.json()
      setEntries(data.data || [])
    } catch (error) {
      console.error("Failed to fetch entries:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate stats
  const stats = {
    totalHours: Math.round(entries.reduce((sum, e) => sum + e.durationMinutes, 0) / 60 * 10) / 10,
    totalEntries: entries.length,
    approved: entries.filter((e) => e.status === "APPROVED").length,
    pending: entries.filter((e) => e.status === "PENDING").length,
    rejected: entries.filter((e) => e.status === "REJECTED").length,
    approvedHours: Math.round(entries.filter(e => e.status === "APPROVED").reduce((sum, e) => sum + e.durationMinutes, 0) / 60 * 10) / 10,
  }

  // Group by project
  const hoursByProject = entries.reduce((acc, entry) => {
    const projectName = entry.project?.name || "No Project"
    acc[projectName] = (acc[projectName] || 0) + entry.durationMinutes
    return acc
  }, {} as Record<string, number>)

  function exportCSV() {
    const headers = ["Date", "Start", "End", "Duration", "Project", "Workplace", "Status", "Notes"]
    const rows = entries.map((e) => [
      format(new Date(e.entryDate), "yyyy-MM-dd"),
      format(new Date(e.startTime), "HH:mm"),
      format(new Date(e.endTime), "HH:mm"),
      formatMinutesToHours(e.durationMinutes),
      e.project?.name || "",
      e.workplace?.name || "",
      e.status,
      e.notes || "",
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `time-report-${startDate}-to-${endDate}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-400" />
              My Reports
            </h1>
            <p className="text-slate-400 mt-1">View and export your time entries</p>
          </div>
          <Button onClick={exportCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-slate-900/50">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-indigo-400" />
              <p className="text-2xl font-bold text-white">{stats.totalHours}h</p>
              <p className="text-xs text-slate-500">Total Hours</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50">
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <p className="text-2xl font-bold text-white">{stats.totalEntries}</p>
              <p className="text-xs text-slate-500">Entries</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
              <p className="text-2xl font-bold text-white">{stats.approved}</p>
              <p className="text-xs text-slate-500">Approved</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50">
            <CardContent className="p-4 text-center">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 text-amber-400" />
              <p className="text-2xl font-bold text-white">{stats.pending}</p>
              <p className="text-xs text-slate-500">Pending</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50">
            <CardContent className="p-4 text-center">
              <XCircle className="w-6 h-6 mx-auto mb-2 text-red-400" />
              <p className="text-2xl font-bold text-white">{stats.rejected}</p>
              <p className="text-xs text-slate-500">Rejected</p>
            </CardContent>
          </Card>
        </div>

        {/* Hours by Project */}
        {Object.keys(hoursByProject).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hours by Project</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(hoursByProject)
                  .sort(([, a], [, b]) => b - a)
                  .map(([project, minutes]) => {
                    const maxMinutes = Math.max(...Object.values(hoursByProject))
                    const percentage = (minutes / maxMinutes) * 100
                    return (
                      <div key={project}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-300">{project}</span>
                          <span className="text-slate-400">{formatMinutesToHours(minutes)}</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Time Entries</CardTitle>
            <CardDescription>
              {loading ? "Loading..." : `${entries.length} entries found`}
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
                      <th className="text-left py-3 px-2 text-slate-400 font-medium">Time</th>
                      <th className="text-left py-3 px-2 text-slate-400 font-medium">Duration</th>
                      <th className="text-left py-3 px-2 text-slate-400 font-medium">Project</th>
                      <th className="text-left py-3 px-2 text-slate-400 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="py-3 px-2 text-slate-300">
                          {format(new Date(entry.entryDate), "MMM d, yyyy")}
                        </td>
                        <td className="py-3 px-2 text-slate-300">
                          {format(new Date(entry.startTime), "HH:mm")} - {format(new Date(entry.endTime), "HH:mm")}
                        </td>
                        <td className="py-3 px-2 text-indigo-400 font-medium">
                          {formatMinutesToHours(entry.durationMinutes)}
                        </td>
                        <td className="py-3 px-2">
                          {entry.project ? (
                            <span className="flex items-center gap-1.5">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: entry.project.color }}
                              />
                              <span className="text-slate-300">{entry.project.name}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <Badge
                            variant={
                              entry.status === "APPROVED"
                                ? "success"
                                : entry.status === "REJECTED"
                                ? "destructive"
                                : "warning"
                            }
                          >
                            {entry.status.toLowerCase()}
                          </Badge>
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
    </div>
  )
}
