"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateProject } from "@/actions/projects";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export function EditProjectForm({ project }: { project: any }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
     setLoading(true);
     const res = await updateProject(project.id, formData);
     setLoading(false);

     if (res?.error) {
         toast.error(res.error);
     } else {
         toast.success("Project updated successfully");
         router.refresh();
     }
  }

  return (
    <form action={handleSubmit} className="space-y-6 bg-[#111827] border border-white/5 p-6 rounded-lg">
        <div>
            <h2 className="text-lg font-semibold text-white">Project Details</h2>
            <p className="text-sm text-zinc-500">Manage project information and status.</p>
        </div>

        <div className="grid gap-4">
             {/* Name & Code */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-zinc-300">Project Name</Label>
                    <Input id="name" name="name" defaultValue={project.name} className="bg-[#1F2937] border-white/10 text-white" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="code" className="text-zinc-300">Project Code</Label>
                    <Input id="code" name="code" defaultValue={project.code} className="bg-[#1F2937] border-white/10 text-white uppercase" required />
                </div>
            </div>

            {/* Status & Date */}
            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="status" className="text-zinc-300">Status</Label>
                    <Select name="status" defaultValue={project.status}>
                        <SelectTrigger className="bg-[#1F2937] border-white/10 text-white">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1F2937] border-white/10 text-white">
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="ON_HOLD">On Hold</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="ARCHIVED">Archived</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-zinc-300">Start Date</Label>
                    <Input 
                        id="startDate" 
                        name="startDate" 
                        type="date" 
                        defaultValue={project.startDate ? format(new Date(project.startDate), 'yyyy-MM-dd') : ''}
                        className="bg-[#1F2937] border-white/10 text-white" 
                    />
                </div>
            </div>

            {/* Duration & Estimation */}
            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-zinc-300">End Date (Optional)</Label>
                    <Input 
                        id="endDate" 
                        name="endDate" 
                        type="date" 
                        defaultValue={project.endDate ? format(new Date(project.endDate), 'yyyy-MM-dd') : ''}
                        className="bg-[#1F2937] border-white/10 text-white" 
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="estimatedHours" className="text-zinc-300">Est. Hours</Label>
                    <Input 
                        id="estimatedHours" 
                        name="estimatedHours" 
                        type="number"
                        placeholder="e.g. 120"
                        defaultValue={project.estimatedHours || ''}
                        className="bg-[#1F2937] border-white/10 text-white" 
                    />
                </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
                <Label htmlFor="description" className="text-zinc-300">Description</Label>
                <Textarea 
                    id="description" 
                    name="description" 
                    defaultValue={project.description} 
                    className="bg-[#1F2937] border-white/10 text-white min-h-[100px]" 
                />
            </div>
        </div>

        <div className="flex justify-end">
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? "Saving..." : "Save Changes"}
            </Button>
        </div>
    </form>
  );
}
