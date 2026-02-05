import { auth } from "@/auth";
import { getPendingApprovals } from "@/actions/admin";
import { redirect } from "next/navigation";
import { ApprovalsList } from "@/components/approvals-list";

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') redirect("/dashboard");

  const pendingApprovals = await getPendingApprovals();

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">Time Approvals</h1>
        <p className="text-zinc-400">Review and approve employee time entries.</p>
      </div>
      
      <ApprovalsList initialEntries={pendingApprovals} />
    </div>
  );
}
