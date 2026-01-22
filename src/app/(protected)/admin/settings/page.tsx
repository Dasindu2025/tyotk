"use client"

import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import {
  Settings,
  User,
  Building,
  Shield,
  Clock,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function AdminSettingsPage() {
  const { data: session } = useSession()

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
                <p className="text-sm text-slate-400">Workspace</p>
                <p className="text-white font-medium">{session?.user?.workspaceName}</p>
              </div>
            </div>
          </div>
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
