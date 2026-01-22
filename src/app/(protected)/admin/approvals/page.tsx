"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  CheckCheck,
  X,
  Loader2,
  AlertTriangle,
  User,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn, formatMinutesToHours } from "@/lib/utils"

interface TimeEntry {
  id: string
  entryDate: string
  startTime: string
  endTime: string
  durationMinutes: number
  status: "PENDING" | "APPROVED" | "REJECTED"
  notes?: string
  isSplit: boolean
  project?: {
    id: string
    projectCode: string
    name: string
    color: string
  }
  workplace?: {
    id: string
    locationCode: string
    name: string
  }
  employee: {
    id: string
    email: string
    employeeCode: string
    firstName: string
    lastName: string
  }
  createdAt: string
}

export default function ApprovalsPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING")
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set())
  const [processing, setProcessing] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [entryToReject, setEntryToReject] = useState<string | null>(null)

  useEffect(() => {
    fetchEntries()
  }, [statusFilter])

  async function fetchEntries() {
    setLoading(true)
    try {
      const res = await fetch(`/api/approvals?status=${statusFilter}`)
      const data = await res.json()
      setEntries(data.data || [])
      setSelectedEntries(new Set())
    } catch (error) {
      console.error("Failed to fetch entries:", error)
      toast.error("Failed to load time entries")
    } finally {
      setLoading(false)
    }
  }

  async function handleApproval(entryIds: string[], action: "approve" | "reject", reason?: string) {
    setProcessing(true)
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryIds,
          action,
          rejectionReason: reason,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to process approval")
      }

      toast.success(data.message)
      fetchEntries()
      setRejectDialogOpen(false)
      setRejectReason("")
      setEntryToReject(null)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setProcessing(false)
    }
  }

  function toggleSelectAll() {
    if (selectedEntries.size === entries.filter(e => e.status === "PENDING").length) {
      setSelectedEntries(new Set())
    } else {
      setSelectedEntries(new Set(entries.filter(e => e.status === "PENDING").map(e => e.id)))
    }
  }

  function toggleSelect(id: string) {
    const newSelected = new Set(selectedEntries)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedEntries(newSelected)
  }

  const pendingCount = entries.filter(e => e.status === "PENDING").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-400" />
            Time Entry Approvals
          </h1>
          <p className="text-slate-400 mt-1">
            Review and approve employee time entries
          </p>
        </div>
        
        {selectedEntries.size > 0 && (
          <div className="flex gap-2">
            <Button
              variant="success"
              onClick={() => handleApproval(Array.from(selectedEntries), "approve")}
              disabled={processing}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCheck className="w-4 h-4 mr-2" />}
              Approve Selected ({selectedEntries.size})
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setEntryToReject(null)
                setRejectDialogOpen(true)
              }}
              disabled={processing}
            >
              <X className="w-4 h-4 mr-2" />
              Reject Selected
            </Button>
          </div>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status === "PENDING" && <Clock className="w-4 h-4 mr-1 text-amber-400" />}
            {status === "APPROVED" && <CheckCircle className="w-4 h-4 mr-1 text-emerald-400" />}
            {status === "REJECTED" && <XCircle className="w-4 h-4 mr-1 text-red-400" />}
            {status.charAt(0) + status.slice(1).toLowerCase()}
            {status === "PENDING" && pendingCount > 0 && (
              <Badge variant="warning" className="ml-2">{pendingCount}</Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Entries List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Time Entries</CardTitle>
            <CardDescription>
              {loading ? "Loading..." : `${entries.length} entries`}
            </CardDescription>
          </div>
          {statusFilter === "PENDING" && entries.length > 0 && (
            <Button variant="outline" size="sm" onClick={toggleSelectAll}>
              {selectedEntries.size === pendingCount ? "Deselect All" : "Select All"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-800/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No entries to review</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border transition-all",
                    selectedEntries.has(entry.id)
                      ? "bg-indigo-500/10 border-indigo-500/50"
                      : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600/50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    {entry.status === "PENDING" && (
                      <input
                        type="checkbox"
                        checked={selectedEntries.has(entry.id)}
                        onChange={() => toggleSelect(entry.id)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                      />
                    )}
                    
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                      {entry.employee.firstName?.[0]}{entry.employee.lastName?.[0]}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">
                          {entry.employee.firstName} {entry.employee.lastName}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {entry.employee.employeeCode}
                        </Badge>
                        {entry.isSplit && (
                          <Badge variant="warning" className="text-xs">Split</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                        <span>{format(new Date(entry.entryDate), "MMM d, yyyy")}</span>
                        <span>
                          {format(new Date(entry.startTime), "HH:mm")} - {format(new Date(entry.endTime), "HH:mm")}
                        </span>
                        <span className="font-medium text-indigo-400">
                          {formatMinutesToHours(entry.durationMinutes)}
                        </span>
                        {entry.project && (
                          <span className="flex items-center gap-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: entry.project.color }}
                            />
                            {entry.project.name}
                          </span>
                        )}
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-slate-500 mt-1 italic">{entry.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.status === "PENDING" ? (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleApproval([entry.id], "approve")}
                          disabled={processing}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setEntryToReject(entry.id)
                            setRejectDialogOpen(true)
                          }}
                          disabled={processing}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Badge
                        variant={entry.status === "APPROVED" ? "success" : "destructive"}
                      >
                        {entry.status.toLowerCase()}
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Reject Time Entries
            </DialogTitle>
            <DialogDescription>
              {entryToReject 
                ? "Please provide a reason for rejection."
                : `You are about to reject ${selectedEntries.size} entries.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Input
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const ids = entryToReject ? [entryToReject] : Array.from(selectedEntries)
                handleApproval(ids, "reject", rejectReason)
              }}
              disabled={processing}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
