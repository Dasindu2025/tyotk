"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns"
import {
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sunset,
  Moon,
  User,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn, formatMinutesToHours } from "@/lib/utils"
import { TimeEntryDialog } from "@/components/time-entry-dialog"

interface TimeEntry {
  id: string
  entryDate: string
  startTime: string
  endTime: string
  startTimeFormatted?: string  // Pre-formatted IST time string from API
  endTimeFormatted?: string    // Pre-formatted IST time string from API
  durationMinutes: number
  status: "PENDING" | "APPROVED" | "REJECTED"
  project?: { name: string; color: string }
  notes?: string
  isSplit: boolean
}

export default function EmployeeDashboardPage() {
  const { data: session } = useSession()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [weeklyStats, setWeeklyStats] = useState({
    weekHours: 0,
    monthHours: 0,
    eveningHours: 0,
    nightHours: 0,
  })

  const employeeName = session?.user?.firstName && session?.user?.lastName
    ? `${session.user.firstName} ${session.user.lastName}`
    : session?.user?.email || "Employee"

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Pad with days from previous/next month
  const startDay = monthStart.getDay()
  const totalDays = [...Array(startDay).fill(null), ...days]

  useEffect(() => {
    fetchEntries()
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth])

  // Refresh stats when page becomes visible (e.g., when user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStats()
        fetchEntries()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth])

  // Poll for stats updates every 30 seconds (in case entries are approved by admin)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats()
    }, 30000) // Refresh every 30 seconds
    
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]) // Reset interval when month changes

  async function fetchEntries() {
    try {
      const start = format(monthStart, "yyyy-MM-dd")
      const end = format(monthEnd, "yyyy-MM-dd")
      console.log('[Employee Dashboard] Fetching entries for date range:', { start, end, currentMonth: format(currentMonth, "yyyy-MM") })
      const res = await fetch(`/api/time-entries?startDate=${start}&endDate=${end}`)
      const data = await res.json()
      console.log('[Employee Dashboard] Entries received:', data.data?.length || 0, 'entries')
      setEntries(data.data || [])
    } catch (error) {
      console.error("Failed to fetch entries:", error)
    }
  }

  async function fetchStats() {
    try {
      const start = format(monthStart, "yyyy-MM-dd")
      const end = format(monthEnd, "yyyy-MM-dd")
      
      // Add cache-busting and include date range for month-specific stats
      const res = await fetch(`/api/stats?startDate=${start}&endDate=${end}&t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      
      if (!res.ok) {
        console.error(`Stats API returned ${res.status}:`, await res.text())
        return
      }
      
      const data = await res.json()
      console.log('[Employee Dashboard] Stats received:', data)
      
      setWeeklyStats({
        weekHours: data.weekHours || 0,
        monthHours: data.monthHours || 0,
        eveningHours: data.eveningHours || 0,
        nightHours: data.nightHours || 0,
      })
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  function getEntriesForDay(date: Date) {
    // Format the selected date as YYYY-MM-DD for comparison
    const selectedDateStr = format(date, "yyyy-MM-dd")
    return entries.filter((entry) => {
      // entry.entryDate is already in YYYY-MM-DD format from the API
      return entry.entryDate === selectedDateStr
    })
  }

  function getDayStatus(dayEntries: TimeEntry[]) {
    if (dayEntries.length === 0) return null
    if (dayEntries.some((e) => e.status === "REJECTED")) return "rejected"
    if (dayEntries.some((e) => e.status === "PENDING")) return "pending"
    return "approved"
  }

  function getTotalMinutes(dayEntries: TimeEntry[]) {
    return dayEntries.reduce((sum, e) => sum + e.durationMinutes, 0)
  }

  // Calculate stats - only count approved entries
  const approvedEntries = entries.filter((e) => e.status === "APPROVED")
  
  const stats = {
    totalHours: Math.round(approvedEntries.reduce((sum, e) => sum + e.durationMinutes, 0) / 60 * 10) / 10,
    daysWorked: new Set(approvedEntries.map((e) => e.entryDate)).size,
    pending: entries.filter((e) => e.status === "PENDING").length,
    approved: entries.filter((e) => e.status === "APPROVED").length,
    rejected: entries.filter((e) => e.status === "REJECTED").length,
  }

  const selectedDayEntries = selectedDate ? getEntriesForDay(selectedDate) : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">My Time Entries</h1>
              {employeeName && (
                <Badge variant="secondary" className="text-sm flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {employeeName}
                </Badge>
              )}
            </div>
            <p className="text-slate-400 mt-1">
              Track and manage your work hours
              {session?.user?.employeeCode && (
                <span className="ml-2 text-slate-500">• {session.user.employeeCode}</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                fetchStats()
                fetchEntries()
              }}
              title="Refresh stats"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Log Time
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-indigo-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{weeklyStats.weekHours}h</p>
                  <p className="text-xs text-slate-500">This week</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{weeklyStats.monthHours}h</p>
                  <p className="text-xs text-slate-500">This month</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Sunset className="w-8 h-8 text-orange-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{weeklyStats.eveningHours}h</p>
                  <p className="text-xs text-slate-500">Evening hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Moon className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{weeklyStats.nightHours}h</p>
                  <p className="text-xs text-slate-500">Night hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats - Approval Status */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-slate-900/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-slate-400 text-sm">Approved:</span>
                <span className="text-white font-medium">{stats.approved}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <span className="text-slate-400 text-sm">Pending:</span>
                <span className="text-white font-medium">{stats.pending}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                <span className="text-slate-400 text-sm">Days worked:</span>
                <span className="text-white font-medium">{stats.daysWorked}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">
                {format(currentMonth, "MMMM yyyy")}
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-xs text-slate-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {totalDays.map((day, idx) => {
                  if (!day) {
                    return <div key={`empty-${idx}`} className="aspect-square" />
                  }

                  const dayEntries = getEntriesForDay(day)
                  const status = getDayStatus(dayEntries)
                  const totalMins = getTotalMinutes(dayEntries)
                  const isSelected = selectedDate && isSameDay(day, selectedDate)

                  return (
                    <motion.button
                      key={day.toISOString()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedDate(day)}
                      onDoubleClick={() => {
                        setSelectedDate(day)
                        setDialogOpen(true)
                      }}
                      className={cn(
                        "aspect-square rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 text-sm",
                        isToday(day) && "ring-2 ring-indigo-500",
                        isSelected
                          ? "bg-indigo-600/30 border-indigo-500"
                          : "border-slate-800 hover:border-slate-700 hover:bg-slate-800/50",
                        !isSameMonth(day, currentMonth) && "opacity-50"
                      )}
                    >
                      <span className={cn(
                        "font-medium",
                        isToday(day) ? "text-indigo-400" : "text-slate-300"
                      )}>
                        {format(day, "d")}
                      </span>
                      {totalMins > 0 && (
                        <span className="text-xs text-slate-500">
                          {formatMinutesToHours(totalMins)}
                        </span>
                      )}
                      {status && (
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          status === "approved" && "bg-emerald-500",
                          status === "pending" && "bg-amber-500",
                          status === "rejected" && "bg-red-500"
                        )} />
                      )}
                    </motion.button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Approved
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  Pending
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Rejected
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Day Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a day"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDate && selectedDayEntries.length > 0 ? (
                <div className="space-y-3">
                  {selectedDayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {(() => {
                              // Use pre-formatted IST time strings from API
                              // These are already converted from UTC to local IST by the backend
                              const startTimeStr = entry.startTimeFormatted || "00:00"
                              const endTimeStr = entry.endTimeFormatted || "00:00"
                              return `${startTimeStr} - ${endTimeStr}`
                            })()}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {formatMinutesToHours(entry.durationMinutes)}
                            {entry.isSplit && " (split)"}
                          </p>
                          {entry.project && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: entry.project.color }}
                              />
                              <span className="text-xs text-slate-300">{entry.project.name}</span>
                            </div>
                          )}
                        </div>
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
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-slate-500 mt-2 italic">{entry.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>{selectedDate ? "No entries for this day" : "Click a day to view details"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <TimeEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedDate={selectedDate}
        onSuccess={() => {
          setDialogOpen(false)
          fetchEntries()
          fetchStats() // Refresh stats to update week/month/evening/night hours
        }}
      />
    </div>
  )
}
