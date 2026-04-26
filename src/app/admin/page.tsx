import { prisma } from "@/lib/prisma";
import { formatKES, statusColor, statusLabel, formatDate } from "@/lib/utils";
import { currentWorkspaceId } from "@/lib/workspace";
import Link from "next/link";
import WorkCalendar, { type CalendarJob, type CalendarWorker } from "./WorkCalendar";
import { detectJobRisks, type JobRisk } from "@/lib/risk-detection";

// ── Flat SVG icons ────────────────────────────────────────────────────────────
function IconWrench() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconAlert() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function IconRevenue() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// ── Risk panel ────────────────────────────────────────────────────────────────
const SEVERITY_STYLE: Record<string, string> = {
  HIGH: "bg-red-50 border-red-200",
  MEDIUM: "bg-amber-50 border-amber-200",
  LOW: "bg-blue-50 border-blue-200",
};
const SEVERITY_BADGE: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-blue-100 text-blue-700",
};

function RiskPanel({ risks }: { risks: JobRisk[] }) {
  const highCount = risks.filter((r) => r.severity === "HIGH").length;
  const displayed = risks.slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-gray-900">Job Risks</h2>
          {risks.length > 0 && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${highCount > 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
              {risks.length} {risks.length === 1 ? "issue" : "issues"}
            </span>
          )}
        </div>
        <Link href="/admin/ai" className="text-xs text-blue-600 hover:underline">
          AI Copilot →
        </Link>
      </div>

      {risks.length === 0 ? (
        <div className="px-5 py-6 flex items-center gap-3 text-green-700">
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <p className="text-sm font-medium">All active jobs look good — no risks detected.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {displayed.map((risk, i) => (
            <div key={i} className={`px-5 py-3 flex items-start gap-3 ${SEVERITY_STYLE[risk.severity] ?? ""}`}>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full whitespace-nowrap mt-0.5 ${SEVERITY_BADGE[risk.severity] ?? ""}`}>
                {risk.severity}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {risk.jobNumber} · {risk.clientName}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">{risk.description}</p>
                <p className="text-xs text-gray-400 mt-0.5">{risk.action}</p>
              </div>
              <Link
                href={`/admin/jobs`}
                className="text-xs text-blue-600 hover:underline whitespace-nowrap"
              >
                View
              </Link>
            </div>
          ))}
          {risks.length > 5 && (
            <div className="px-5 py-2.5 text-xs text-gray-400 text-center">
              +{risks.length - 5} more — <Link href="/admin/ai" className="text-blue-600 hover:underline">view all in AI Copilot</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────
function getWeekStart(weekParam?: string): Date {
  if (weekParam) {
    const d = new Date(weekParam);
    if (!isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }
  const now = new Date();
  const dow = now.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  now.setDate(now.getDate() + diff);
  now.setHours(0, 0, 0, 0);
  return now;
}

async function getDashboardData(weekStart: Date) {
  const workspaceId = await currentWorkspaceId();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const [
    activeJobs,
    pendingVerification,
    postponedJobs,
    monthRevenue,
    recentNotifications,
    recentJobs,
    workers,
    calendarJobs,
    risks,
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
    prisma.user.findMany({
      where: { workspaceId, role: "TECHNICIAN" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.job.findMany({
      where: {
        workspaceId,
        scheduledDate: { gte: weekStart, lt: weekEnd },
        status: { notIn: ["CANCELLED"] },
      },
      include: { workers: { select: { id: true } } },
      orderBy: { scheduledDate: "asc" },
    }),
    detectJobRisks(workspaceId),
  ]);

  return {
    activeJobs, pendingVerification, postponedJobs, monthRevenue,
    recentNotifications, recentJobs, workers, calendarJobs, risks,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { week?: string };
}) {
  const weekStart = getWeekStart(searchParams?.week);
  const data = await getDashboardData(weekStart);
  const revenue = data.monthRevenue._sum.amount ?? 0;

  const statCards = [
    {
      label: "Active Jobs",
      value: data.activeJobs,
      icon: <IconWrench />,
      color: "bg-blue-500",
      link: "/admin/jobs?status=IN_PROGRESS",
    },
    {
      label: "Awaiting Verification",
      value: data.pendingVerification,
      icon: <IconClock />,
      color: "bg-amber-500",
      link: "/admin/jobs?status=COMPLETED_PENDING_VERIFICATION",
    },
    {
      label: "Need Attention",
      value: data.postponedJobs,
      icon: <IconAlert />,
      color: "bg-red-500",
      link: "/admin/jobs?status=POSTPONED",
    },
    {
      label: "Revenue This Month",
      value: formatKES(revenue),
      icon: <IconRevenue />,
      color: "bg-green-500",
      link: "/admin/invoices",
    },
  ];

  const calendarWorkers: CalendarWorker[] = data.workers;
  const calendarJobs: CalendarJob[] = data.calendarJobs.map((j) => ({
    id: j.id,
    clientName: j.clientName,
    jobType: j.jobType,
    scheduledDate: j.scheduledDate?.toISOString() ?? "",
    workerIds: j.workers.map((w) => w.id),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Link
            key={s.label}
            href={s.link}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
              </div>
              <div className={`${s.color} w-11 h-11 rounded-xl flex items-center justify-center text-white`}>
                {s.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Risk panel */}
      <RiskPanel risks={data.risks} />

      {/* Work Calendar */}
      <WorkCalendar
        workers={calendarWorkers}
        jobs={calendarJobs}
        weekStartISO={weekStart.toISOString()}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent jobs */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Jobs</h2>
            <Link href="/admin/jobs" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentJobs.map((job) => (
              <div key={job.id} className="px-5 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{job.clientName}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {job.jobType} · {formatDate(job.updatedAt)}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ml-3 ${statusColor(job.status)}`}>
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
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="text-gray-400"><IconBell /></span>
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
              <p className="px-5 py-8 text-center text-sm text-gray-400">All caught up</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
