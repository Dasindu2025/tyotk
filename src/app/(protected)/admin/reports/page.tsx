"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { format, startOfMonth, endOfMonth } from "date-fns"
import {
  BarChart3,
  Users,
  Clock,
  CheckCircle,
  TrendingUp,
  Calendar,
  Download,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { formatMinutesToHours } from "@/lib/utils"

interface ReportStats {
  totalHours: number
  totalEntries: number
  approvedHours: number
  pendingEntries: number
  employeesActive: number
}

interface EmployeeSummary {
  employeeCode: string
  firstName: string
  lastName: string
  totalMinutes: number
  approvedMinutes: number
  pendingCount: number
}

export default function AdminReportsPage() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"))
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  async function fetchData() {
    setLoading(true)
    try {
      const [entriesRes, employeesRes] = await Promise.all([
        fetch(`/api/time-entries?startDate=${startDate}&endDate=${endDate}&limit=1000`),
        fetch("/api/employees?limit=1000"),
      ])

      const entriesData = await entriesRes.json()
      const employeesData = await employeesRes.json()

      setEntries(entriesData.data || [])
      setEmployees(employeesData.data || [])
    } catch (error) {
      console.error("Failed to fetch report data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate stats
  const stats: ReportStats = {
    totalHours: Math.round(entries.reduce((sum, e) => sum + e.durationMinutes, 0) / 60 * 10) / 10,
    totalEntries: entries.length,
    approvedHours: Math.round(entries.filter(e => e.status === "APPROVED").reduce((sum, e) => sum + e.durationMinutes, 0) / 60 * 10) / 10,
    pendingEntries: entries.filter(e => e.status === "PENDING").length,
    employeesActive: new Set(entries.map(e => e.user?.id)).size,
  }

  // Group by employee
  const employeeSummaries: EmployeeSummary[] = employees.map((emp) => {
    const empEntries = entries.filter((e) => e.user?.id === emp.id)
    return {
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      totalMinutes: empEntries.reduce((sum, e) => sum + e.durationMinutes, 0),
      approvedMinutes: empEntries.filter(e => e.status === "APPROVED").reduce((sum, e) => sum + e.durationMinutes, 0),
      pendingCount: empEntries.filter(e => e.status === "PENDING").length,
    }
  }).filter(e => e.totalMinutes > 0).sort((a, b) => b.totalMinutes - a.totalMinutes)

  function exportCSV() {
    const headers = ["Employee Code", "Name", "Total Hours", "Approved Hours", "Pending Entries"]
    const rows = employeeSummaries.map((e) => [
      e.employeeCode,
      `${e.firstName} ${e.lastName}`,
      (e.totalMinutes / 60).toFixed(1),
      (e.approvedMinutes / 60).toFixed(1),
      e.pendingCount,
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `team-report-${startDate}-to-${endDate}.csv`
    a.click()
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
        <Button onClick={exportCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Summary
        </Button>
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
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
            <p className="text-2xl font-bold text-white">{stats.approvedHours}h</p>
            <p className="text-xs text-slate-500">Approved</p>
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
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-amber-400" />
            <p className="text-2xl font-bold text-white">{stats.pendingEntries}</p>
            <p className="text-xs text-slate-500">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
            <p className="text-2xl font-bold text-white">{stats.employeesActive}</p>
            <p className="text-xs text-slate-500">Active Employees</p>
          </CardContent>
        </Card>
      </div>

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
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">Approved</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeSummaries.map((emp) => (
                    <tr key={emp.employeeCode} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                          </div>
                          <span className="text-white">{emp.firstName} {emp.lastName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="secondary">{emp.employeeCode}</Badge>
                      </td>
                      <td className="py-3 px-2 text-right text-indigo-400 font-medium">
                        {formatMinutesToHours(emp.totalMinutes)}
                      </td>
                      <td className="py-3 px-2 text-right text-emerald-400">
                        {formatMinutesToHours(emp.approvedMinutes)}
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
