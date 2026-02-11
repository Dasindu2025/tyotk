"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { createProject } from "@/actions/projects";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
     setLoading(true);
     const res = await createProject(formData);
     setLoading(false);

     if (res?.error) {
         toast.error(res.error);
     } else {
         toast.success("Project created successfully");
         setOpen(false);
         // router.refresh() handled by server action revalidatePath
     }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="h-4 w-4" /> New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-[#111827] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Add a new project code and details. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
            <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right text-zinc-300">
                Name
                </Label>
                <Input
                    id="name"
                    name="name"
                    placeholder="Website Redesign"
                    className="col-span-3 bg-[#1F2937] border-white/10 text-white"
                    required
                />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right text-zinc-300">
                Code
                </Label>
                <Input
                    id="code"
                    name="code"
                    placeholder="PRO-001"
                    className="col-span-3 bg-[#1F2937] border-white/10 text-white uppercase"
                    required
                />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="desc" className="text-right text-zinc-300">
                Desc
                </Label>
                <Textarea
                    id="desc"
                    name="description"
                    placeholder="Optional description..."
                    className="col-span-3 bg-[#1F2937] border-white/10 text-white"
                />
            </div>
            </div>
            <DialogFooter>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? "Saving..." : "Save Project"}
            </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
