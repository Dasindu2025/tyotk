"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  FolderKanban,
  Plus,
  Search,
  Loader2,
  Layers,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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

interface Project {
  id: string
  projectCode: string
  name: string
  description?: string
  color: string
  isActive: boolean
  workspaceId: string
  workspaceName: string
  createdAt: string
}

interface Workspace {
  id: string
  name: string
  projectCount: number
}

const COLORS = [
  "#6366F1", "#8B5CF6", "#EC4899", "#EF4444",
  "#F97316", "#EAB308", "#22C55E", "#14B8A6",
  "#06B6D4", "#3B82F6"
]

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedWorkspaceFilter, setSelectedWorkspaceFilter] = useState<string>("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#6366F1",
    workspaceId: "",
  })

  useEffect(() => {
    fetchWorkspaces()
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [search, selectedWorkspaceFilter])

  async function fetchWorkspaces() {
    try {
      const res = await fetch("/api/workspaces")
      if (res.ok) {
        const data = await res.json()
        setWorkspaces(data.data || [])
        // Set default workspace for form
        if (data.data?.length > 0 && !formData.workspaceId) {
          setFormData(prev => ({ ...prev, workspaceId: data.data[0].id }))
        }
      }
    } catch (error) {
      console.error("Failed to load workspaces:", error)
    }
  }

  async function fetchProjects() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (selectedWorkspaceFilter) params.set("workspaceId", selectedWorkspaceFilter)
      
      const res = await fetch(`/api/projects?${params}`)
      if (res.ok) {
        const data = await res.json()
        setProjects(data.data || [])
      }
    } catch (error) {
      toast.error("Failed to load projects")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    
    if (!formData.workspaceId) {
      toast.error("Please select a workspace")
      return
    }
    
    setCreating(true)
    
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to create project")
      }
      
      toast.success(`Project ${data.projectCode} created in ${data.workspaceName}`)
      setDialogOpen(false)
      setFormData({ name: "", description: "", color: "#6366F1", workspaceId: workspaces[0]?.id || "" })
      fetchProjects()
      fetchWorkspaces() // Refresh workspace counts
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
            <FolderKanban className="w-6 h-6 text-purple-400" />
            Project Management
          </h1>
          <p className="text-slate-400 mt-1">
            Manage projects across workspaces
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={!selectedWorkspaceFilter ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedWorkspaceFilter("")}
              >
                All
              </Button>
              {workspaces.map((ws) => (
                <Button
                  key={ws.id}
                  variant={selectedWorkspaceFilter === ws.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedWorkspaceFilter(ws.id)}
                  className="gap-1"
                >
                  <Layers className="w-3 h-3" />
                  {ws.name}
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {ws.projectCount}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-32" />
            </Card>
          ))
        ) : projects.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-12 text-slate-500">
              <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No projects found</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create your first project
              </Button>
            </CardContent>
          </Card>
        ) : (
          projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="card-hover overflow-hidden">
                <div className="h-2" style={{ backgroundColor: project.color }} />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {project.projectCode}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Layers className="w-3 h-3 mr-1" />
                          {project.workspaceName}
                        </Badge>
                      </div>
                      <h3 className="font-medium text-white">{project.name}</h3>
                      {project.description && (
                        <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Badge variant={project.isActive ? "success" : "secondary"}>
                      {project.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Select a workspace and enter project details.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Workspace Selection */}
            <div className="space-y-2">
              <Label htmlFor="workspace">Workspace *</Label>
              <select
                id="workspace"
                value={formData.workspaceId}
                onChange={(e) => setFormData({ ...formData, workspaceId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">-- Select Workspace --</option>
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name} ({ws.projectCount} projects)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="Enter project name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      formData.color === color ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
