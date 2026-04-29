import { prisma } from "@/lib/prisma";
import { formatKES, formatDate } from "@/lib/utils";
import { currentWorkspaceId } from "@/lib/workspace";
import Link from "next/link";
import WorkCalendar, { type CalendarJob, type CalendarWorker } from "./WorkCalendar";
import { detectJobRisks, type JobRisk } from "@/lib/risk-detection";
import OnboardingChecklist from "./OnboardingChecklist";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Wrench, Clock, AlertTriangle, TrendingUp,
  CheckCircle, Calendar, FileText, Users, Sparkles,
  ArrowRight, DollarSign, ReceiptText, X, ChevronRight,
  Activity, CircleDollarSign, BarChart3,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const hh = Math.floor(m / 60);
  if (hh < 24) return `${hh}h ago`;
  return `${Math.floor(hh / 24)}d ago`;
}

function JobStatusIcon({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    ASSIGNED:   { bg: "bg-[#DBEAFE]", color: "text-[#2563EB]" },
    IN_PROGRESS:{ bg: "bg-[#DCFCE7]", color: "text-[#16A34A]" },
    COMPLETED_PENDING_VERIFICATION: { bg: "bg-[#EDE9FE]", color: "text-[#7C3AED]" },
    VERIFIED:   { bg: "bg-[#DCFCE7]", color: "text-[#16A34A]" },
    POSTPONED:  { bg: "bg-[#FEF3C7]", color: "text-[#D97706]" },
    ISSUE_REPORTED: { bg: "bg-[#FEE2E2]", color: "text-[#DC2626]" },
    DECLINED:   { bg: "bg-[#FEE2E2]", color: "text-[#DC2626]" },
    CANCELLED:  { bg: "bg-[#F1F5F9]", color: "text-[#64748B]" },
    CLOSED:     { bg: "bg-[#F1F5F9]", color: "text-[#64748B]" },
  };
  const s = map[status] ?? { bg: "bg-[#F1F5F9]", color: "text-[#64748B]" };
  return (
    <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 ${s.bg}`}>
      <Wrench className={`w-4 h-4 ${s.color}`} />
    </div>
  );
}

// ── Priority Alert panel ──────────────────────────────────────────────────────

function NeedsAttentionPanel({ risks }: { risks: JobRisk[] }) {
  if (risks.length === 0) {
    return (
      <div className="ff-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#F1F5F9] flex items-center justify-between">
          <h2 className="ff-section-title flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#94A3B8]" />
            Needs Attention
          </h2>
          <Link href="/admin/ai" className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium flex items-center gap-1">
            View all alerts <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="px-5 py-8 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-[#16A34A] shrink-0" />
          <p className="text-sm font-medium text-[#16A34A]">All active jobs look good — no issues detected.</p>
        </div>
      </div>
    );
  }

  const shown = risks.slice(0, 3);
  return (
    <div className="ff-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#F1F5F9] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="ff-section-title">Needs Attention</h2>
          <span className="px-1.5 py-0.5 bg-[#FEE2E2] text-[#DC2626] text-[10px] font-bold rounded-full leading-none">
            {risks.length}
          </span>
        </div>
        <Link href="/admin/ai" className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium flex items-center gap-1">
          View all alerts <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="divide-y divide-[#F1F5F9]">
        {shown.map((risk, i) => {
          const sevCls: Record<string, string> = {
            HIGH: "border-l-[#DC2626] bg-[#FFF8F8]",
            MEDIUM: "border-l-[#D97706] bg-[#FFFDF5]",
            LOW: "border-l-[#2563EB]",
          };
          const badgeCls: Record<string, string> = {
            HIGH: "bg-[#FEE2E2] text-[#DC2626]",
            MEDIUM: "bg-[#FEF3C7] text-[#D97706]",
            LOW: "bg-[#DBEAFE] text-[#2563EB]",
          };
          return (
            <div
              key={i}
              className={`px-5 py-4 flex items-start gap-3 border-l-4 ${sevCls[risk.severity] ?? "border-l-slate-300"}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${badgeCls[risk.severity] ?? "bg-[#F1F5F9] text-[#64748B]"}`}>
                    {risk.severity === "HIGH" ? "HIGH ISSUE" : risk.severity}
                  </span>
                  <span className="text-[10px] text-[#94A3B8] font-mono">{risk.jobNumber}</span>
                </div>
                <p className="text-[13px] font-semibold text-[#0F172A] truncate">{risk.clientName}</p>
                <p className="text-xs text-[#64748B] mt-0.5">{risk.description}</p>
              </div>
              <Link
                href={`/admin/jobs/${risk.jobId}`}
                className="shrink-0 text-xs bg-[#2563EB] text-white px-3 py-1.5 rounded-[8px] font-semibold hover:bg-[#1D4ED8] transition-colors"
              >
                View job
              </Link>
            </div>
          );
        })}
        {risks.length > 3 && (
          <div className="px-5 py-2.5 text-center">
            <Link href="/admin/ai" className="text-xs text-[#64748B] hover:text-[#2563EB]">
              +{risks.length - 3} more issues — view in AI Copilot
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Top Services panel ────────────────────────────────────────────────────────

function TopServicesPanel({ services }: { services: { jobType: string; count: number }[] }) {
  const max = services[0]?.count ?? 1;
  return (
    <div className="ff-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#F1F5F9] flex items-center justify-between">
        <h2 className="ff-section-title flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#94A3B8]" />
          Top Services This Month
        </h2>
        <Link href="/admin/jobs" className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium flex items-center gap-1">
          All jobs <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {services.length === 0 ? (
        <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 rounded-[10px] bg-[#F1F5F9] flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-[#94A3B8]" />
          </div>
          <p className="text-sm text-[#64748B]">No jobs this month yet</p>
        </div>
      ) : (
        <div className="px-5 py-4 space-y-3">
          {services.map((s) => (
            <div key={s.jobType}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-medium text-[#334155] truncate">{s.jobType}</span>
                <span className="text-[13px] font-bold text-[#0F172A] shrink-0 ml-2">
                  {s.count} {s.count === 1 ? "job" : "jobs"}
                </span>
              </div>
              <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2563EB] rounded-full transition-all"
                  style={{ width: `${Math.round((s.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
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
    activeJobs, pendingVerification, postponedJobs,
    monthRevenue, monthInvoiced, outstandingInvoices, overdueCount,
    recentJobs, workers, calendarJobs, risks, topServiceRows,
    companyNameSetting, industrySetting, jobTypesSetting, zonesSetting, documentConfigSetting,
    workerCount, clientCount, assetCount, jobCount, completedJobCount,
  ] = await Promise.all([
    prisma.job.count({ where: { workspaceId, status: { in: ["ASSIGNED", "IN_PROGRESS"] } } }),
    prisma.job.count({ where: { workspaceId, status: "COMPLETED_PENDING_VERIFICATION" } }),
    prisma.job.count({ where: { workspaceId, status: { in: ["POSTPONED", "ISSUE_REPORTED"] } } }),
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { workspaceId, status: "PAID", paidAt: { gte: startOfMonth } } }),
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { workspaceId, status: { not: "CANCELLED" }, createdAt: { gte: startOfMonth } } }),
    prisma.invoice.aggregate({ _sum: { amount: true }, where: { workspaceId, status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] } } }),
    prisma.invoice.count({ where: { workspaceId, status: "OVERDUE" } }),
    prisma.job.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { workers: { select: { name: true } } },
    }),
    prisma.user.findMany({ where: { workspaceId, role: "TECHNICIAN" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.job.findMany({
      where: { workspaceId, scheduledDate: { gte: weekStart, lt: weekEnd }, status: { notIn: ["CANCELLED"] } },
      include: { workers: { select: { id: true } } },
      orderBy: { scheduledDate: "asc" },
    }),
    detectJobRisks(workspaceId),
    prisma.job.groupBy({
      by: ["jobType"],
      where: { workspaceId, createdAt: { gte: startOfMonth } },
      _count: { _all: true },
      orderBy: { _count: { jobType: "desc" } },
      take: 5,
    }),
    prisma.setting.findFirst({ where: { workspaceId, key: "company_name" } }),
    prisma.setting.findFirst({ where: { workspaceId, key: "industry" } }),
    prisma.setting.findFirst({ where: { workspaceId, key: "job_types" } }),
    prisma.setting.findFirst({ where: { workspaceId, key: "zones" } }),
    prisma.setting.findFirst({ where: { workspaceId, key: "enabled_documents" } }),
    prisma.user.count({ where: { workspaceId, role: "TECHNICIAN" } }),
    prisma.client.count({ where: { workspaceId } }),
    prisma.asset.count({ where: { workspaceId } }),
    prisma.job.count({ where: { workspaceId } }),
    prisma.job.count({ where: { workspaceId, status: { in: ["VERIFIED", "CLOSED"] } } }),
  ]);

  const jobTypesList: string[] = jobTypesSetting?.value ? JSON.parse(jobTypesSetting.value) : [];
  const zonesList: string[] = zonesSetting?.value ? JSON.parse(zonesSetting.value) : [];

  const onboarding = {
    hasCompanyName:    !!(companyNameSetting?.value?.trim()),
    hasIndustry:       !!(industrySetting?.value?.trim()),
    hasJobTypes:       jobTypesList.length > 0,
    hasZones:          zonesList.length > 0,
    hasDocumentConfig: !!(documentConfigSetting?.value?.trim()),
    hasWorkers:        workerCount > 0,
    hasClients:        clientCount > 0,
    hasAssets:         assetCount > 0,
    hasFirstJob:       jobCount > 0,
    hasCompletedJob:   completedJobCount > 0,
  };

  const topServices = topServiceRows.map(r => ({
    jobType: r.jobType,
    count: r._count._all,
  }));

  return {
    activeJobs, pendingVerification, postponedJobs,
    monthRevenue, monthInvoiced, outstandingInvoices, overdueCount,
    recentJobs, workers, calendarJobs, risks, onboarding, topServices,
    totalInvoicedMonth: monthInvoiced._sum.amount ?? 0,
    outstanding: outstandingInvoices._sum.amount ?? 0,
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
  const collectionRate = data.totalInvoicedMonth > 0
    ? Math.round((revenue / data.totalInvoicedMonth) * 100)
    : 0;

  const calendarWorkers: CalendarWorker[] = data.workers;
  const calendarJobsList: CalendarJob[] = data.calendarJobs.map((j) => ({
    id: j.id,
    clientName: j.clientName,
    jobType: j.jobType,
    scheduledDate: j.scheduledDate?.toISOString() ?? "",
    workerIds: j.workers.map((w) => w.id),
  }));

  // ── Stat cards config ─────────────────────────────────────────────────────
  const statCards = [
    {
      label: "Active Jobs",
      value: data.activeJobs,
      sub: `${data.activeJobs === 1 ? "1 assigned" : `${data.activeJobs} in progress`}`,
      iconBg: "bg-[#DBEAFE]",
      iconColor: "text-[#2563EB]",
      Icon: Wrench,
      href: "/admin/jobs?status=IN_PROGRESS",
    },
    {
      label: "Awaiting Verification",
      value: data.pendingVerification,
      sub: "Pending OTP",
      iconBg: "bg-[#EDE9FE]",
      iconColor: "text-[#7C3AED]",
      Icon: Clock,
      href: "/admin/jobs?status=COMPLETED_PENDING_VERIFICATION",
    },
    {
      label: "Need Attention",
      value: data.postponedJobs,
      sub: "Postponed / issues",
      iconBg: "bg-[#FEE2E2]",
      iconColor: "text-[#DC2626]",
      Icon: AlertTriangle,
      href: "/admin/jobs?status=POSTPONED",
    },
    {
      label: "Revenue This Month",
      value: formatKES(revenue),
      sub: null,
      desc: (
        <div className="space-y-0.5">
          <p className="text-xs text-[#64748B]">{formatKES(data.totalInvoicedMonth)} invoiced</p>
          {data.outstanding > 0 ? (
            <p className="text-xs text-[#DC2626] font-medium flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {formatKES(data.outstanding)} outstanding
              {data.overdueCount > 0 && ` · ${data.overdueCount} overdue`}
            </p>
          ) : (
            <p className="text-xs text-[#16A34A] font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />All invoices cleared
            </p>
          )}
        </div>
      ),
      iconBg: "bg-[#DCFCE7]",
      iconColor: "text-[#16A34A]",
      Icon: CircleDollarSign,
      href: "/admin/invoices",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Onboarding banner */}
      <OnboardingChecklist state={data.onboarding} />

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="ff-card p-5 hover:shadow-card-hover transition-shadow duration-150 block"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 ${s.iconBg}`}>
                <s.Icon className={`w-5 h-5 ${s.iconColor}`} />
              </div>
              <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide text-right leading-tight mt-1">
                {s.label}
              </p>
            </div>
            <p className="text-2xl font-bold text-[#0F172A] leading-none">{s.value}</p>
            <div className="mt-2 flex items-end justify-between">
              {s.desc ? s.desc : <p className="text-xs text-[#64748B]">{s.sub}</p>}
              <ChevronRight className="w-4 h-4 text-[#E2E8F0] shrink-0" />
            </div>
          </Link>
        ))}
      </div>

      {/* Middle row: Needs Attention + Work Calendar */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <NeedsAttentionPanel risks={data.risks} />
        <WorkCalendar
          workers={calendarWorkers}
          jobs={calendarJobsList}
          weekStartISO={weekStart.toISOString()}
        />
      </div>

      {/* Bottom row: Recent Jobs + Invoice Summary + Top Services */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Recent Jobs */}
        <div className="ff-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#F1F5F9] flex items-center justify-between">
            <h2 className="ff-section-title">Recent Jobs</h2>
            <Link href="/admin/jobs" className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium flex items-center gap-1">
              View all jobs <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {data.recentJobs.length === 0 ? (
              <div className="px-5 py-12 flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 rounded-[10px] bg-[#F1F5F9] flex items-center justify-center">
                  <Wrench className="w-4 h-4 text-[#94A3B8]" />
                </div>
                <p className="text-sm text-[#64748B]">No jobs yet — create your first job</p>
              </div>
            ) : (
              data.recentJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/admin/jobs/${job.id}`}
                  className="px-5 py-3.5 flex items-center gap-3 hover:bg-[#F8FAFC] transition-colors"
                >
                  <JobStatusIcon status={job.status} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[#0F172A] truncate">{job.clientName}</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5 truncate">
                      {job.jobType}
                      {job.workers.length > 0 && ` · ${job.workers[0].name}`}
                      {" · "}{timeAgo(job.updatedAt)}
                    </p>
                  </div>
                  <StatusBadge status={job.status} size="xs" />
                </Link>
              ))
            )}
          </div>
          {data.recentJobs.length > 0 && (
            <div className="px-5 py-2.5 border-t border-[#F1F5F9] text-center">
              <Link href="/admin/jobs" className="text-xs text-[#64748B] hover:text-[#2563EB] font-medium transition-colors">
                View all jobs →
              </Link>
            </div>
          )}
        </div>

        {/* Top Services */}
        <TopServicesPanel services={data.topServices} />

        {/* Payment Snapshot */}
        <div className="ff-card overflow-hidden xl:col-span-1">
          <div className="px-5 py-3.5 border-b border-[#F1F5F9] flex items-center justify-between">
            <h2 className="ff-section-title">Payment Snapshot</h2>
            <Link href="/admin/invoices" className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium flex items-center gap-1">
              View all invoices <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              <div className="rounded-[14px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Collection Rate</p>
                    <p className="mt-1 text-2xl font-bold text-[#0F172A] leading-none">{collectionRate}%</p>
                  </div>
                  <div className="w-10 h-10 rounded-[12px] bg-[#DCFCE7] flex items-center justify-center shrink-0">
                    <ReceiptText className="w-5 h-5 text-[#16A34A]" />
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#16A34A]"
                    style={{ width: `${Math.min(100, collectionRate)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-3">
                {[
                  { label: "Invoiced", value: formatKES(data.totalInvoicedMonth), tone: "text-[#2563EB]", bg: "bg-[#EFF6FF]" },
                  { label: "Collected", value: formatKES(revenue), tone: "text-[#16A34A]", bg: "bg-[#F0FDF4]" },
                  { label: "Outstanding", value: formatKES(data.outstanding), tone: data.outstanding > 0 ? "text-[#D97706]" : "text-[#64748B]", bg: data.outstanding > 0 ? "bg-[#FFFBEB]" : "bg-[#F8FAFC]" },
                  { label: "Overdue", value: data.overdueCount > 0 ? `${data.overdueCount}` : "None", tone: data.overdueCount > 0 ? "text-[#DC2626]" : "text-[#64748B]", bg: data.overdueCount > 0 ? "bg-[#FEF2F2]" : "bg-[#F8FAFC]" },
                ].map((item) => (
                  <div key={item.label} className={`rounded-[12px] ${item.bg} px-3 py-3`}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{item.label}</p>
                    <p className={`mt-1 text-sm font-semibold leading-tight ${item.tone}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
