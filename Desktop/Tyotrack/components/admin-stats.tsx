import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, Clock, AlertCircle, ArrowUpRight, ArrowDownRight, ArrowRight } from "lucide-react";

export function AdminStats({ 
    totalEmployees = 124, 
    activeProjects = 5, 
    totalHours = 12450, 
    pendingApprovals = 18 
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard 
        title="Total Employees" 
        value={totalEmployees} 
        icon={Users} 
        trend="+12%" 
        trendLabel="from last month"
        trendUp={true}
        iconColor="text-blue-500"
        iconBg="bg-blue-500/10"
      />
      <StatCard 
        title="Active Projects" 
        value={activeProjects} 
        icon={Briefcase} 
        trend="+3" 
        trendLabel="from last month"
        trendUp={true}
        iconColor="text-emerald-500"
        iconBg="bg-emerald-500/10"
      />
      <StatCard 
        title="Total Hours (Oct)" 
        value={totalHours.toLocaleString()} 
        icon={Clock} 
        trend="-2.5%" 
        trendLabel="from last month"
        trendUp={false}
        iconColor="text-white"
        iconBg="bg-white/10"
      />
      <StatCard 
        title="Pending Approvals" 
        value={pendingApprovals} 
        icon={AlertCircle} 
        actionLink="Review Now"
        iconColor="text-amber-500"
        iconBg="bg-amber-500/10"
      />
    </div>
  );
}

function StatCard({ 
    title, 
    value, 
    subValue,
    icon: Icon, 
    trend, 
    trendLabel, 
    trendUp, 
    actionLink,
    iconColor,
    iconBg
}: any) {
  return (
    <Card className="bg-[#111827] border-white/5 text-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${iconBg} ${iconColor}`}>
             <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {subValue && <div className="text-xs font-medium text-zinc-500 uppercase mb-1">Active Projects</div>}
        <div className="text-2xl font-bold">{value}</div>
        
        <div className="flex items-center mt-1 space-x-2">
            {trend && (
                <span className={`text-xs font-medium flex items-center ${trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
                    {trendUp ? <ArrowUpRight className="mr-1 h-3 w-3"/> : <ArrowDownRight className="mr-1 h-3 w-3"/>}
                    {trend}
                </span>
            )}
            {trendLabel && (
                <span className="text-xs text-zinc-500">{trendLabel}</span>
            )}
            {actionLink && (
                <span className="text-xs font-medium text-blue-500 flex items-center cursor-pointer hover:underline">
                    {actionLink} <ArrowRight className="ml-1 h-3 w-3"/>
                </span>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
