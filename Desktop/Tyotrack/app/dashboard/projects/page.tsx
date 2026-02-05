import { auth } from "@/auth";
import { getProjectsWithStats } from "@/actions/projects";
import { ProjectCard } from "@/components/project-card";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const projects = await getProjectsWithStats();

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-white">Projects</h1>
           <p className="text-zinc-400">Manage all company projects and track their progress.</p>
        </div>
        <NewProjectDialog />
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 bg-[#111827] p-4 rounded-lg border border-white/5">
         <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <Input 
                placeholder="Search projects by name or code..." 
                className="pl-9 bg-[#1F2937] border-none text-white focus-visible:ring-blue-600"
            />
         </div>
         <div className="flex items-center gap-2 text-sm text-zinc-400">
             <span>Sort by:</span>
             <span className="text-white font-medium cursor-pointer">Newest</span>
         </div>
      </div>

      {/* Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         {projects.length === 0 ? (
             <div className="col-span-full text-center py-20 text-zinc-500">
                 No projects found. Create one to get started.
             </div>
         ) : (
// Imports are already at the top, removing this invalid block
             projects.map((project) => (
                 <ProjectCard 
                    key={project.id}
                    id={project.id}
                    name={project.name}
                    code={project.code}
                    status={project.status}
                    employeeCount={project.employeeCount}
                    totalHours={project.totalHours}
                    startDate={project.startDate}
                 />
             ))
         )}
      </div>
    </div>
  );
}
