import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;

  if (role === 'SUPER_ADMIN') {
    // For now, there isn't a dedicated super admin page, keep them here or redirect
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
            <p>Global stats coming soon.</p>
        </div>
    )
  }

  if (role === 'ADMIN') {
     // Redirect to the actual Admin Dashboard
     redirect("/dashboard/admin");
  }

  // Default to Employee Dashboard
  redirect("/dashboard/employee");
}
