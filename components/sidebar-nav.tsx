"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  MapPin, 
  CheckSquare, 
  FileText, 
  Settings 
} from "lucide-react";

export function SidebarNav({ role }: { role: string }) {
  const pathname = usePathname();

  function isActive(href: string) {
      if (href === "/dashboard" && (pathname === "/dashboard" || pathname === "/dashboard/admin" || pathname === "/dashboard/employee")) {
          return true;
      }
      return pathname.startsWith(href) && href !== "/dashboard";
  }

  return (
    <div className="flex flex-col gap-1 py-4">
      <div className="px-3 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        Main Menu
      </div>
      <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={isActive("/dashboard")} />
      {role !== 'EMPLOYEE' && (
        <>
            <NavItem href="/dashboard/projects" icon={Briefcase} label="Projects" active={isActive("/dashboard/projects")} />
            <NavItem href="/dashboard/employees" icon={Users} label="Employees" active={isActive("/dashboard/employees")} />
            <NavItem href="/dashboard/workplaces" icon={MapPin} label="Workplaces" active={isActive("/dashboard/workplaces")} />
            <NavItem href="/dashboard/admin/approvals" icon={CheckSquare} label="Approvals" badge={3} active={isActive("/dashboard/admin/approvals")} />
            <NavItem href="/dashboard/reports" icon={FileText} label="Reports" active={isActive("/dashboard/reports")} />
        </>
      )}
      <NavItem href="/dashboard/settings" icon={Settings} label="Settings" active={isActive("/dashboard/settings")} />
    </div>
  );
}

function NavItem({ href, icon: Icon, label, active, badge }: { href: string, icon: any, label: string, active?: boolean, badge?: number }) {
    return (
        <Link
            href={href}
            className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all
                ${active 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }
            `}
        >
            <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${active ? "text-white" : "text-zinc-500 group-hover:text-white"}`} />
                {label}
            </div>
            {badge && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                    {badge}
                </span>
            )}
        </Link>
    )
}
