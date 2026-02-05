"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, User, Bell } from "lucide-react";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";

export function EmployeeNav({ user }: { user: any }) {
    const pathname = usePathname();

    const navItems = [
        { href: "/dashboard/employee", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/employee/history", label: "History", icon: History },
        // { href: "/dashboard/employee/profile", label: "Profile", icon: User },
    ];

    const isActive = (path: string) => pathname === path;

    return (
        <header className="border-b border-white/10 bg-[#111827]">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                    <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-sm">TS</span>
                    <span className="text-white">TimeSync</span>
                </div>

                {/* Center Nav */}
                <nav className="flex items-center gap-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors
                                    ${active 
                                        ? "bg-white/10 text-white" 
                                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                                    }
                                `}
                            >
                                <Icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                {/* Right Actions */}
                <div className="flex items-center gap-4">
                    <button className="text-zinc-400 hover:text-white relative">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-[#111827]"></span>
                    </button>
                    <div className="h-6 w-px bg-white/10 mx-2"></div>
                    <div className="flex items-center gap-3">
                         <div className="text-right hidden sm:block">
                             <p className="text-sm font-medium text-white">{user.name}</p>
                             <p className="text-xs text-zinc-500">EMP042</p> {/* Placeholder ID */}
                         </div>
                         <UserProfileDropdown user={user} />
                    </div>
                </div>
            </div>
        </header>
    );
}
