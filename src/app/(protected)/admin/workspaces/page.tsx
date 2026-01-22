"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Layers,
  Plus,
  Users,
  FolderKanban,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface Workspace {
  id: string
  name: string
  slug: string
  isActive: boolean
  userCount: number
  projectCount: number
  createdAt: string
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [workspaceName, setWorkspaceName] = useState("")

  useEffect(() => {
    fetchWorkspaces()
  }, [])

  async function fetchWorkspaces() {
    setLoading(true)
    try {
      const res = await fetch("/api/workspaces")
      if (res.ok) {
        const data = await res.json()
        setWorkspaces(data.data || [])
      }
    } catch (error) {
      toast.error("Failed to load workspaces")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    
    if (!workspaceName.trim()) {
      toast.error("Please enter a workspace name")
      return
    }
    
    setCreating(true)
    
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workspaceName }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to create workspace")
      }
      
      toast.success(`Workspace "${data.name}" created successfully!`)
      setDialogOpen(false)
      setWorkspaceName("")
      fetchWorkspaces()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-cyan-400" />
            Workspace Management
          </h1>
          <p className="text-slate-400 mt-1">
            Manage workspaces to organize projects and employees
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Workspace
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-40" />
            </Card>
          ))
        ) : workspaces.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-12 text-slate-500">
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No workspaces found</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create your first workspace
              </Button>
            </CardContent>
          </Card>
        ) : (
          workspaces.map((workspace, index) => (
            <motion.div
              key={workspace.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="card-hover border-cyan-500/20 bg-gradient-to-br from-slate-900 to-cyan-950/10">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-white" />
                    </div>
                    <Badge variant={workspace.isActive ? "success" : "secondary"}>
                      {workspace.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{workspace.name}</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    /{workspace.slug}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/50">
                      <Users className="w-4 h-4 text-blue-400" />
                      <div>
                        <p className="text-lg font-semibold text-white">{workspace.userCount}</p>
                        <p className="text-xs text-slate-500">Users</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/50">
                      <FolderKanban className="w-4 h-4 text-purple-400" />
                      <div>
                        <p className="text-lg font-semibold text-white">{workspace.projectCount}</p>
                        <p className="text-xs text-slate-500">Projects</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Create a workspace to organize projects and assign employees.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workspace Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Development, Marketing, Operations"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                required
              />
              <p className="text-xs text-slate-500">
                A unique slug will be auto-generated based on the name.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Workspace"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
