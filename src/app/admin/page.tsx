import { prisma } from "@/lib/prisma";
import { formatKES, formatDate } from "@/lib/utils";
import { currentWorkspaceId } from "@/lib/workspace";
import Link from "next/link";
import WorkCalendar, { type CalendarJob, type CalendarWorker } from "./WorkCalendar";
import { detectJobRisks, type JobRisk } from "@/lib/risk-detection";
import { Wrench, Clock, AlertTriangle, TrendingUp, Bell, CheckCircle } from "lucide-react";

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  ASSIGNED:   { label: "Assigned",    cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  IN_PROGRESS:{ label: "In Progress", cls: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  POSTPONED:  { label: "Postponed",   cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  RESCHEDULED:{ label: "Rescheduled", cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  COMPLETED_PENDING_VERIFICATION: { label: "Awaiting OTP", cls: "bg-purple-50 text-purple-700 border border-purple-200" },
  VERIFIED:   { label: "Verified",    cls: "bg-green-50 text-green-700 border border-green-200" },
  CLOSED:     { label: "Closed",      cls: "bg-slate-100 text-slate-600 border border-slate-200" },
  DECLINED:   { label: "Declined",    cls: "bg-red-50 text-red-700 border border-red-200" },
  ISSUE_REPORTED: { label: "Issue",   cls: "bg-red-50 text-red-700 border border-red-200" },
  CANCELLED:  { label: "Cancelled",   cls: "bg-slate-100 text-slate-500 border border-slate-200" },
};
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: "bg-slate-100 text-slate-600 border border-slate-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ── Risk panel ────────────────────────────────────────────────────────────────
const SEVERITY_DOT: Record<string, string> = {
  HIGH:   "bg-red-500",
  MEDIUM: "bg-amber-500",
  LOW:    "bg-blue-500",
};
const SEVERITY_TEXT: Record<string, string> = {
  HIGH:   "text-red-700",
  MEDIUM: "text-amber-700",
  LOW:    "text-blue-700",
};
const SEVERITY_BORDER: Record<string, string> = {
  HIGH:   "border-l-red-500",
  MEDIUM: "border-l-amber-500",
  LOW:    "border-l-blue-500",
};

function RiskPanel({ risks }: { risks: JobRisk[] }) {
  const highCount = risks.filter((r) => r.severity === "HIGH").length;
  const displayed = risks.slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-slate-900">Job Risks</h2>
          {risks.length > 0 && (
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                highCount > 0 ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {risks.length} {risks.length === 1 ? "issue" : "issues"}
            </span>
          )}
        </div>
        <Link href="/admin/ai" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
          AI Copilot
        </Link>
      </div>

      {risks.length === 0 ? (
        <div className="px-5 py-5 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
          <p className="text-sm font-medium text-green-700">
            All active jobs look good — no risks detected.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {displayed.map((risk, i) => (
            <div
              key={i}
              className={`px-5 py-3.5 flex items-start gap-3 border-l-4 ${SEVERITY_BORDER[risk.severity] ?? "border-l-slate-300"}`}
            >
              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT[risk.severity] ?? "bg-slate-400"}`} />
                <span className={`text-[10px] font-bold uppercase tracking-wide ${SEVERITY_TEXT[risk.severity] ?? "text-slate-600"}`}>
                  {risk.severity}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {risk.jobNumber} · {risk.clientName}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{risk.description}</p>
                <p className="text-xs text-slate-400 mt-0.5">{risk.action}</p>
              </div>
              <Link
                href="/admin/jobs"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap shrink-0"
              >
                View
              </Link>
            </div>
          ))}
          {risks.length > 5 && (
            <div className="px-5 py-2.5 text-xs text-slate-400 text-center">
              +{risks.length - 5} more —{" "}
              <Link href="/admin/ai" className="text-blue-600 hover:underline">
                view all in AI Copilot
              </Link>
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
      desc: "Currently in progress",
      Icon: Wrench,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      link: "/admin/jobs?status=IN_PROGRESS",
    },
    {
      label: "Awaiting Verification",
      value: data.pendingVerification,
      desc: "Awaiting client OTP",
      Icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      link: "/admin/jobs?status=COMPLETED_PENDING_VERIFICATION",
    },
    {
      label: "Need Attention",
      value: data.postponedJobs,
      desc: "Postponed or stalled",
      Icon: AlertTriangle,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      link: "/admin/jobs?status=POSTPONED",
    },
    {
      label: "Revenue This Month",
      value: formatKES(revenue),
      desc: "Paid invoices this month",
      Icon: TrendingUp,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
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
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Link
            key={s.label}
            href={s.link}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {s.label}
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1.5 leading-none">
                  {s.value}
                </p>
                <p className="text-xs text-slate-400 mt-1.5">{s.desc}</p>
              </div>
              <div
                className={`${s.iconBg} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}
              >
                <s.Icon className={`w-5 h-5 ${s.iconColor}`} />
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
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-slate-400" />
              <h2 className="font-semibold text-slate-900">Recent Jobs</h2>
            </div>
            <Link
              href="/admin/jobs"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentJobs.map((job) => (
              <div
                key={job.id}
                className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {job.clientName}
                  </p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {job.jobType} · {formatDate(job.updatedAt)}
                  </p>
                </div>
                <div className="ml-3 shrink-0">
                  <StatusBadge status={job.status} />
                </div>
              </div>
            ))}
            {data.recentJobs.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-slate-400">
                No jobs yet
              </p>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-900">Unread Alerts</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentNotifications.map((n) => (
              <div
                key={n.id}
                className="px-5 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <p className="text-sm font-medium text-slate-900">{n.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                  {n.message}
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  {formatDate(n.createdAt)}
                </p>
              </div>
            ))}
            {data.recentNotifications.length === 0 && (
              <div className="px-5 py-10 flex flex-col items-center gap-2 text-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <p className="text-sm text-slate-400">All caught up</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
