import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ProjectTeamList({ team }: { team: any[] }) {
  return (
    <div className="bg-[#111827] border border-white/5 p-6 rounded-lg h-full">
         <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Team Members</h2>
            <p className="text-sm text-zinc-500">Employees working on this project.</p>
        </div>

        {team.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-sm">
                No team members have logged time for this project yet.
            </div>
        ) : (
            <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                    {team.map((member, index) => (
                        <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                             <div className="flex items-center gap-3">
                                 <span className="text-xs font-mono text-zinc-500 w-4 text-center">{index + 1}</span>
                                 <Avatar className="h-9 w-9 border border-white/10">
                                     <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} />
                                     <AvatarFallback>{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                 </Avatar>
                                 <div>
                                     <p className="text-sm font-medium text-white">{member.name}</p>
                                     <p className="text-xs text-zinc-500">{member.email}</p>
                                 </div>
                             </div>
                             <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                                 {member.totalHours.toFixed(1)}h
                             </Badge>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        )}
    </div>
  );
}
