"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Filter, Download, Eye, Clock } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export interface HistoryEntry {
    id: string;
    date: string; // ISO or Date string
    projectName: string;
    projectCode: string;
    workplaceName?: string;
    totalHours: number;
    status: string;
}

interface EmployeeHistoryClientProps {
    initialEntries: HistoryEntry[];
}

export default function EmployeeHistoryClient({ initialEntries }: EmployeeHistoryClientProps) {
  const [filterText, setFilterText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredEntries = initialEntries.filter(entry => {
      const matchesText = entry.projectName.toLowerCase().includes(filterText.toLowerCase()) || 
                          entry.projectCode.toLowerCase().includes(filterText.toLowerCase());
      const matchesStatus = statusFilter === "all" || entry.status === statusFilter.toUpperCase();
      return matchesText && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
              <h1 className="text-2xl font-bold text-white">Work History</h1>
              <p className="text-zinc-400">View and manage your past time entries.</p>
          </div>
          {/* Placeholder for Export - can be connected to a server action later */}
          <Button variant="outline" className="border-white/10 text-zinc-300 hover:text-white hover:bg-white/5">
              <Download className="w-4 h-4 mr-2" /> Export Report
          </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#111827] p-4 rounded-lg border border-white/5 flex flex-col md:flex-row gap-4">
          <Input 
            placeholder="Search projects..." 
            className="bg-[#1F2937] border-none text-white focus-visible:ring-1 focus-visible:ring-blue-600 md:w-64"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48 bg-[#1F2937] border-none text-zinc-400">
                  <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-[#1F2937] border-white/10 text-white">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
          </Select>
          
           {/* Date Picker Placeholder - To be implemented */}
          <Button variant="outline" className="w-full md:w-auto justify-start text-left font-normal bg-[#1F2937] border-none text-zinc-400 hover:bg-[#1F2937] hover:text-white">
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span>Filter by Date</span>
          </Button>

          <Button className="bg-blue-600 hover:bg-blue-700 text-white md:ml-auto">
              <Filter className="w-4 h-4 mr-2" /> Apply Filters
          </Button>
      </div>

      {/* Table */}
       <div className="bg-[#111827] rounded-lg border border-white/5 overflow-hidden">
             <Table>
                <TableHeader className="bg-[#1F2937]">
                    <TableRow className="border-none hover:bg-transparent">
                        <TableHead className="text-zinc-400 font-medium">Date</TableHead>
                        <TableHead className="text-zinc-400 font-medium">Project</TableHead>
                        <TableHead className="text-zinc-400 font-medium">Workplace</TableHead>
                        <TableHead className="text-zinc-400 font-medium">Hours</TableHead>
                        <TableHead className="text-zinc-400 font-medium">Status</TableHead>
                        <TableHead className="text-right text-zinc-400 font-medium">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredEntries.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                                No entries found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredEntries.map((row) => (
                        <TableRow key={row.id} className="border-b border-white/5 hover:bg-white/5">
                            <TableCell className="text-zinc-300">
                                {format(new Date(row.date), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                                <div>
                                    <p className="text-white font-medium text-sm">{row.projectName}</p>
                                    <p className="text-[10px] text-zinc-500 bg-zinc-800 px-1 py-0.5 rounded w-fit mt-0.5">{row.projectCode}</p>
                                </div>
                            </TableCell>
                            <TableCell className="text-zinc-400 text-sm">{row.workplaceName || '-'}</TableCell>
                            <TableCell className="text-white font-bold">{row.totalHours}h</TableCell>
                            <TableCell>
                                <StatusBadge status={row.status} />
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/10">
                                    <Eye className="w-4 h-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    )))}
                </TableBody>
             </Table>
       </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
    if (status === "APPROVED") {
        return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-0"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span> Approved</Badge>
    }
    if (status === "PENDING") {
        return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-0"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
    }
    return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-0"><span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2"></span> Rejected</Badge>
}
