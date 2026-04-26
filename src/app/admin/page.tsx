import { prisma } from "@/lib/prisma";
import { formatKES, statusColor, statusLabel, formatDate } from "@/lib/utils";
import { currentWorkspaceId } from "@/lib/workspace";
import Link from "next/link";

async function getDashboardData() {
  const workspaceId = await currentWorkspaceId();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    activeJobs,
    pendingVerification,
    postponedJobs,
    monthRevenue,
    recentNotifications,
    recentJobs,
  ] = await Promise.all([
    prisma.job.count({ where: { workspaceId, status: { in: ["ASSIGNED", "IN_PROGRESS"] } } }),
    prisma.job.count({ where: { workspaceId, status: "COMPLETED_PENDING_VERIFICATION" } }),
    prisma.job.count({ where: { workspaceId, status: { in: ["POSTPONED", "ISSUE_REPORTED"] } } }),
    prisma.invoice.aggregate({
      _sum: { amount: true },
      where: { workspaceId, status: "PAID", paidAt: { gte: startOfMonth } },
    }),
    prisma.notification.findMany({
      where: { workspaceId, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.job.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { workers: { select: { name: true } } },
    }),
  ]);

  return { activeJobs, pendingVerification, postponedJobs, monthRevenue, recentNotifications, recentJobs };
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const revenue = data.monthRevenue._sum.amount ?? 0;

  const statCards = [
    { label: "Active Jobs", value: data.activeJobs, icon: "🔧", color: "bg-blue-500", link: "/admin/jobs?status=IN_PROGRESS" },
    { label: "Awaiting Verification", value: data.pendingVerification, icon: "⏳", color: "bg-yellow-500", link: "/admin/jobs?status=COMPLETED_PENDING_VERIFICATION" },
    { label: "Need Attention", value: data.postponedJobs, icon: "⚠️", color: "bg-red-500", link: "/admin/jobs?status=POSTPONED" },
    { label: "Revenue This Month", value: formatKES(revenue), icon: "💰", color: "bg-green-500", link: "/admin/invoices" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Link key={s.label} href={s.link} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
              </div>
              <div className={`${s.color} w-12 h-12 rounded-xl flex items-center justify-center text-xl`}>
                {s.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent jobs */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Jobs</h2>
            <Link href="/admin/jobs" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentJobs.map((job) => (
              <div key={job.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{job.clientName}</p>
                  <p className="text-xs text-gray-400">{job.jobType} · {formatDate(job.updatedAt)}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(job.status)}`}>
                  {statusLabel(job.status)}
                </span>
              </div>
            ))}
            {data.recentJobs.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-gray-400">No jobs yet</p>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Unread Alerts</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentNotifications.map((n) => (
              <div key={n.id} className="px-5 py-3">
                <p className="text-sm font-medium text-gray-900">{n.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-xs text-gray-300 mt-1">{formatDate(n.createdAt)}</p>
              </div>
            ))}
            {data.recentNotifications.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-gray-400">All caught up!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
