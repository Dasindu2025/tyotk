import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Clock, MoreVertical, Calendar } from "lucide-react";
import { format } from "date-fns";

interface ProjectCardProps {
  id: string; // Added ID
  name: string;
  code: string;
  status: string;
  employeeCount: number;
  totalHours: number;
  startDate: string | Date;
}

export function ProjectCard({ id, name, code, status, employeeCount, totalHours, startDate }: ProjectCardProps) {
  const isActive = status === 'ACTIVE';

  return (
    <Card className="bg-[#111827] border-white/5 text-white shadow-sm flex flex-col justify-between">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1">
             <Badge variant="secondary" className="bg-[#1F2937] text-zinc-400 font-mono text-xs hover:bg-[#1F2937]">
                {code}
             </Badge>
             <h3 className="font-semibold text-lg leading-tight">{name}</h3>
             <div className="flex items-center gap-1.5 mt-2">
                 <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-zinc-500'}`}></div>
                 <span className="text-xs text-zinc-400 capitalize">{status.toLowerCase().replace('_', ' ')}</span>
             </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white">
            <MoreVertical className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="py-4">
          <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">{employeeCount}</span>
              </div>
              <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">{totalHours.toFixed(0)}h</span>
              </div>
          </div>
      </CardContent>

      <CardFooter className="pt-0 flex items-center justify-between text-xs text-zinc-500">
           <div className="flex items-center gap-1.5">
               <Calendar className="h-3 w-3" />
               <span>{startDate ? format(new Date(startDate), "MMM dd, yyyy") : 'N/A'}</span>
           </div>
           <Link href={`/dashboard/projects/${id}`} className="text-blue-500 cursor-pointer hover:underline">
               View Details
           </Link>
      </CardFooter>
    </Card>
  );
}
