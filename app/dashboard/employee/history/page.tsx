import { auth } from "@/auth";
import connectToDatabase from "@/lib/db";
import { TimeEntry } from "@/lib/models";
import EmployeeHistoryClient from "@/components/employee-history-client";
import { redirect } from "next/navigation";

export default async function EmployeeHistoryPage() {
  const session = await auth();
  if (!session) redirect("/login");

  await connectToDatabase();

  // Fetch entries for the user
  const entries = await TimeEntry.find({ userId: session.user.id })
    .populate('projectId', 'name code')     // Get project name and code
    .populate('workplaceId', 'name')        // Get workplace name
    .sort({ date: -1 })                     // Newest first
    .lean();

  // Transform to plain objects for client component
  const formattedEntries = entries.map((entry: any) => ({
    id: entry._id.toString(),
    date: entry.date.toISOString(),
    projectName: entry.projectId?.name || "Unknown Project",
    projectCode: entry.projectId?.code || "N/A",
    workplaceName: entry.workplaceId?.name || "Remote", // Default if null? or N/A
    totalHours: entry.totalHours,
    status: entry.status
  }));

  return (
    <EmployeeHistoryClient initialEntries={formattedEntries} />
  );
}

