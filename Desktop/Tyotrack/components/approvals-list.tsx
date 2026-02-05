"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, Clock, Eye, Filter } from "lucide-react";
import { approveTimeEntry, rejectTimeEntry } from "@/actions/time-entry";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ApprovalEntry {
    id: string;
    user: {
        name: string;
        image?: string;
        email: string;
        empId: string;
    };
    project: {
        name: string;
        code: string;
    };
    date: Date;
    startTime: string;
    endTime: string;
    totalHours: number;
    description: string;
}

export function ApprovalsList({ initialEntries }: { initialEntries: ApprovalEntry[] }) {
    const [entries, setEntries] = useState(initialEntries);
    const [processingId, setProcessingId] = useState<string | null>(null);

    async function handleAction(id: string, action: 'approve' | 'reject') {
        setProcessingId(id);
        const fn = action === 'approve' ? approveTimeEntry : rejectTimeEntry;
        
        const res = await fn(id);
        
        if (res.error) {
            toast.error(res.error);
            setProcessingId(null);
        } else {
            toast.success(action === 'approve' ? "Time Entry Approved" : "Time Entry Rejected");
            // Remove from list
            setEntries(prev => prev.filter(e => e.id !== id));
            setProcessingId(null);
        }
    }

    if (entries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-[#111827] rounded-lg border border-white/5 text-zinc-500">
                <Check className="w-12 h-12 mb-4 text-emerald-500/20" />
                <p>All caught up! No pending approvals.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
             {/* Toolbar */}
             <div className="flex items-center justify-between bg-[#111827] p-3 rounded-lg border border-white/5">
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 text-zinc-400 hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-white/5">
                        <Filter className="w-4 h-4" /> Filters:
                    </div>
                    <span className="text-zinc-300">All Employees</span>
                    <span className="text-zinc-300">All Projects</span>
                </div>
                <div className="flex gap-2">
                     <Button variant="outline" size="sm" className="bg-transparent border-white/10 text-zinc-400 hover:text-white">
                        Select Multiple
                     </Button>
                     <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                        Approve All
                     </Button>
                </div>
             </div>

            <div className="flex flex-col gap-3">
                <AnimatePresence>
                {entries.map((entry) => (
                    <motion.div 
                        key={entry.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                        className="bg-[#111827] border border-white/5 p-4 rounded-lg flex flex-col gap-4"
                    >
                        {/* Header Row */}
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                {/* Only show Avatar if it exists, else Initials */}
                                <Avatar className="h-10 w-10 border border-white/10">
                                    <AvatarImage src={entry.user.image} />
                                    <AvatarFallback className="bg-blue-900 text-blue-100 text-xs">
                                        {entry.user.name.substring(0,2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-white">{entry.user.name}</h3>
                                        <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-[10px] px-1.5 py-0 h-5">
                                            {entry.user.empId}
                                        </Badge>
                                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] px-2 py-0.5 ml-2">
                                            <Clock className="w-3 h-3 mr-1" /> Pending
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-zinc-500 mt-0.5">
                                        Project: <span className="text-zinc-300 font-medium">{entry.project.name}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Meta Data */}
                            <div className="flex items-start gap-12 text-sm">
                                <div>
                                    <p className="text-zinc-500 text-xs uppercase tracking-wider">Date</p>
                                    <p className="text-zinc-300 font-medium mt-0.5">{format(new Date(entry.date), "MMM dd, yyyy")}</p>
                                </div>
                                <div>
                                    <p className="text-zinc-500 text-xs uppercase tracking-wider">Hours</p>
                                    <p className="text-blue-400 font-bold mt-0.5 text-base">{entry.totalHours.toFixed(1)}h</p>
                                </div>
                            </div>
                        </div>

                        {/* Description Box */}
                         <div className="bg-[#1F2937]/50 rounded p-3 text-sm text-zinc-400 font-mono border border-white/5 relative">
                            {entry.description}
                            {/* Quote icon decoration if desired */}
                         </div>

                        {/* Actions Footer */}
                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
                             <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                                <Eye className="w-4 h-4 mr-2" /> View Details
                             </Button>
                             <div className="h-4 w-px bg-white/10 mx-2"></div>
                             <Button 
                                variant="destructive" 
                                size="sm" 
                                className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
                                onClick={() => handleAction(entry.id, 'reject')}
                                disabled={!!processingId}
                             >
                                <X className="w-4 h-4 mr-2" /> Reject
                             </Button>
                             <Button 
                                size="sm" 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => handleAction(entry.id, 'approve')}
                                disabled={!!processingId}
                             >
                                <Check className="w-4 h-4 mr-2" /> Approve
                             </Button>
                        </div>
                    </motion.div>
                ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
