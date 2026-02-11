"use server";

import { auth } from "@/auth";
import connectToDatabase from "@/lib/db";
import { TimeEntry, TimeEntryStatus } from "@/lib/models";
import { revalidatePath } from "next/cache";

export async function getPendingApprovals() {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') return [];

  await connectToDatabase();

  const entries = await TimeEntry.find({
      companyId: session.user.companyId,
      status: TimeEntryStatus.PENDING
  })
  .populate('userId', 'name image email')
  .populate('projectId', 'name code')
  .sort({ date: -1 })
  .lean();

  return entries.map(e => ({
      id: e._id.toString(),
      user: {
          name: (e.userId as any).name,
          image: (e.userId as any).image,
          email: (e.userId as any).email,
          empId: "EMP" + (e.userId as any)._id.toString().substring(18).toUpperCase() // Pseudo ID
      },
      project: {
          name: (e.projectId as any).name,
          code: (e.projectId as any).code
      },
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      totalHours: e.totalHours,
      description: e.description || "No description provided."
  }));
}
