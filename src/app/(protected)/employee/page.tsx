"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns"
import {
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
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
  durationMinutes: number
  status: "PENDING" | "APPROVED" | "REJECTED"
  project?: { name: string; color: string }
  notes?: string
  isSplit: boolean
}

export default function EmployeeDashboardPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Pad with days from previous/next month
  const startDay = monthStart.getDay()
  const totalDays = [...Array(startDay).fill(null), ...days]

  useEffect(() => {
    fetchEntries()
  }, [currentMonth])

  async function fetchEntries() {
    setLoading(true)
    try {
      const start = format(monthStart, "yyyy-MM-dd")
      const end = format(monthEnd, "yyyy-MM-dd")
      const res = await fetch(`/api/time-entries?startDate=${start}&endDate=${end}`)
      const data = await res.json()
      setEntries(data.data || [])
    } catch (error) {
      console.error("Failed to fetch entries:", error)
    } finally {
      setLoading(false)
    }
  }

  function getEntriesForDay(date: Date) {
    return entries.filter((entry) =>
      isSameDay(new Date(entry.entryDate), date)
    )
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

  const stats = {
    totalHours: Math.round(entries.reduce((sum, e) => sum + e.durationMinutes, 0) / 60 * 10) / 10,
    daysWorked: new Set(entries.map((e) => e.entryDate)).size,
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
            <h1 className="text-2xl font-bold text-white">My Time Entries</h1>
            <p className="text-slate-400 mt-1">Track and manage your work hours</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Log Time
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-indigo-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalHours}h</p>
                  <p className="text-xs text-slate-500">This month</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.daysWorked}</p>
                  <p className="text-xs text-slate-500">Days worked</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.approved}</p>
                  <p className="text-xs text-slate-500">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-amber-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.pending}</p>
                  <p className="text-xs text-slate-500">Pending</p>
                </div>
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
                            {format(new Date(entry.startTime), "HH:mm")} - {format(new Date(entry.endTime), "HH:mm")}
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
        onSuccess={() => {
          setDialogOpen(false)
          fetchEntries()
        }}
      />
    </div>
  )
}
