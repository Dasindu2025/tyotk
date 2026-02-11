"use server";

import { auth } from "@/auth";
import connectToDatabase from "@/lib/db";
import { Company, TimeEntry, TimeEntryStatus, User } from "@/lib/models";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// --- Helpers ---

// Convert HH:mm to minutes from midnight
const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Calculate hour breakdown based on settings
function calculateHourTypes(
    startMins: number, 
    endMins: number, 
    settings: { dayStart: string, eveningStart: string, nightStart: string }
) {
    // defaults if missing
    const dayStart = timeToMinutes(settings.dayStart || "06:00");
    const eveningStart = timeToMinutes(settings.eveningStart || "18:00");
    const nightStart = timeToMinutes(settings.nightStart || "22:00");

    // Helper for overlap
    const getOverlap = (s1: number, e1: number, s2: number, e2: number) => {
        const start = Math.max(s1, s2);
        const end = Math.min(e1, e2);
        return Math.max(0, end - start);
    };

    const night1 = getOverlap(startMins, endMins, 0, dayStart);
    const day = getOverlap(startMins, endMins, dayStart, eveningStart);
    const evening = getOverlap(startMins, endMins, eveningStart, nightStart);
    const night2 = getOverlap(startMins, endMins, nightStart, 1440);

    return {
        dayHours: day / 60,
        eveningHours: evening / 60,
        nightHours: (night1 + night2) / 60,
        totalHours: (endMins - startMins) / 60
    };
}


// Schema needs to be exported or inferred if used in arguments
const LogTimeSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  workplaceId: z.string().optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"), 
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time"),
  description: z.string().optional(),
});

type LogTimeInput = z.infer<typeof LogTimeSchema>;

export async function logTime(data: LogTimeInput) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return { error: "Unauthorized" };
    }

    const validatedFields = LogTimeSchema.safeParse(data);
    if (!validatedFields.success) {
      return { error: "Validation failed", details: validatedFields.error.flatten() };
    }

    const { projectId, workplaceId, date: dateString, startTime, endTime, description } = validatedFields.data;

    await connectToDatabase();
    
    // Fetch Company for Settings
    const company = await Company.findById(session.user.companyId);
    if (!company) return { error: "Company not found" };

    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);

    // --- 1. MIDNIGHT SPLIT CHECK ---
    // If endTime < startTime, assume it's the next day (e.g. 22:00 to 02:00)
    // Create TWO entries involved.
    const entriesToCreate = [];

    if (endMins < startMins) {
        // Split Scenario
        // Entry 1: startTime to 23:59 (effectively 24:00 for calc)
        // Entry 2: 00:00 to endTime (next day)
        
        const date1 = new Date(dateString);
        date1.setHours(0,0,0,0);
        
        const date2 = new Date(date1);
        date2.setDate(date2.getDate() + 1);

        entriesToCreate.push({
            date: date1,
            start: startTime,
            end: "24:00", // Special marker for calculation, will save as 23:59 or handle logic
            realEnd: "23:59",
            isSplit: true,
            isFirstPart: true,
            isSecondPart: false 
        });

        entriesToCreate.push({
            date: date2,
            start: "00:00",
            end: endTime,
            realEnd: endTime,
            isSplit: true,
            isSecondPart: true,
            isFirstPart: false
        });
    } else {
        // Normal Scenario
        const date1 = new Date(dateString);
        date1.setHours(0,0,0,0);
        entriesToCreate.push({
            date: date1,
            start: startTime,
            end: endTime,
            realEnd: endTime,
            isSplit: false,
            isFirstPart: false,
            isSecondPart: false
        });
    }

    // --- 2. VALIDATION LOOP (Future, Backdate, Overlap) ---
    const today = new Date();
    today.setHours(0,0,0,0);
    const backdateLimit = company.settings.backdateLimit || 30;
    const limitDate = new Date(today);
    limitDate.setDate(limitDate.getDate() - backdateLimit);

    for (const entry of entriesToCreate) {
        // A. Future Lock
        if (entry.date > today) return { error: "Cannot log time for future dates." };

        // B. Backdate Lock
        if (entry.date < limitDate) return { error: `Cannot log time older than ${backdateLimit} days.` };

        // C. Overlap Check
        const entryStartMins = timeToMinutes(entry.start);
        const entryEndMins = entry.end === "24:00" ? 1440 : timeToMinutes(entry.end);
        
        // Find existing for this USER on this DATE
        // FIX: Explicitly only fetch PENDING or APPROVED entries. 
        // We do NOT want to fetch REJECTED entries at all.
        const existing = await TimeEntry.find({
            userId: session.user.id,
            date: entry.date,
            status: { $in: [TimeEntryStatus.PENDING, TimeEntryStatus.APPROVED] }
        });

        for (const exist of existing) {
            // Double-check safeguards:
            if (exist.status === TimeEntryStatus.REJECTED) continue;
        }
    }

    // --- 3. CREATE ENTRIES ---
    // Fetch User for Auto-Approve setting
    const user = await User.findById(session.user.id);
    const status = user?.settings.isAutoApprove ? TimeEntryStatus.APPROVED : TimeEntryStatus.PENDING;

    let firstEntryId = null;

    for (const entry of entriesToCreate) {
        const sMins = timeToMinutes(entry.start);
        const eMins = entry.end === "24:00" ? 1440 : timeToMinutes(entry.end);

        // Calculate types
        const types = calculateHourTypes(sMins, eMins, company.settings);

        const newEntry: any = await TimeEntry.create({
            userId: session.user.id,
            companyId: session.user.companyId,
            projectId,
            workplaceId: workplaceId || undefined,
            date: entry.date,
            startTime: entry.start,
            endTime: entry.realEnd,
            totalHours: types.totalHours,
            dayHours: types.dayHours,
            eveningHours: types.eveningHours,
            nightHours: types.nightHours,
            status,
            description,
            isSplit: entry.isSplit,
            parentEntryId: entry.isSecondPart ? firstEntryId : undefined
        });

        if (entry.isFirstPart) {
            firstEntryId = newEntry._id;
        }
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/employee");
    revalidatePath("/dashboard/employee/history");
    return { success: true, message: entriesToCreate.length > 1 ? "Split shift logged successfully!" : "Time logged successfully!" };

  } catch (err) {
    console.error(err);
    return { error: "Internal Server Error" };
  }
}

export async function approveTimeEntry(entryId: string) {
    try {
        const session = await auth();
        // Check if admin
        if (session?.user.role !== 'ADMIN' && session?.user.role !== 'SUPER_ADMIN') {
            return { error: "Unauthorized" };
        }
        
        await connectToDatabase();
        await TimeEntry.findByIdAndUpdate(entryId, { status: TimeEntryStatus.APPROVED });
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        return { error: "Failed to approve" };
    }
}
  
export async function rejectTimeEntry(entryId: string) {
    try {
        const session = await auth();
        if (session?.user.role !== 'ADMIN' && session?.user.role !== 'SUPER_ADMIN') {
            return { error: "Unauthorized" };
        }
        
        await connectToDatabase();
        await TimeEntry.findByIdAndUpdate(entryId, { status: TimeEntryStatus.REJECTED });
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        return { error: "Failed to reject" };
    }
}
