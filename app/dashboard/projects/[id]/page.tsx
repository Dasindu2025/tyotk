import { auth } from "@/auth";
import { getProjectById } from "@/actions/projects";
import { EditProjectForm } from "@/components/edit-project-form";
import { ProjectTeamList } from "@/components/project-team-list";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
      return (
          <div className="p-8 text-center">
              <h1 className="text-xl font-bold text-red-500">Project Not Found</h1>
              <Link href="/dashboard/projects" className="text-blue-500 hover:underline">Return to Projects</Link>
          </div>
      )
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
       {/* Header */}
       <div className="flex items-center gap-4">
           <Link href="/dashboard/projects">
               <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                   <ArrowLeft className="h-5 w-5" />
               </Button>
           </Link>
           <div>
               <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                   {project.name}
                   <span className="text-sm font-normal text-zinc-500 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                       {project.code}
                   </span>
               </h1>
           </div>
       </div>

       {/* Content Grid */}
       <div className="grid lg:grid-cols-3 gap-6">
           {/* Left Col - Details Form (2/3 width) */}
           <div className="lg:col-span-2">
               <EditProjectForm project={project} />
           </div>

           {/* Right Col - Team List (1/3 width) */}
           <div className="lg:col-span-1">
               <ProjectTeamList team={project.team} />
           </div>
       </div>
    </div>
  );
}
