import { auth } from "@/auth";
import { TimeEntry, TimeEntryStatus, User, Project as ProjectModel } from "@/lib/models";
import connectToDatabase from "@/lib/db";
import { redirect } from "next/navigation";
import { ApprovalsTable } from "@/components/approvals-table";
import { AdminStats } from "@/components/admin-stats";
import { AdminCharts } from "@/components/admin-charts";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') redirect("/login");

  await connectToDatabase();

  // Fetch Real Data
  const pendingEntries = await TimeEntry.find({
      companyId: session.user.companyId,
      status: TimeEntryStatus.PENDING
  })
  .populate('userId', 'name')
  .populate('projectId', 'name')
  .sort({ date: -1 })
  .lean();

  const totalEmployees = await User.countDocuments({ companyId: session.user.companyId });
  const activeProjects = await ProjectModel.countDocuments({ companyId: session.user.companyId });
  
  // Aggregate Total Hours
  const totalHoursResult = await TimeEntry.aggregate([
      { $match: { companyId: session.user.companyId } },
      { $group: { _id: null, total: { $sum: "$totalHours" } } }
  ]);
  const totalHours = totalHoursResult[0]?.total || 0;
  
  // Serialize Data
  const serializedPending = pendingEntries.map(e => ({
      id: e._id.toString(),
      userName: (e.userId as any).name,
      projectName: (e.projectId as any).name,
      date: e.date.toISOString(),
      startTime: e.startTime,
      endTime: e.endTime,
      totalHours: e.totalHours,
  }));

  // --- Chart Data 1: Weekly Hours (Last 12 Weeks) ---
  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84); // 12 * 7

  const weeklyStats = await TimeEntry.aggregate([
    { 
        $match: { 
            companyId: session.user.companyId,
            date: { $gte: twelveWeeksAgo }
        } 
    },
    {
        $group: {
            _id: { $week: "$date" },
            totalHours: { $sum: "$totalHours" },
            minDate: { $min: "$date" }
        }
    },
    { $sort: { minDate: 1 } }
  ]);

  // Format for Chart (W1, W2...)
  // We map the results to a clean array, filling gaps if necessary (skipping gap filling for simplicity now)
  const chartWeeklyData = weeklyStats.map((w, index) => ({
      name: `W${index + 1}`,
      hours: w.totalHours
  }));


  // --- Chart Data 2: Hours by Project ---
  const projectStats = await TimeEntry.aggregate([
    { $match: { companyId: session.user.companyId } },
    { 
        $group: { 
            _id: "$projectId", 
            totalHours: { $sum: "$totalHours" } 
        } 
    },
    { $sort: { totalHours: -1 } },
    { $limit: 5 } // Top 5
  ]);

  // Populate names manually since we are using aggregate
  const projectColors = ["#2563EB", "#9333EA", "#10B981", "#F59E0B", "#EC4899"]; // Blue, Purple, Emerald, Amber, Pink
  
  const chartProjectData = await Promise.all(projectStats.map(async (p, i) => {
      const project = await ProjectModel.findById(p._id).select("name").lean();
      return {
          name: project ? project.name : "Unknown",
          value: Math.round((p.totalHours / (totalHours || 1)) * 100), // Percentage
          color: projectColors[i % projectColors.length]
      };
  }));

  return (
    <div className="flex flex-col gap-6">
       {/* Page Header */}
       <div>
           <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
           <p className="text-zinc-400">Overview of company performance and employee activities.</p>
       </div>

       {/* Stats Cards */}
       <AdminStats 
         totalEmployees={totalEmployees}
         activeProjects={activeProjects}
         pendingApprovals={pendingEntries.length}
         totalHours={totalHours}
       />

       {/* Charts Section */}
       <AdminCharts 
         weeklyData={chartWeeklyData}
         projectData={chartProjectData}
       />

       {/* Recent Entries / Approvals Table */}
       <div>
          <ApprovalsTable entries={serializedPending} />
       </div>
    </div>
  );
}
