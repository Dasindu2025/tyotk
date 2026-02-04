"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  MapPin,
  Plus,
  Search,
  Building,
  Globe,
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

interface Workplace {
  id: string
  locationCode: string
  name: string
  address?: string
  city?: string
  country?: string
  isActive: boolean
  createdAt: string
}

export default function WorkplacesPage() {
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    country: "",
  })

  useEffect(() => {
    fetchWorkplaces()
  }, [search])

  async function fetchWorkplaces() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      
      const res = await fetch(`/api/workplaces?${params}`)
      const data = await res.json()
      setWorkplaces(data.data || [])
    } catch (error) {
      toast.error("Failed to load workplaces")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    
    try {
      const res = await fetch("/api/workplaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to create workplace")
      }
      
      toast.success(`Workplace ${data.locationCode} created`)
      setDialogOpen(false)
      setFormData({ name: "", address: "", city: "", country: "" })
      fetchWorkplaces()
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
            <MapPin className="w-6 h-6 text-cyan-400" />
            Workplace Management
          </h1>
          <p className="text-slate-400 mt-1">
            Manage work locations
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Workplace
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search workplaces..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
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
        ) : workplaces.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-12 text-slate-500">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No workplaces found</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add your first workplace
              </Button>
            </CardContent>
          </Card>
        ) : (
          workplaces.map((workplace, index) => (
            <motion.div
              key={workplace.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="card-hover">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <Badge variant="secondary" className="text-xs mb-1">
                          {workplace.locationCode}
                        </Badge>
                        <h3 className="font-medium text-white">{workplace.name}</h3>
                        {workplace.address && (
                          <p className="text-sm text-slate-400 mt-1 flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {workplace.address}
                          </p>
                        )}
                        {(workplace.city || workplace.country) && (
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {[workplace.city, workplace.country].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Badge variant={workplace.isActive ? "success" : "secondary"}>
                      {workplace.isActive ? "Active" : "Inactive"}
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
            <DialogTitle>Add New Workplace</DialogTitle>
            <DialogDescription>
              A unique location code will be auto-generated.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Main Office"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Business St"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Add Workplace
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
