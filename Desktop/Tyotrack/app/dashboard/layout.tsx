import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Search, 
  Bell, 
  Menu
} from "lucide-react";
import { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { SidebarNav } from "@/components/sidebar-nav";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import { EmployeeNav } from "@/components/employee-nav";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;

  if (role === 'EMPLOYEE') {
    return (
        <div className="min-h-screen bg-[#0F172A] text-white flex flex-col">
            <EmployeeNav user={session.user} />
            <main className="flex-1 max-w-7xl w-full mx-auto p-6">
                {children}
            </main>
        </div>
    );
  }

  // --- ADMIN LAYOUT (Sidebar) ---
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[260px_1fr] bg-[#0F172A] text-white">
      {/* Sidebar (Desktop) */}
      <div className="hidden border-r border-white/10 bg-[#111827] md:block relative">
        <div className="flex h-full max-h-screen flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-white/10 px-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
              <span className="text-blue-500">TS</span>
              <span className="text-white">AdminPanel</span>
            </Link>
          </div>

          {/* Nav */}
          <div className="flex-1 overflow-auto px-4">
            <SidebarNav role={role} />
          </div>

          {/* User Profile (Bottom) */}
          <div className="p-4 mt-auto border-t border-white/10">
              <UserProfileDropdown user={session.user} />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col">
        {/* Top Header */}
        <header className="flex h-16 items-center gap-4 border-b border-white/10 bg-[#111827] px-6">
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 md:hidden text-zinc-400 hover:text-white hover:bg-white/10">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col bg-[#111827] text-white border-white/10 p-0">
               <div className="flex h-16 items-center border-b border-white/10 px-6">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl">
                    <span className="text-blue-500">TS</span>
                    <span className="text-white">AdminPanel</span>
                    </Link>
               </div>
               <div className="px-4 py-4">
                 <SidebarNav role={role} />
               </div>
            </SheetContent>
          </Sheet>

          {/* Search Bar */}
          <div className="w-full flex-1">
            <div className="relative w-full max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                <Input
                  type="search"
                  placeholder="Search employees, projects, or entries..."
                  className="w-full bg-[#1F2937] border-none text-white placeholder:text-zinc-500 pl-9 h-10 rounded-lg focus-visible:ring-blue-600"
                />
            </div>
          </div>

          {/* Notifications & Actions */}
          <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-full relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-red-600 border-2 border-[#111827]"></span>
              </Button>
              {/* Could put user dropdown here too */}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-[#0F172A] p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
