"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, isAfter, startOfDay } from "date-fns"
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sunset,
  Moon,
  User,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn, formatMinutesToHours } from "@/lib/utils"
import { TimeEntryDialog, type CreateTimeEntryPayload } from "@/components/time-entry-dialog"
import { toast } from "sonner" // Ensure toast is imported

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [weeklyStats, setWeeklyStats] = useState({
    weekHours: "0",
    monthHours: "0",
    eveningHours: "0",
    nightHours: "0"
  })
  // const [loading, setLoading] = useState(true) - Unused
  const [dialogOpen, setDialogOpen] = useState(false)
  
  // Ghost Click Prevention Lock
  const isLockedRef = useRef(false)

  // Wrapper to handle dialog open/close with locking
  const handleDialogOpenChange = (open: boolean) => {
    // If trying to close (open=false) but locked, ignore!
    if (!open && isLockedRef.current) {
      console.log("Ignored ghost close attempt (locked)")
      return
    }

    if (open) {
      isLockedRef.current = true
      // Lock for 500ms to prevent instant ghost-click closing
      setTimeout(() => {
        isLockedRef.current = false
      }, 500)
    }
    
    setDialogOpen(open)
  }
  
  // Employee name
  const employeeName = session?.user?.firstName && session?.user?.lastName
    ? `${session.user.firstName} ${session.user.lastName}`
    : session?.user?.email || "Employee"

  // Calendar calculations
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Pad with days from previous/next month
  const startDay = monthStart.getDay()
  const totalDays = [...Array(startDay).fill(null), ...days]



  // Fetch entries when component mounts or when visibility changes (user returns to tab)
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
    // daysWorked removed per user request
    pending: entries.filter((e) => e.status === "PENDING").length,
    approved: entries.filter((e) => e.status === "APPROVED").length,
    rejected: entries.filter((e) => e.status === "REJECTED").length,
  }

  const selectedDayEntries = selectedDate ? getEntriesForDay(selectedDate) : []

  async function handleSaveTimeEntry(payload: CreateTimeEntryPayload) {
    // 1. Snapshot previous state for rollback
    const previousEntries = [...entries]

    // 2. Create Optimistic Entry
    const tempId = `temp-${Date.now()}`
    const startObj = new Date(payload.startTime)
    const endObj = new Date(payload.endTime)
    const durationMinutes = Math.round((endObj.getTime() - startObj.getTime()) / 60000)

    const optimisticEntry: TimeEntry = {
      id: tempId,
      entryDate: payload.entryDate,
      startTime: payload.startTime,
      endTime: payload.endTime,
      startTimeFormatted: payload.startTime.split("T")[1].substring(0, 5),
      endTimeFormatted: payload.endTime.split("T")[1].substring(0, 5),
      durationMinutes,
      status: "PENDING",
      project: payload.project ? { name: payload.project.name, color: payload.project.color || "#ccc" } : undefined,
      notes: payload.notes,
      isSplit: payload.crossesMidnight
    }

    // 3. Optimistic Update (Zero Latency)
    // Add to state immediately
    setEntries(prev => [...prev, optimisticEntry])
    // Do not close dialog allowing rapid entry
    setDialogOpen(false)

    try {
      // 4. Network Request
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create entry")
      }

      // 5. Success Sync
      setEntries(prev => {
        const filtered = prev.filter(e => e.id !== tempId)
        const newEntries = data.entries || []
        return [...filtered, ...newEntries]
      })
      
      toast.success(data.message || "Time entry created")
      fetchStats()
    } catch (error: any) {
      console.error("Save failed, rolling back:", error)
      toast.error(error.message || "Failed to save. Changes reverted.")
      setEntries(previousEntries)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-3 lg:p-4">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Header - Compact */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">My Time Entries</h1>
              {employeeName && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {employeeName}
                </Badge>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-0.5">
              Track and manage your work hours
              {session?.user?.employeeCode && (
                <span className="ml-2 text-slate-500">• {session.user.employeeCode}</span>
              )}
            </p>
          </div>

        </div>

        {/* Stats - More Compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-slate-900/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Clock className="w-6 h-6 text-indigo-400" />
                <div>
                  <p className="text-xl font-bold text-white">{weeklyStats.weekHours}h</p>
                  <p className="text-xs text-slate-500">This week</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-6 h-6 text-purple-400" />
                <div>
                  <p className="text-xl font-bold text-white">{weeklyStats.monthHours}h</p>
                  <p className="text-xs text-slate-500">This month</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Sunset className="w-6 h-6 text-orange-400" />
                <div>
                  <p className="text-xl font-bold text-white">{weeklyStats.eveningHours}h</p>
                  <p className="text-xs text-slate-500">Evening</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Moon className="w-6 h-6 text-blue-400" />
                <div>
                  <p className="text-xl font-bold text-white">{weeklyStats.nightHours}h</p>
                  <p className="text-xs text-slate-500">Night</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats - Approval Status */}
        {/* Secondary Stats - Approval Status - Centered & Flexible */}
        <div className="flex flex-wrap justify-center gap-4">
          <Card className="bg-slate-900/30 min-w-[140px] flex-1 max-w-[220px]">
            <CardContent className="p-3 flex items-center justify-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="flex flex-col items-start leading-none">
                <span className="text-slate-400 text-xs uppercase tracking-wide">Approved</span>
                <span className="text-white font-bold text-lg">{stats.approved}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/30 min-w-[140px] flex-1 max-w-[220px]">
            <CardContent className="p-3 flex items-center justify-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="flex flex-col items-start leading-none">
                <span className="text-slate-400 text-xs uppercase tracking-wide">Pending</span>
                <span className="text-white font-bold text-lg">{stats.pending}</span>
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

                  return (
                    <CalendarDay
                      key={day.toISOString()}
                      day={day}
                      currentMonth={currentMonth}
                      isSelected={!!(selectedDate && isSameDay(day, selectedDate))}
                      isToday={isToday(day)}
                      status={getDayStatus(getEntriesForDay(day))}
                      totalMins={getTotalMinutes(getEntriesForDay(day))}
                      onSelect={(d) => setSelectedDate(d)}
                      onDoubleTap={(d) => {
                        setSelectedDate(d)
                        handleDialogOpenChange(true)
                      }}
                    />
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
        onOpenChange={handleDialogOpenChange}
        selectedDate={selectedDate}
        onSave={handleSaveTimeEntry}
      />
    </div>
  )
}

interface CalendarDayProps {
  day: Date
  currentMonth: Date
  isSelected: boolean
  isToday: boolean
  status: string | null
  totalMins: number
  onSelect: (day: Date) => void
  onDoubleTap: (day: Date) => void
}

function CalendarDay({
  day,
  currentMonth,
  isSelected,
  isToday,
  status,
  totalMins,
  onSelect,
  onDoubleTap,
}: CalendarDayProps) {
  const lastTapRef = useRef<number>(0)

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Prevent default browser behavior to stop ghost clicks and zoom
    // However, we must allow some events if we want standard scrolling.
    // CSS 'touch-action: manipulation' handles zoom/scroll blocking.
    
    // We only preventDefault if it IS a double tap, to stop the zoom.
    
    const now = Date.now()
    const lastTap = lastTapRef.current
    
    if (now - lastTap < 300) {
      e.preventDefault() // Stop Zoom & Stop Ghost Click
      onDoubleTap(day)
    } else {
      // First tap 
      onSelect(day)
    }
    
    lastTapRef.current = now
  }

  // Double Click is strictly for Desktop.
  // On Mobile, we rely SOLELY on onTouchEnd for double-taps.
  // We keep onDoubleClick for desktop users.

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      // Standard Click for Desktop
      onClick={() => onSelect(day)}
      // Double Click for Desktop
      onDoubleClick={(e) => {
        e.preventDefault()
        onDoubleTap(day)
      }}
      // Custom Touch Logic for Mobile (Android/iOS)
      onTouchEnd={handleTouchEnd}
      className={cn(
        "aspect-square rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 text-sm select-none",
        // Crucial for mobile: disables double-tap zoom at browser level, enabling our custom logic
        "touch-manipulation", 
        isToday && "ring-2 ring-indigo-500",
        isSelected
          ? "bg-indigo-600/30 border-indigo-500"
          : "border-slate-800 hover:border-slate-700 hover:bg-slate-800/50",
        !isSameMonth(day, currentMonth) && "opacity-50",
        // Future Date Logic
        isAfter(day, startOfDay(new Date())) && "opacity-30 pointer-events-none cursor-not-allowed bg-slate-900/20 border-slate-900",
      )}
    >
      <span className={cn(
        "font-medium",
        isToday ? "text-indigo-400" : "text-slate-300"
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
}
