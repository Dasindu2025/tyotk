"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, Clock, ArrowRight } from "lucide-react";
import { approveTimeEntry, rejectTimeEntry } from "@/actions/time-entry";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";
import Link from 'next/link';

export function ApprovalsTable({ entries }: { entries: any[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleApprove(id: string) {
    setLoadingId(id);
    const res = await approveTimeEntry(id);
    if (res.error) toast.error(res.error);
    else toast.success("Approved");
    setLoadingId(null);
  }

  async function handleReject(id: string) {
    setLoadingId(id);
    const res = await rejectTimeEntry(id);
    if (res.error) toast.error(res.error);
    else toast.success("Rejected");
    setLoadingId(null);
  }

  return (
    <div className="bg-[#111827] rounded-lg border border-white/5 overflow-hidden">
       {/* Table Header */}
       <div className="flex items-center justify-between p-4 border-b border-white/5">
           <h3 className="text-base font-semibold text-white">Recent Time Entries</h3>
           <Link href="#" className="text-sm text-blue-500 hover:text-blue-400 flex items-center gap-1">
               View All <ArrowRight className="w-4 h-4" />
           </Link>
       </div>

      <Table>
        <TableHeader className="bg-[#1F2937]">
          <TableRow className="border-none hover:bg-transparent">
            <TableHead className="text-zinc-400 font-medium">Employee</TableHead>
            <TableHead className="text-zinc-400 font-medium">Project</TableHead>
            <TableHead className="text-zinc-400 font-medium">Date & Time</TableHead>
            <TableHead className="text-zinc-400 font-medium">Hours</TableHead>
            <TableHead className="text-right text-zinc-400 font-medium">Status</TableHead>
            <TableHead className="text-right text-zinc-400 font-medium">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
               <TableRow>
                   <TableCell colSpan={6} className="text-center py-8 text-zinc-500">No pending entries found.</TableCell>
               </TableRow>
          ) : (
             entries.map((entry) => (
                <TableRow key={entry.id} className="border-b border-white/5 hover:bg-white/5">
                  {/* Employee */}
                  <TableCell>
                      <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 bg-blue-900 text-blue-200">
                             <AvatarFallback>{entry.userName.substring(0,2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                              <p className="font-medium text-white text-sm">{entry.userName}</p>
                              <p className="text-xs text-zinc-500">EMP{entry.id.substring(20)}</p>
                          </div>
                      </div>
                  </TableCell>
                  
                  {/* Project */}
                  <TableCell className="text-zinc-300 text-sm">
                      {entry.projectName}
                  </TableCell>
                  
                  {/* Date & Time */}
                  <TableCell>
                      <div className="text-sm text-zinc-300">{format(new Date(entry.date), "MMM dd, yyyy")}</div>
                      <div className="text-xs text-zinc-500">{entry.startTime} - {entry.endTime}</div>
                  </TableCell>

                  {/* Hours */}
                  <TableCell className="text-white font-medium">
                      {entry.totalHours.toFixed(1)}h
                  </TableCell>

                  {/* Status */}
                  <TableCell className="text-right">
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1 hover:bg-amber-500/20">
                          <Clock className="w-3 h-3" /> Pending
                      </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 hover:text-emerald-400 h-7 w-7 p-0 rounded-full"
                            onClick={() => handleApprove(entry.id)}
                            disabled={loadingId === entry.id}
                        >
                        <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            className="bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 h-7 w-7 p-0 rounded-full"
                            onClick={() => handleReject(entry.id)}
                            disabled={loadingId === entry.id}
                        >
                        <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
             ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
