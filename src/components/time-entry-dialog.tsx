"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { format, startOfDay, isAfter } from "date-fns"
import { Loader2, Clock, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TimeEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  selectedDate?: Date | null  // New prop for pre-selected date
}

interface FormData {
  date: string
  startTime: string
  endTime: string
  projectId: string
  workplaceId: string
  notes: string
}

interface Project {
  id: string
  name: string
  projectCode: string
}

interface Workplace {
  id: string
  name: string
  locationCode: string
}

export function TimeEntryDialog({ open, onOpenChange, onSuccess, selectedDate }: TimeEntryDialogProps) {
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [crossesMidnight, setCrossesMidnight] = useState(false)

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      startTime: "09:00",
      endTime: "17:00",
      projectId: "",
      workplaceId: "",
      notes: "",
    },
  })

  const startTime = watch("startTime")
  const endTime = watch("endTime")
  const date = watch("date")

  // Set date when selectedDate prop changes
  useEffect(() => {
    if (selectedDate && open) {
      // Don't allow future dates
      const today = startOfDay(new Date())
      const selected = startOfDay(selectedDate)
      
      if (isAfter(selected, today)) {
        // If future date, use today instead
        setValue("date", format(today, "yyyy-MM-dd"))
        toast.error("Cannot create time entries for future dates")
      } else {
        setValue("date", format(selectedDate, "yyyy-MM-dd"))
      }
    }
  }, [selectedDate, open, setValue])


  // Check if entry crosses midnight
  useEffect(() => {
    if (startTime && endTime) {
      const [startH, startM] = startTime.split(":").map(Number)
      const [endH, endM] = endTime.split(":").map(Number)
      const startMins = startH * 60 + startM
      const endMins = endH * 60 + endM
      setCrossesMidnight(endMins <= startMins && endTime !== startTime)
    }
  }, [startTime, endTime])


  // Fetch projects and workplaces
  useEffect(() => {
    if (open) {
      Promise.all([
        fetch("/api/projects").then((r) => r.json()),
        fetch("/api/workplaces").then((r) => r.json()),
      ]).then(([projectsData, workplacesData]) => {
        setProjects(projectsData.data || [])
        setWorkplaces(workplacesData.data || [])
      })
    }
  }, [open])

  async function onSubmit(data: FormData) {
    // Validate: no future dates
    const selectedDateObj = new Date(data.date)
    const today = startOfDay(new Date())
    
    if (isAfter(startOfDay(selectedDateObj), today)) {
      toast.error("Cannot create time entries for future dates")
      return
    }

    setLoading(true)
    try {
      // Construct datetime strings
      const startDateTime = `${data.date}T${data.startTime}:00`
      let endDateTime: string

      if (crossesMidnight) {
        // If crosses midnight, end date is next day
        const nextDay = new Date(data.date)
        nextDay.setDate(nextDay.getDate() + 1)
        endDateTime = `${format(nextDay, "yyyy-MM-dd")}T${data.endTime}:00`
      } else {
        endDateTime = `${data.date}T${data.endTime}:00`
      }

      // Validate workplace is selected
      if (!data.workplaceId || data.workplaceId.trim() === "") {
        toast.error("Please select a workplace")
        setLoading(false)
        return
      }

      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Send local time strings directly WITHOUT timezone conversion
          // The server will parse these as local times and store them as-is
          startTime: startDateTime, // e.g., "2026-01-28T21:00:00"
          endTime: endDateTime,     // e.g., "2026-01-29T05:30:00"
          projectId: data.projectId && data.projectId.trim() !== "" ? data.projectId : undefined,
          workplaceId: data.workplaceId, // Required field
          notes: data.notes && data.notes.trim() !== "" ? data.notes : undefined,
          entryDate: data.date,
          crossesMidnight: crossesMidnight,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || "Failed to create entry")
      }

      toast.success(result.message || "Time entry created")
      reset()
      onSuccess()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Calculate max date (today)
  const maxDate = format(new Date(), "yyyy-MM-dd")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            Log Time Entry
          </DialogTitle>
          <DialogDescription>
            Record your work hours. Cross-day entries will be automatically split.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              max={maxDate}
              {...register("date", { required: "Date is required" })}
            />
            <p className="text-xs text-slate-500">Cannot select future dates</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time (24-hour format)</Label>
              <Input
                id="startTime"
                type="text"
                placeholder="HH:MM (e.g., 21:00)"
                value={startTime || ''}
                maxLength={5}
                {...register("startTime", { 
                  required: "Required",
                  pattern: {
                    value: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
                    message: "Use 24-hour format HH:MM (e.g., 21:00)"
                  }
                })}
                onChange={(e) => {
                  let inputValue = e.target.value
                  
                  // Remove all non-digits
                  const digitsOnly = inputValue.replace(/\D/g, '')
                  
                  // Limit to 4 digits
                  const limited = digitsOnly.slice(0, 4)
                  
                  let formattedValue = ''
                  
                  // Auto-format: add colon after 2 digits
                  if (limited.length === 0) {
                    formattedValue = ''
                  } else if (limited.length <= 2) {
                    formattedValue = limited
                  } else {
                    // Format as HH:MM - automatically add colon
                    formattedValue = `${limited.slice(0, 2)}:${limited.slice(2, 4)}`
                  }
                  
                  // Update immediately
                  setValue("startTime", formattedValue, { shouldValidate: false })
                }}
                onBlur={(e) => {
                  let value = e.target.value
                  
                  // If empty, set to 00:00
                  if (!value || value.trim() === '') {
                    setValue("startTime", "00:00", { shouldValidate: true })
                    return
                  }
                  
                  // Remove non-digits and format
                  const digitsOnly = value.replace(/\D/g, '')
                  
                  if (digitsOnly.length === 0) {
                    setValue("startTime", "00:00", { shouldValidate: true })
                    return
                  }
                  
                  // Pad to 4 digits if needed
                  const padded = digitsOnly.padEnd(4, '0').slice(0, 4)
                  
                  // Format and validate
                  const hours = parseInt(padded.slice(0, 2), 10)
                  const minutes = parseInt(padded.slice(2, 4), 10)
                  
                  const validHours = Math.max(0, Math.min(23, hours))
                  const validMinutes = Math.max(0, Math.min(59, minutes))
                  
                  const formatted = `${validHours.toString().padStart(2, '0')}:${validMinutes.toString().padStart(2, '0')}`
                  setValue("startTime", formatted, { shouldValidate: true })
                }}
              />
              {errors.startTime && <p className="text-xs text-red-400">{errors.startTime.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time (24-hour format)</Label>
              <Input
                id="endTime"
                type="text"
                placeholder="HH:MM (e.g., 05:00)"
                value={endTime || ''}
                maxLength={5}
                {...register("endTime", { 
                  required: "Required",
                  pattern: {
                    value: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
                    message: "Use 24-hour format HH:MM (e.g., 05:00)"
                  }
                })}
                onChange={(e) => {
                  let inputValue = e.target.value
                  
                  // Remove all non-digits
                  const digitsOnly = inputValue.replace(/\D/g, '')
                  
                  // Limit to 4 digits
                  const limited = digitsOnly.slice(0, 4)
                  
                  let formattedValue = ''
                  
                  // Auto-format: add colon after 2 digits
                  if (limited.length === 0) {
                    formattedValue = ''
                  } else if (limited.length <= 2) {
                    formattedValue = limited
                  } else {
                    // Format as HH:MM - automatically add colon
                    formattedValue = `${limited.slice(0, 2)}:${limited.slice(2, 4)}`
                  }
                  
                  // Update immediately
                  setValue("endTime", formattedValue, { shouldValidate: false })
                }}
                onBlur={(e) => {
                  let value = e.target.value
                  
                  // If empty, set to 00:00
                  if (!value || value.trim() === '') {
                    setValue("endTime", "00:00", { shouldValidate: true })
                    return
                  }
                  
                  // Remove non-digits and format
                  const digitsOnly = value.replace(/\D/g, '')
                  
                  if (digitsOnly.length === 0) {
                    setValue("endTime", "00:00", { shouldValidate: true })
                    return
                  }
                  
                  // Pad to 4 digits if needed
                  const padded = digitsOnly.padEnd(4, '0').slice(0, 4)
                  
                  // Format and validate
                  const hours = parseInt(padded.slice(0, 2), 10)
                  const minutes = parseInt(padded.slice(2, 4), 10)
                  
                  const validHours = Math.max(0, Math.min(23, hours))
                  const validMinutes = Math.max(0, Math.min(59, minutes))
                  
                  const formatted = `${validHours.toString().padStart(2, '0')}:${validMinutes.toString().padStart(2, '0')}`
                  setValue("endTime", formatted, { shouldValidate: true })
                }}
              />
              {errors.endTime && <p className="text-xs text-red-400">{errors.endTime.message}</p>}
            </div>
          </div>

          {crossesMidnight && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>This entry spans across midnight and will be automatically split into separate days.</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="projectId">Project (optional)</Label>
            <select
              id="projectId"
              {...register("projectId")}
              className="flex h-10 w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.projectCode} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workplaceId">Workplace <span className="text-red-400">*</span></Label>
            <select
              id="workplaceId"
              {...register("workplaceId", { required: "Workplace is required" })}
              className="flex h-10 w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Select a workplace</option>
              {workplaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.locationCode} - {w.name}
                </option>
              ))}
            </select>
            {errors.workplaceId && <p className="text-xs text-red-400">{errors.workplaceId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              placeholder="What did you work on?"
              {...register("notes")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Entry"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
