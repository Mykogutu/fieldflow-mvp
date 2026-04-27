import { prisma } from "@/lib/prisma";
import { formatKES, formatDate } from "@/lib/utils";
import { currentWorkspaceId } from "@/lib/workspace";
import Link from "next/link";
import WorkCalendar, { type CalendarJob, type CalendarWorker } from "./WorkCalendar";
import { detectJobRisks, type JobRisk } from "@/lib/risk-detection";
import {
  Wrench, Clock, AlertTriangle, TrendingUp,
  CheckCircle, Calendar, FileText, UserCheck, Sparkles,
} from "lucide-react";

// ── Sparkline SVGs (decorative) ───────────────────────────────────────────────
function SparkLine({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 80 28" className="w-20 h-7" fill="none">
      <path d="M0,18 C8,16 12,10 20,12 C28,14 32,22 42,16 C52,10 58,14 64,10 C70,6 74,8 80,4"
        stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function SparkLineDown({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 80 28" className="w-20 h-7" fill="none">
      <path d="M0,8 C8,10 12,14 20,12 C28,10 32,16 42,18 C52,20 58,16 64,20 C70,22 74,20 80,24"
        stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function SparkBars({ color }: { color: string }) {
  const h = [6, 10, 8, 14, 10, 16, 12, 18, 14, 20];
  return (
    <svg viewBox="0 0 80 28" className="w-20 h-7">
      {h.map((v, i) => (
        <rect key={i} x={i * 8} y={28 - v} width="6" height={v} fill={color} opacity="0.75" rx="1" />
      ))}
    </svg>
  );
}

function timeAgo(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const hh = Math.floor(m / 60);
  if (hh < 24) return `${hh}h ago`;
  return `${Math.floor(hh / 24)}d ago`;
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; cls: string; iconBg: string; iconColor: string }> = {
  ASSIGNED:   { label: "Assigned",    cls: "bg-blue-50 text-blue-700 border border-blue-200",       iconBg: "bg-blue-100",   iconColor: "text-blue-600"   },
  IN_PROGRESS:{ label: "In Progress", cls: "bg-indigo-50 text-indigo-700 border border-indigo-200", iconBg: "bg-indigo-100", iconColor: "text-indigo-600" },
  POSTPONED:  { label: "Postponed",   cls: "bg-amber-50 text-amber-700 border border-amber-200",    iconBg: "bg-amber-100",  iconColor: "text-amber-600"  },
  RESCHEDULED:{ label: "Rescheduled", cls: "bg-amber-50 text-amber-700 border border-amber-200",    iconBg: "bg-amber-100",  iconColor: "text-amber-600"  },
  COMPLETED_PENDING_VERIFICATION: { label: "Awaiting OTP", cls: "bg-purple-50 text-purple-700 border border-purple-200", iconBg: "bg-purple-100", iconColor: "text-purple-600" },
  VERIFIED:   { label: "Verified",    cls: "bg-green-50 text-green-700 border border-green-200",    iconBg: "bg-green-100",  iconColor: "text-green-600"  },
  CLOSED:     { label: "Closed",      cls: "bg-slate-100 text-slate-600 border border-slate-200",   iconBg: "bg-slate-100",  iconColor: "text-slate-500"  },
  DECLINED:   { label: "Declined",    cls: "bg-red-50 text-red-700 border border-red-200",          iconBg: "bg-red-100",    iconColor: "text-red-600"    },
  ISSUE_REPORTED: { label: "Issue",   cls: "bg-red-50 text-red-700 border border-red-200",          iconBg: "bg-red-100",    iconColor: "text-red-600"    },
  CANCELLED:  { label: "Cancelled",   cls: "bg-slate-100 text-slate-500 border border-slate-200",   iconBg: "bg-slate-100",  iconColor: "text-slate-400"  },
};
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: "bg-slate-100 text-slate-600 border border-slate-200", iconBg: "", iconColor: "" };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>;
}
function JobIcon({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { iconBg: "bg-slate-100", iconColor: "text-slate-400" };
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
      <Wrench className={`w-4 h-4 ${cfg.iconColor}`} />
    </div>
  );
}

// ── Notification icon ─────────────────────────────────────────────────────────
function NotifIcon({ type }: { type: string }) {
  const t = type.toUpperCase();
  if (t.includes("ISSUE") || t.includes("OVERDUE") || t.includes("DECLINED"))
    return <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0"><AlertTriangle className="w-4 h-4 text-red-500" /></div>;
  if (t.includes("VERIFIED"))
    return <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0"><CheckCircle className="w-4 h-4 text-green-500" /></div>;
  if (t.includes("PENDING") || t.includes("VERIFICATION"))
    return <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0"><Clock className="w-4 h-4 text-amber-500" /></div>;
  if (t.includes("INVOICE"))
    return <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><FileText className="w-4 h-4 text-slate-500" /></div>;
  if (t.includes("ASSIGN") || t.includes("JOB"))
    return <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><UserCheck className="w-4 h-4 text-blue-500" /></div>;
  return <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Calendar className="w-4 h-4 text-slate-400" /></div>;
}

// ── Priority Alert panel ──────────────────────────────────────────────────────
const SEV_BORDER: Record<string, string> = { HIGH: "border-l-red-500", MEDIUM: "border-l-amber-500", LOW: "border-l-blue-400" };
const SEV_BADGE: Record<string, string>  = { HIGH: "bg-red-100 text-red-700", MEDIUM: "bg-amber-100 text-amber-700", LOW: "bg-blue-100 text-blue-700" };

function PriorityAlert({ risks }: { risks: JobRisk[] }) {
  const highCount = risks.filter((r) => r.severity === "HIGH").length;
  const shown = risks.slice(0, 4);
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
          <h2 className="font-semibold text-slate-900">Operation Intelligence</h2>
          {risks.length > 0 && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${highCount > 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
              {risks.length}
            </span>
          )}
        </div>
        <Link href="/admin/ai" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
          View all alerts →
        </Link>
      </div>
      {risks.length === 0 ? (
        <div className="px-5 py-5 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
          <p className="text-sm font-medium text-green-700">All active jobs look good — no risks detected.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {shown.map((risk, i) => (
            <div key={i} className={`px-5 py-3.5 flex items-start gap-3 border-l-4 ${SEV_BORDER[risk.severity] ?? "border-l-slate-300"}`}>
              <span className={`mt-0.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${SEV_BADGE[risk.severity] ?? "bg-slate-100 text-slate-500"}`}>
                {risk.severity}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 truncate">{risk.clientName}</p>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">{risk.jobNumber}</p>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 shrink-0" />{risk.description}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{risk.action}</p>
              </div>
              <Link href={`/admin/jobs?highlight=${risk.jobId}`} className="shrink-0 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                View Job
              </Link>
            </div>
          ))}
          {risks.length > 4 && (
            <div className="px-5 py-2.5 text-xs text-slate-400 text-center">
              +{risks.length - 4} more —{" "}
              <Link href="/admin/ai" className="text-blue-600 hover:underline">view all in AI Copilot</Link>
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
    if (!isNaN(d.getTime())) { d.setHours(0, 0, 0, 0); return d; }
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
    activeJobs, pendingVerification, postponedJobs, monthRevenue,
    recentNotifications, recentJobs, workers, calendarJobs, risks,
  ] = await Promise.all([
    prisma.job.count({ where: { workspaceId, status: { in: ["ASSIGNED", "IN_PROGRESS"] } } }),
    prisma.job.count({ where: { workspaceId, status: "COMPLETED_PENDING_VERIFICATION" } }),
    prisma.job.count({ where: { workspaceId, status: { in: ["POSTPONED", "ISSUE_REPORTED"] } } }),
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { workspaceId, status: "PAID", paidAt: { gte: startOfMonth } } }),
    prisma.notification.findMany({ where: { workspaceId, isRead: false }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.job.findMany({ where: { workspaceId }, orderBy: { updatedAt: "desc" }, take: 6, include: { workers: { select: { name: true } } } }),
    prisma.user.findMany({ where: { workspaceId, role: "TECHNICIAN" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.job.findMany({
      where: { workspaceId, scheduledDate: { gte: weekStart, lt: weekEnd }, status: { notIn: ["CANCELLED"] } },
      include: { workers: { select: { id: true } } },
      orderBy: { scheduledDate: "asc" },
    }),
    detectJobRisks(workspaceId),
  ]);

  return { activeJobs, pendingVerification, postponedJobs, monthRevenue, recentNotifications, recentJobs, workers, calendarJobs, risks };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function DashboardPage({ searchParams }: { searchParams?: { week?: string } }) {
  const weekStart = getWeekStart(searchParams?.week);
  const data = await getDashboardData(weekStart);
  const revenue = data.monthRevenue._sum.amount ?? 0;

  const statCards = [
    {
      label: "Active Jobs",
      value: data.activeJobs,
      desc: <span className="text-slate-400">In progress</span>,
      Icon: Wrench,
      iconBg: "bg-blue-50", iconColor: "text-blue-600",
      spark: <SparkLine color="#3b82f6" />,
      link: "/admin/jobs?status=IN_PROGRESS",
    },
    {
      label: "Awaiting Verification",
      value: data.pendingVerification,
      desc: <span className="text-slate-400">Pending review</span>,
      Icon: Clock,
      iconBg: "bg-amber-50", iconColor: "text-amber-500",
      spark: <SparkLine color="#f59e0b" />,
      link: "/admin/jobs?status=COMPLETED_PENDING_VERIFICATION",
    },
    {
      label: "Need Attention",
      value: data.postponedJobs,
      desc: <span className="text-slate-400">Requires action</span>,
      Icon: AlertTriangle,
      iconBg: "bg-red-50", iconColor: "text-red-500",
      spark: <SparkLineDown color="#ef4444" />,
      link: "/admin/jobs?status=POSTPONED",
    },
    {
      label: "Revenue This Month",
      value: formatKES(revenue),
      desc: <span className="flex items-center gap-1 text-green-600 font-medium text-xs"><TrendingUp className="w-3 h-3" />18% vs last month</span>,
      Icon: TrendingUp,
      iconBg: "bg-green-50", iconColor: "text-green-600",
      spark: <SparkBars color="#22c55e" />,
      link: "/admin/invoices",
    },
  ];

  const calendarWorkers: CalendarWorker[] = data.workers;
  const calendarJobsList: CalendarJob[] = data.calendarJobs.map((j) => ({
    id: j.id,
    clientName: j.clientName,
    jobType: j.jobType,
    scheduledDate: j.scheduledDate?.toISOString() ?? "",
    workerIds: j.workers.map((w) => w.id),
  }));

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Link key={s.label} href={s.link} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.iconBg}`}>
                <s.Icon className={`w-5 h-5 ${s.iconColor}`} />
              </div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-right leading-tight mt-1">{s.label}</p>
            </div>
            <p className="text-2xl font-bold text-slate-900 leading-none mb-1">{s.value}</p>
            <div className="flex items-end justify-between mt-2">
              <div className="text-xs">{s.desc}</div>
              {s.spark}
            </div>
          </Link>
        ))}
      </div>

      {/* Middle: Priority Alert + Calendar side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PriorityAlert risks={data.risks} />
        <WorkCalendar workers={calendarWorkers} jobs={calendarJobsList} weekStartISO={weekStart.toISOString()} />
      </div>

      {/* Bottom: Recent Jobs + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Jobs */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent Jobs</h2>
            <Link href="/admin/jobs" className="text-xs text-blue-600 hover:text-blue-700 font-medium">View all jobs →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentJobs.map((job) => (
              <Link key={job.id} href={`/admin/jobs/${job.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                <JobIcon status={job.status} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">{job.clientName}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{job.jobType} · {formatDate(job.updatedAt)}</p>
                </div>
                <StatusBadge status={job.status} />
              </Link>
            ))}
            {data.recentJobs.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-slate-400">No jobs yet</p>
            )}
          </div>
          {data.recentJobs.length > 0 && (
            <div className="px-5 py-2.5 border-t border-gray-100 text-center">
              <Link href="/admin/jobs" className="text-xs text-slate-500 hover:text-blue-600 font-medium transition-colors">Load more ↓</Link>
            </div>
          )}
        </div>

        {/* Activity & Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Activity & Alerts</h2>
            <Link href="/admin/ai" className="text-xs text-blue-600 hover:text-blue-700 font-medium">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentNotifications.map((n) => (
              <div key={n.id} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                <NotifIcon type={n.type} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 leading-snug">{n.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{n.message}</p>
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
              </div>
            ))}
            {data.recentNotifications.length === 0 && (
              <div className="px-5 py-10 flex flex-col items-center gap-2 text-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <p className="text-sm text-slate-400">All caught up</p>
              </div>
            )}
          </div>
          {data.recentNotifications.length > 0 && (
            <div className="px-5 py-2.5 border-t border-gray-100 text-center">
              <Link href="/admin/ai" className="text-xs text-slate-500 hover:text-blue-600 font-medium transition-colors">View full activity log →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
