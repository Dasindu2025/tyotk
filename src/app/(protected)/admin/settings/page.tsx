"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  Settings,
  User,
  Building,
  Shield,
  Clock,
  Sun,
  Sunset,
  Moon,
  Save,
  Loader2,
  Scissors,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface WorkspaceSettings {
  dayStartHour: number
  dayEndHour: number
  eveningEndHour: number
  daySplitHour: number
}

export default function AdminSettingsPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<WorkspaceSettings>({
    dayStartHour: 6,
    dayEndHour: 18,
    eveningEndHour: 22,
    daySplitHour: 0,
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const res = await fetch("/api/workspaces/settings")
      if (res.ok) {
        const data = await res.json()
        setSettings({
          dayStartHour: data.dayStartHour ?? 6,
          dayEndHour: data.dayEndHour ?? 18,
          eveningEndHour: data.eveningEndHour ?? 22,
          daySplitHour: data.daySplitHour ?? 0,
        })
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error)
    }
  }

  async function saveSettings() {
    setLoading(true)
    try {
      const res = await fetch("/api/workspaces/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        toast.success("Settings saved successfully")
      } else {
        toast.error("Failed to save settings")
      }
    } catch (error) {
      toast.error("Failed to save settings")
    } finally {
      setLoading(false)
    }
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return "12:00 AM"
    if (hour === 12) return "12:00 PM"
    if (hour < 12) return `${hour}:00 AM`
    return `${hour - 12}:00 PM`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-400" />
          Settings
        </h1>
        <p className="text-slate-400 mt-1">
          System configuration and preferences
        </p>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-400" />
            Profile Information
          </CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400">Name</p>
                <p className="text-white font-medium">
                  {session?.user?.firstName} {session?.user?.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Email</p>
                <p className="text-white font-medium">{session?.user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Employee Code</p>
                <Badge variant="secondary">{session?.user?.employeeCode || "N/A"}</Badge>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400">Role</p>
                <Badge variant="default">{session?.user?.role?.replace("_", " ")}</Badge>
              </div>
              <div>
                <p className="text-sm text-slate-400">Organization</p>
                <p className="text-white font-medium">{session?.user?.organizationName || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Workspace</p>
                <p className="text-white font-medium">{session?.user?.workspaceName}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day/Night Hours Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-400" />
            <Sunset className="w-5 h-5 text-orange-400" />
            <Moon className="w-5 h-5 text-blue-400" />
            Shift Hours Configuration
          </CardTitle>
          <CardDescription>
            Configure when Day, Evening, and Night shifts start and end for hour tracking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label htmlFor="dayStartHour" className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                Day Shift Starts At
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="dayStartHour"
                  type="number"
                  min={0}
                  max={23}
                  value={settings.dayStartHour}
                  onChange={(e) => setSettings(s => ({...s, dayStartHour: parseInt(e.target.value) || 0}))}
                  className="w-24"
                />
                <span className="text-slate-400">{formatHour(settings.dayStartHour)}</span>
              </div>
              <p className="text-xs text-slate-500">Hour (0-23, 24-hour format)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dayEndHour" className="flex items-center gap-2">
                <Sunset className="w-4 h-4 text-orange-400" />
                Evening Starts At
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="dayEndHour"
                  type="number"
                  min={0}
                  max={23}
                  value={settings.dayEndHour}
                  onChange={(e) => setSettings(s => ({...s, dayEndHour: parseInt(e.target.value) || 0}))}
                  className="w-24"
                />
                <span className="text-slate-400">{formatHour(settings.dayEndHour)}</span>
              </div>
              <p className="text-xs text-slate-500">Hour (0-23, 24-hour format)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eveningEndHour" className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-blue-400" />
                Night Starts At
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="eveningEndHour"
                  type="number"
                  min={0}
                  max={23}
                  value={settings.eveningEndHour}
                  onChange={(e) => setSettings(s => ({...s, eveningEndHour: parseInt(e.target.value) || 0}))}
                  className="w-24"
                />
                <span className="text-slate-400">{formatHour(settings.eveningEndHour)}</span>
              </div>
              <p className="text-xs text-slate-500">Hour (0-23, 24-hour format)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="daySplitHour" className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-rose-400" />
                Day Split Hour
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="daySplitHour"
                  type="number"
                  min={0}
                  max={23}
                  value={settings.daySplitHour}
                  onChange={(e) => setSettings(s => ({...s, daySplitHour: parseInt(e.target.value) || 0}))}
                  className="w-24"
                />
                <span className="text-slate-400">{formatHour(settings.daySplitHour)}</span>
              </div>
              <p className="text-xs text-slate-500">When entries split across days</p>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-rose-950/20 border border-rose-500/30">
            <p className="text-sm text-rose-300">
              <strong>✂️ Day Split Hour:</strong> {formatHour(settings.daySplitHour)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Time entries crossing this hour will be split into separate day entries.
              Default is midnight (0). Set to 6 if your &quot;work day&quot; starts at 6 AM.
            </p>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <p className="text-sm text-slate-300">
              <strong>Current Configuration:</strong>
            </p>
            <p className="text-slate-400 mt-1">
              ☀️ Day Hours: {formatHour(settings.dayStartHour)} - {formatHour(settings.dayEndHour)}
            </p>
            <p className="text-slate-400">
              🌆 Evening Hours: {formatHour(settings.dayEndHour)} - {formatHour(settings.eveningEndHour)}
            </p>
            <p className="text-slate-400">
              🌙 Night Hours: {formatHour(settings.eveningEndHour)} - {formatHour(settings.dayStartHour)} (next day)
            </p>
          </div>

          <Button className="mt-4" onClick={saveSettings} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Workspace Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5 text-purple-400" />
            Workspace Information
          </CardTitle>
          <CardDescription>Current workspace configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
              <p className="text-sm text-slate-400">Workspace Name</p>
              <p className="text-white font-medium mt-1">{session?.user?.workspaceName}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
              <p className="text-sm text-slate-400">Your Role</p>
              <p className="text-white font-medium mt-1">{session?.user?.role?.replace("_", " ")}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
              <p className="text-sm text-slate-400">Status</p>
              <Badge variant="success" className="mt-1">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <p className="text-sm text-slate-400">Application Version</p>
              </div>
              <p className="text-white font-medium">TyoTrack v1.0.0</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-slate-400" />
                <p className="text-sm text-slate-400">Security</p>
              </div>
              <p className="text-white font-medium">Enterprise Grade</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
