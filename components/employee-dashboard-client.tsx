"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Clock, Calendar as CalendarIcon, Sunset, Moon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, getDay, isSameMonth } from "date-fns";
import { useState, useEffect } from "react";
import { TimeEntryForm } from "@/components/time-entry-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getEmployeeStats } from "@/actions/employee-stats";

interface Project {
    id: string;
    name: string;
    code: string;
}

interface Workplace {
    id: string;
    name: string;
    code: string;
}

interface MonthEntry {
    id: string;
    projectId: string;
    projectCode: string;
    date: string;
    startTime: string;
    endTime: string;
    totalHours: number;
    dayHours: number;
    eveningHours: number;
    nightHours: number;
    status: string;
}

interface EmployeeDashboardClientProps {
    currentMonthStr: string;
    projects: Project[];
    workplaces: Workplace[];
    monthEntries: MonthEntry[];
    companySettings: {
        dayStart: string;
        eveningStart: string;
        nightStart: string;
    };
}

export function EmployeeDashboardClient({ 
    currentMonthStr, 
    projects, 
    workplaces, 
    monthEntries,
    companySettings 
}: EmployeeDashboardClientProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(currentMonthStr));
  const [selectedMonth, setSelectedMonth] = useState(new Date(currentMonthStr));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [stats, setStats] = useState({
    selectedMonthHours: 0,
    thisWeekHours: 0,
    currentMonthEveningHours: 0,
    currentMonthNightHours: 0,
    currentMonthDayHours: 0,
    currentMonthTotalHours: 0
  });
  const [loading, setLoading] = useState(false);

  const handleDateClick = (date: Date) => {
      setSelectedDate(date);
      setIsDialogOpen(true);
  };

  const handleMonthChange = (offset: number) => {
      const newDate = new Date(currentMonth);
      newDate.setMonth(newDate.getMonth() + offset);
      setCurrentMonth(newDate);
      setSelectedMonth(newDate);
  };

  // Fetch stats when selected month changes
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const result = await getEmployeeStats(selectedMonth);
      if (result.data) {
        setStats(result.data);
      }
      setLoading(false);
    };
    fetchStats();
  }, [selectedMonth]);

  const isCurrentMonth = isSameMonth(selectedMonth, new Date());

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
          <div>
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <p className="text-zinc-400">Welcome back! Manage your time efficiently.</p>
          </div>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => handleDateClick(new Date())}
          >
              <Plus className="w-4 h-4 mr-2" /> Add New Entry
          </Button>
      </div>

      {/* Stats Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* This Week Hours */}
          <Card className="bg-[#111827] border-white/5 text-white p-6 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-transparent pointer-events-none" />
             <div className="relative z-10">
                 <div className="flex items-start justify-between">
                     <div>
                         <p className="text-zinc-400 text-sm font-medium mb-1">This Week</p>
                         <div className="flex items-baseline gap-2">
                             <span className="text-4xl font-bold text-white">
                                 {loading ? "..." : Math.round(stats.thisWeekHours)}h
                             </span>
                         </div>
                         <div className="flex items-center gap-2 mt-2 text-xs text-blue-400">
                             <Clock className="w-3 h-3" />
                             <span>Current Week</span>
                         </div>
                     </div>
                     <div className="h-12 w-12 rounded-full border-2 border-blue-700/50 flex items-center justify-center">
                         <Clock className="w-6 h-6 text-blue-500" />
                     </div>
                 </div>
             </div>
          </Card>

          {/* Selected Month Hours */}
          <Card className="bg-[#111827] border-white/5 text-white p-6 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 to-transparent pointer-events-none" />
             <div className="relative z-10">
                 <div className="flex items-start justify-between">
                     <div>
                         <p className="text-zinc-400 text-sm font-medium mb-1">
                             {format(selectedMonth, "MMMM yyyy")}
                         </p>
                         <div className="flex items-baseline gap-2">
                             <span className="text-4xl font-bold text-white">
                                 {loading ? "..." : Math.round(stats.selectedMonthHours)}h
                             </span>
                         </div>
                         <div className="flex items-center gap-2 mt-2">
                             {!isCurrentMonth && (
                                 <span className="text-xs text-purple-400">Selected Month</span>
                             )}
                             {isCurrentMonth && (
                                 <span className="text-xs text-emerald-400">Current Month</span>
                             )}
                         </div>
                     </div>
                     <div className="h-12 w-12 rounded-full border-2 border-purple-700/50 flex items-center justify-center">
                         <CalendarIcon className="w-6 h-6 text-purple-500" />
                     </div>
                 </div>
             </div>
          </Card>

          {/* Evening Hours (Current Month Only) */}
          <Card className="bg-[#111827] border-white/5 text-white p-6 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-orange-900/10 to-transparent pointer-events-none" />
             <div className="relative z-10">
                 <div className="flex items-start justify-between">
                     <div>
                         <p className="text-zinc-400 text-sm font-medium mb-1">Evening Hours</p>
                         <div className="flex items-baseline gap-2">
                             <span className="text-4xl font-bold text-white">
                                 {loading ? "..." : Math.round(stats.currentMonthEveningHours)}h
                             </span>
                         </div>
                         <div className="flex items-center gap-2 mt-2 text-xs text-orange-400">
                             <Sunset className="w-3 h-3" />
                             <span>{companySettings.eveningStart} - {companySettings.nightStart}</span>
                         </div>
                     </div>
                     <div className="h-12 w-12 rounded-full border-2 border-orange-700/50 flex items-center justify-center">
                         <Sunset className="w-6 h-6 text-orange-500" />
                     </div>
                 </div>
             </div>
          </Card>

          {/* Night Hours (Current Month Only) */}
          <Card className="bg-[#111827] border-white/5 text-white p-6 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 to-transparent pointer-events-none" />
             <div className="relative z-10">
                 <div className="flex items-start justify-between">
                     <div>
                         <p className="text-zinc-400 text-sm font-medium mb-1">Night Hours</p>
                         <div className="flex items-baseline gap-2">
                             <span className="text-4xl font-bold text-white">
                                 {loading ? "..." : Math.round(stats.currentMonthNightHours)}h
                             </span>
                         </div>
                         <div className="flex items-center gap-2 mt-2 text-xs text-indigo-400">
                             <Moon className="w-3 h-3" />
                             <span>{companySettings.nightStart} - {companySettings.dayStart}</span>
                         </div>
                     </div>
                     <div className="h-12 w-12 rounded-full border-2 border-indigo-700/50 flex items-center justify-center">
                         <Moon className="w-6 h-6 text-indigo-500" />
                     </div>
                 </div>
             </div>
          </Card>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-center gap-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleMonthChange(-1)} 
            className="hover:bg-white/10 text-zinc-400 hover:text-white"
          >
              <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="text-center min-w-[200px]">
              <h2 className="text-2xl font-bold text-white">{format(currentMonth, "MMMM yyyy")}</h2>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Calendar View</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleMonthChange(1)} 
            className="hover:bg-white/10 text-zinc-400 hover:text-white"
          >
              <ChevronRight className="w-6 h-6" />
          </Button>
      </div>

      {/* Monthly Overview Calendar */}
      <div>
          <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Monthly Overview</h3>
              <div className="flex items-center gap-4 text-xs">
                 <span className="text-zinc-400 italic">Click a date to log time</span>
              </div>
          </div>
          <Card className="bg-[#111827] border-white/5 p-4 md:p-6 overflow-x-auto">
             <CalendarGrid 
                currentMonth={currentMonth} 
                onDateClick={handleDateClick} 
                entries={monthEntries}
             />
          </Card>
      </div>

      {/* Time Entry Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-[#111827] border-white/10 text-white sm:max-w-[500px]">
              <DialogHeader>
                  <DialogTitle>Log Time Entry</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                      Add a time entry for {format(selectedDate, "PPP")}.
                  </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                  <TimeEntryForm 
                      projects={projects} 
                      workplaces={workplaces} 
                      defaultDate={selectedDate}
                      onSuccess={() => {
                          setIsDialogOpen(false);
                          // Refresh stats
                          getEmployeeStats(selectedMonth).then(result => {
                              if (result.data) setStats(result.data);
                          });
                      }}
                   />
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}

function CalendarGrid({ currentMonth, onDateClick, entries }: { currentMonth: Date, onDateClick: (d: Date) => void, entries: MonthEntry[] }) {
    const days = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });

    const startDayOfWeek = getDay(startOfMonth(currentMonth)); // 0 = Sunday
    const emptyDays = Array(startDayOfWeek).fill(null);

    return (
        <div className="min-w-[800px]">
             {/* Header */}
             <div className="grid grid-cols-7 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-zinc-500 uppercase">{day}</div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/5 rounded-lg overflow-hidden">
                {emptyDays.map((_, i) => (
                    <div key={`empty-${i}`} className="h-32 bg-[#111827]" />
                ))}

                {days.map((day) => {
                    // Logic to find entries for this day would go here
                    // const dayEntries = entries.filter(e => isSameDay(new Date(e.date), day));
                    
                    return (
                        <div 
                            key={day.toString()} 
                            onClick={() => onDateClick(day)}
                            className={`h-32 bg-[#111827] p-2 relative group hover:bg-[#1a2233] transition-colors flex flex-col items-center justify-center cursor-pointer
                                ${isToday(day) ? 'bg-blue-900/10' : ''}
                            `}
                        >
                            <span className={`absolute top-2 left-2 text-xs ${isToday(day) ? 'text-blue-500 font-bold' : 'text-zinc-500'}`}>
                                {format(day, 'd')}
                            </span>
                            
                            {/* Hover Add Icon */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-blue-600/20 text-blue-500 hover:bg-blue-600 hover:text-white">
                                    <Plus className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    )
}
