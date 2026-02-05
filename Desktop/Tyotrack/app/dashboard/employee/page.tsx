
import { auth } from "@/auth";
import { EmployeeDashboardClient } from "@/components/employee-dashboard-client";
import { Project, TimeEntry, Workplace, Company } from "@/lib/models";
import connectToDatabase from "@/lib/db";
import { redirect } from "next/navigation";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";

interface Props {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function EmployeeDashboardPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  await connectToDatabase();

  // 1. Determine Date Range (Default to current month)
  const today = new Date();
  let currentMonth = today;
  
  if (searchParams?.month && typeof searchParams.month === 'string') {
     try {
         currentMonth = parseISO(searchParams.month); // Expecting YYYY-MM-DD (e.g. first of month)
     } catch {
         currentMonth = today;
     }
  }

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);

  // 2. Fetch company settings
  const company = await Company.findById(session.user.companyId).lean();
  if (!company) redirect("/login");

  const companySettings = {
    dayStart: company.settings.dayStart,
    eveningStart: company.settings.eveningStart,
    nightStart: company.settings.nightStart
  };

  // 3. Fetch active projects & workplaces
  const projects = await Project.find({ companyId: session.user.companyId, status: 'ACTIVE' }).lean();
  const workplaces = await Workplace.find({ companyId: session.user.companyId }).lean();

  const serializedProjects = projects.map(p => ({
      id: p._id.toString(),
      name: p.name,
      code: p.code
  }));

  const serializedWorkplaces = workplaces.map(w => ({
      id: w._id.toString(),
      name: w.name,
      code: w.code
  }));

  // 4. Fetch Entries for the selected month
  const monthEntries = await TimeEntry.find({
      userId: session.user.id,
      date: { $gte: start, $lte: end }
  }).sort({ date: 1 }).lean();

  const serializedMonthEntries = monthEntries.map(e => ({
      id: e._id.toString(),
      projectId: e.projectId.toString(),
      projectCode: serializedProjects.find(p => p.id === e.projectId.toString())?.code || 'N/A',
      date: e.date.toISOString(),
      startTime: e.startTime,
      endTime: e.endTime,
      totalHours: e.totalHours,
      dayHours: e.dayHours,
      eveningHours: e.eveningHours,
      nightHours: e.nightHours,
      status: e.status
  }));

  return (
    <EmployeeDashboardClient 
      currentMonthStr={start.toISOString()} 
      projects={serializedProjects}
      workplaces={serializedWorkplaces}
      monthEntries={serializedMonthEntries}
      companySettings={companySettings}
    />
  );
}
