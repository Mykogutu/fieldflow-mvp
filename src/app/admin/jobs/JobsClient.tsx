"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createJob, reassignJob, rescheduleJob, updateJobStatus,
} from "@/app/actions/job-actions";
import { formatKES, formatDate } from "@/lib/utils";
import {
  Plus, X, Search, Filter, MoreHorizontal, Clock,
  AlertTriangle, Wrench, ChevronRight, Calendar,
  MessageSquare, ArrowRight, Minus,
} from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtScheduled(date: Date | string | null) {
  if (!date) return null;
  const d = new Date(date);
  return {
    day:  d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
  };
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const inputCls = "w-full bg-white border border-[#E2E8F0] rounded-[10px] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors";
const btnPrimary = "inline-flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2.5 rounded-[10px] text-sm font-semibold hover:bg-[#1D4ED8] transition-colors disabled:opacity-50";
const btnSecondary = "inline-flex items-center gap-2 bg-white border border-[#E2E8F0] text-[#334155] px-4 py-2.5 rounded-[10px] text-sm font-medium hover:bg-[#F8FAFC] transition-colors";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Worker { id: string; name: string; phone: string; baseZone?: string | null }
interface AssetOption { id: string; name: string; assetType: string; clientName: string }
interface Job {
  id: string; jobNumber: string; clientName: string; clientPhone: string;
  jobType: string; status: string; priority: string;
  location: string | null; scheduledDate: Date | string | null;
  quotedAmount: number | null; finalAmount: number | null;
  createdAt: Date | string; updatedAt: Date | string;
  workers: Worker[];
  invoice: { id: string; invoiceNumber: string; status: string; amount: number } | null;
  asset: { id: string; name: string; assetType: string } | null;
}
interface ClientOption { id: string; name: string; phone: string }

// ── Industry-specific fields (unchanged) ──────────────────────────────────────

const INDUSTRY_FIELDS: Record<string, { label: string; name: string; type?: string; placeholder?: string }[]> = {
  TANK_SERVICES: [
    { label: "Tank Capacity", name: "meta_tankCapacity", placeholder: "e.g. 5000L, 10000L" },
    { label: "Tank Type", name: "meta_tankType", placeholder: "Plastic, Steel, Underground…" },
    { label: "Tank Empty?", name: "meta_isEmptyConfirmed", placeholder: "Yes / No / Client will empty" },
    { label: "Warranty Eligible?", name: "meta_warrantyEligible", placeholder: "Yes / No" },
  ],
  FUEL_TRACKER: [
    { label: "Vehicle Registration", name: "meta_vehicleReg", placeholder: "KDA 123A" },
    { label: "Tracker Serial No.", name: "meta_trackerSerial", placeholder: "TRK-XXXXXXXX" },
    { label: "Fuel Sensor Serial", name: "meta_fuelSensorSerial", placeholder: "FS-XXXXXXXX" },
    { label: "SIM Number", name: "meta_simNumber", placeholder: "254 7XX XXX XXX" },
    { label: "Device Type", name: "meta_deviceType", placeholder: "GPS Tracker, Fuel Sensor…" },
    { label: "Calibration Required?", name: "meta_calibrationRequired", placeholder: "Yes / No" },
  ],
  SOLAR: [
    { label: "Site Name", name: "meta_siteName", placeholder: "e.g. Karen Residence" },
    { label: "Inverter Model", name: "meta_inverterModel", placeholder: "e.g. Growatt 5kW" },
    { label: "Battery Model", name: "meta_batteryModel", placeholder: "e.g. Pylontech US3000" },
    { label: "Issue Description", name: "meta_panelIssue", placeholder: "Describe the problem" },
  ],
  CLEANING: [
    { label: "Site / Area", name: "meta_siteArea", placeholder: "e.g. Office floor, 3 rooms" },
    { label: "Cleaning Type", name: "meta_cleaningType", placeholder: "Deep clean, Regular, Carpet…" },
    { label: "Frequency", name: "meta_frequency", placeholder: "Once-off, Weekly, Monthly" },
  ],
  PEST_CONTROL: [
    { label: "Pest Type", name: "meta_pestType", placeholder: "Rats, Bedbugs, Cockroaches…" },
    { label: "Treatment Method", name: "meta_treatmentMethod", placeholder: "Spray, Fumigation, Baiting…" },
    { label: "Site / Area", name: "meta_siteArea", placeholder: "Kitchen, Bedroom, Full house…" },
  ],
  PLUMBING: [
    { label: "Issue Type", name: "meta_issueType", placeholder: "Leaking pipe, Blocked drain…" },
    { label: "Pipe Type", name: "meta_pipeType", placeholder: "PVC, Copper, Iron…" },
  ],
  ELECTRICAL: [
    { label: "Issue Type", name: "meta_issueType", placeholder: "Power outage, Wiring fault…" },
    { label: "Circuit / Area", name: "meta_circuitType", placeholder: "Main board, Kitchen sockets…" },
  ],
  HVAC: [
    { label: "Unit Type", name: "meta_unitType", placeholder: "Split AC, Central, Duct…" },
    { label: "Fault Description", name: "meta_faultDesc", placeholder: "Not cooling, Noise, Leaking…" },
  ],
  LOGISTICS: [
    { label: "Vehicle Reg", name: "meta_vehicleReg", placeholder: "KDA 123A" },
    { label: "Delivery Type", name: "meta_deliveryType", placeholder: "Express, Standard, Bulk…" },
    { label: "PO / Reference", name: "meta_poNumber", placeholder: "Purchase order number" },
  ],
};

// ── Filter tabs ───────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { label: "All",          value: ""                              },
  { label: "Active",       value: "IN_PROGRESS"                  },
  { label: "Assigned",     value: "ASSIGNED"                     },
  { label: "Awaiting OTP", value: "COMPLETED_PENDING_VERIFICATION"},
  { label: "Postponed",    value: "POSTPONED"                    },
  { label: "Verified",     value: "VERIFIED"                     },
  { label: "Issues",       value: "ISSUE_REPORTED"               },
];

// ── Main component ─────────────────────────────────────────────────────────────

export default function JobsClient({
  jobs, total, pages, workers, jobTypes, zones, assets, industry, clients,
  currentStatus, currentSearch,
}: {
  jobs: Job[]; total: number; pages: number;
  workers: Worker[]; jobTypes: string[]; zones: string[];
  assets: AssetOption[]; industry: string; clients: ClientOption[];
  currentStatus?: string; currentSearch?: string;
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  function navigate(params: Record<string, string>) {
    const sp = new URLSearchParams();
    if (params.status) sp.set("status", params.status);
    if (params.search) sp.set("search", params.search);
    router.push(`/admin/jobs?${sp.toString()}`);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createJob(fd);
      if (res.error) setFeedback(res.error);
      else { setShowCreate(false); setFeedback(""); router.refresh(); }
    });
  }

  async function handleStatusChange(jobId: string, status: string) {
    setOpenMenuId(null);
    startTransition(async () => { await updateJobStatus(jobId, status); router.refresh(); });
  }

  // ── Attention items (risks computed client-side from job list)
  const attentionJobs = jobs.filter(
    (j) => j.status === "ISSUE_REPORTED" || j.status === "POSTPONED" || j.priority === "EMERGENCY"
  ).slice(0, 4);

  // ── Upcoming jobs (scheduled in next 7 days)
  const now = Date.now();
  const upcomingJobs = jobs
    .filter((j) => j.scheduledDate && new Date(j.scheduledDate).getTime() > now)
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())
    .slice(0, 4);

  // ── Metric counts
  const activeCount   = jobs.filter((j) => ["ASSIGNED","IN_PROGRESS"].includes(j.status)).length;
  const otpCount      = jobs.filter((j) => j.status === "COMPLETED_PENDING_VERIFICATION").length;
  const attentionCount= jobs.filter((j) => ["POSTPONED","ISSUE_REPORTED"].includes(j.status) || j.priority === "EMERGENCY").length;

  return (
    <div className="flex gap-5 min-h-0">
      {/* ── Left: main content ────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Page header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="ff-page-title">Jobs</h1>
            <p className="ff-page-desc">Manage and track field service jobs</p>
          </div>
          <button onClick={() => setShowCreate(true)} className={btnPrimary}>
            <Plus className="w-4 h-4" />
            New Job
          </button>
        </div>

        {feedback && (
          <p className="text-sm bg-[#DCFCE7] border border-[#BBF7D0] text-[#16A34A] px-4 py-2.5 rounded-[10px]">
            {feedback}
          </p>
        )}

        {/* Metric cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: "Total Jobs",      value: total,         sub: "All time",          iconBg: "bg-[#DBEAFE]", iconColor: "text-[#2563EB]", Icon: Wrench    },
            { label: "Active",          value: activeCount,   sub: "In progress",        iconBg: "bg-[#DCFCE7]", iconColor: "text-[#16A34A]", Icon: Wrench    },
            { label: "Awaiting OTP",    value: otpCount,      sub: "Waiting for client", iconBg: "bg-[#EDE9FE]", iconColor: "text-[#7C3AED]", Icon: Clock     },
            { label: "Needs Attention", value: attentionCount,sub: "High priority",      iconBg: "bg-[#FEE2E2]", iconColor: "text-[#DC2626]", Icon: AlertTriangle },
          ].map((m) => (
            <div key={m.label} className="ff-card p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${m.iconBg}`}>
                  <m.Icon className={`w-4.5 h-4.5 w-[18px] h-[18px] ${m.iconColor}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-[#0F172A] leading-none">{m.value}</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">{m.label}</p>
                </div>
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-2">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_TABS.map((t) => {
            const active = (currentStatus ?? "") === t.value;
            return (
              <button
                key={t.value}
                onClick={() => navigate({ status: t.value })}
                className={`ff-tab ${active ? "ff-tab-active" : "ff-tab-inactive"}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search by client, job, asset, or location..."
              defaultValue={currentSearch}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  navigate({ search: (e.target as HTMLInputElement).value, status: currentStatus ?? "" });
              }}
              className={`${inputCls} pl-10`}
            />
          </div>
          <button className={btnSecondary}>
            <Filter className="w-4 h-4 text-[#64748B]" />
            Filters
          </button>
        </div>

        {/* Jobs table */}
        <div className="ff-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full ff-table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Client</th>
                  <th>Worker</th>
                  <th>Scheduled</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const sched = fmtScheduled(job.scheduledDate);
                  const amount = job.finalAmount ?? job.quotedAmount;
                  return (
                    <tr key={job.id} className="group">
                      <td>
                        <div>
                          <p className="font-semibold text-[#2563EB] text-[13px] font-mono">
                            {job.jobNumber.length > 14
                              ? job.jobNumber.slice(0, 12) + "…"
                              : job.jobNumber}
                          </p>
                          <p className="text-xs text-[#94A3B8] mt-0.5 truncate max-w-[140px]">
                            {job.jobType}
                            {job.asset && ` · ${job.asset.name}`}
                          </p>
                        </div>
                      </td>
                      <td>
                        <p className="font-medium text-[#0F172A] text-[13px]">{job.clientName}</p>
                        <p className="text-xs text-[#94A3B8] mt-0.5">{job.clientPhone}</p>
                      </td>
                      <td>
                        {job.workers.length > 0 ? (
                          <span className="text-[13px] text-[#334155]">
                            {job.workers.map((w) => w.name).join(", ")}
                          </span>
                        ) : (
                          <span className="text-xs text-[#94A3B8] flex items-center gap-1">
                            <Minus className="w-3 h-3" />Unassigned
                          </span>
                        )}
                      </td>
                      <td>
                        {sched ? (
                          <div>
                            <p className="text-[13px] text-[#334155]">{sched.day}</p>
                            <p className="text-xs text-[#94A3B8] mt-0.5">{sched.time}</p>
                          </div>
                        ) : (
                          <span className="text-[#94A3B8] text-sm">—</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={job.status} />
                      </td>
                      <td>
                        <span className="font-semibold text-[13px] text-[#0F172A]">
                          {amount ? formatKES(amount) : <span className="text-[#94A3B8] font-normal">—</span>}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/admin/jobs/${job.id}`}
                            className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:text-[#1D4ED8] font-semibold bg-[#DBEAFE] hover:bg-[#BFDBFE] px-2.5 py-1.5 rounded-[8px] transition-colors"
                          >
                            View Job <ChevronRight className="w-3 h-3" />
                          </Link>
                          {/* More menu */}
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === job.id ? null : job.id)}
                              className="p-1.5 rounded-[6px] text-[#94A3B8] hover:text-[#334155] hover:bg-[#F1F5F9] transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {openMenuId === job.id && (
                              <div className="absolute right-0 top-8 w-40 bg-white border border-[#E2E8F0] rounded-[10px] shadow-xl z-20 py-1 overflow-hidden">
                                {!["VERIFIED","CLOSED","CANCELLED"].includes(job.status) && (
                                  <button
                                    onClick={() => handleStatusChange(job.id, "CANCELLED")}
                                    className="w-full text-left px-3.5 py-2 text-sm text-[#DC2626] hover:bg-[#FEE2E2] transition-colors"
                                  >
                                    Cancel Job
                                  </button>
                                )}
                                <Link
                                  href={`/admin/jobs/${job.id}`}
                                  className="block px-3.5 py-2 text-sm text-[#334155] hover:bg-[#F8FAFC] transition-colors"
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  View Details
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-[12px] bg-[#F1F5F9] flex items-center justify-center">
                          <Wrench className="w-5 h-5 text-[#94A3B8]" />
                        </div>
                        <p className="text-sm font-semibold text-[#334155]">No jobs found</p>
                        <p className="text-xs text-[#94A3B8]">Create your first job to get started</p>
                        <button onClick={() => setShowCreate(true)} className={btnPrimary}>
                          <Plus className="w-4 h-4" /> New Job
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {jobs.length > 0 && (
            <div className="px-5 py-3 border-t border-[#F1F5F9] flex items-center justify-between">
              <p className="text-xs text-[#94A3B8]">Showing 1 to {jobs.length} of {total} jobs</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel ──────────────────────────────────────────────────── */}
      <div className="hidden xl:flex w-[300px] shrink-0 flex-col gap-4">

        {/* Jobs needing attention */}
        <div className="ff-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#F1F5F9] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-[#0F172A]">Jobs needing attention</p>
              {attentionJobs.length > 0 && (
                <span className="px-1.5 py-0.5 bg-[#FEE2E2] text-[#DC2626] text-[10px] font-bold rounded-full">
                  {attentionJobs.length}
                </span>
              )}
            </div>
            <Link href="/admin/jobs?status=ISSUE_REPORTED" className="text-xs text-[#2563EB] font-medium">
              View all
            </Link>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {attentionJobs.length === 0 ? (
              <p className="px-4 py-6 text-xs text-[#94A3B8] text-center">No issues right now</p>
            ) : (
              attentionJobs.map((j) => (
                <Link key={j.id} href={`/admin/jobs/${j.id}`} className="block px-4 py-3 hover:bg-[#F8FAFC] transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <StatusBadge
                      status={j.status === "ISSUE_REPORTED" ? "ISSUE_REPORTED" : j.priority === "EMERGENCY" ? "EMERGENCY" : "POSTPONED"}
                      size="xs"
                    />
                    <span className="text-[10px] font-mono text-[#94A3B8]">{j.jobNumber.slice(0,12)}</span>
                  </div>
                  <p className="text-[13px] font-semibold text-[#0F172A] truncate">{j.clientName}</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5 truncate">{j.jobType}</p>
                  {j.scheduledDate && (
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Scheduled for {formatDate(j.scheduledDate)}
                    </p>
                  )}
                </Link>
              ))
            )}
          </div>
          {attentionJobs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[#F1F5F9] text-center">
              <Link href="/admin/jobs" className="text-xs text-[#2563EB] font-medium flex items-center justify-center gap-1">
                View all issues <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        {/* Upcoming reminders */}
        <div className="ff-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#F1F5F9]">
            <p className="text-[13px] font-semibold text-[#0F172A] flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
              Upcoming reminders
            </p>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {upcomingJobs.length === 0 ? (
              <p className="px-4 py-6 text-xs text-[#94A3B8] text-center">No upcoming jobs</p>
            ) : (
              upcomingJobs.map((j) => {
                const s = fmtScheduled(j.scheduledDate);
                return (
                  <Link key={j.id} href={`/admin/jobs/${j.id}`} className="px-4 py-3 flex gap-3 hover:bg-[#F8FAFC] transition-colors">
                    <div className="w-8 shrink-0 flex flex-col items-center">
                      <p className="text-[10px] font-semibold text-[#2563EB] uppercase leading-none">
                        {s ? new Date(j.scheduledDate!).toLocaleDateString("en-KE", { month: "short" }) : "—"}
                      </p>
                      <p className="text-base font-bold text-[#0F172A] leading-tight">
                        {s ? new Date(j.scheduledDate!).getDate() : ""}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#0F172A] truncate">{j.jobType}</p>
                      <p className="text-xs text-[#64748B] truncate">{j.clientName}</p>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">{s?.time}</p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Create Job Modal ─────────────────────────────────────────────── */}
      {showCreate && (
        <JobModal title="New Job" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            {clients.length > 0 ? (
              <ClientPicker clients={clients} />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Client Name" name="clientName" required />
                <Field label="Client Phone" name="clientPhone" placeholder="+254..." required />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#334155] mb-1">Job Type</label>
                <select name="jobType" required className={inputCls}>
                  <option value="">Select type</option>
                  {jobTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#334155] mb-1">Priority</label>
                <select name="priority" className={inputCls}>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="EMERGENCY">Emergency</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>
            <Field label="Location / Address" name="location" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#334155] mb-1">Zone</label>
                <select name="zone" className={inputCls}>
                  <option value="">Select zone</option>
                  {zones.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <Field label="Scheduled Date & Time" name="scheduledDate" type="datetime-local" />
            </div>
            <Field label="Quoted Amount (KES)" name="quotedAmount" type="number" />
            <Field label="Description" name="description" />
            {assets.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-[#334155] mb-1">Linked Asset (optional)</label>
                <select name="assetId" className={inputCls}>
                  <option value="">No asset linked</option>
                  {assets.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.assetType} ({a.clientName})</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">Assign Worker</label>
              <select name="workerId" className={inputCls}>
                <option value="">Auto-assign best worker</option>
                {workers.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.phone})</option>)}
              </select>
            </div>
            {INDUSTRY_FIELDS[industry] && (
              <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8] py-1 flex items-center gap-1 select-none list-none">
                  <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                  Industry Details ({industry.replace(/_/g, " ").toLowerCase()})
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[10px] p-3">
                  {INDUSTRY_FIELDS[industry].map((f) => (
                    <div key={f.name}>
                      <label className="block text-xs font-medium text-[#334155] mb-1">{f.label}</label>
                      <input name={f.name} type={f.type ?? "text"} placeholder={f.placeholder} className={inputCls} />
                    </div>
                  ))}
                </div>
              </details>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowCreate(false)} className={`flex-1 ${btnSecondary} justify-center`}>
                Cancel
              </button>
              <button type="submit" disabled={isPending} className={`flex-1 ${btnPrimary} justify-center`}>
                {isPending ? "Creating…" : "Create Job"}
              </button>
            </div>
          </form>
        </JobModal>
      )}

      {/* Close menu on outside click */}
      {openMenuId && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ClientPicker({ clients }: { clients: ClientOption[] }) {
  const [mode, setMode] = useState<"pick" | "manual">("pick");
  const [selected, setSelected] = useState<ClientOption | null>(null);
  const cls = "w-full bg-white border border-[#E2E8F0] rounded-[10px] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-[#334155]">Client</label>
        <button type="button" onClick={() => { setMode(m => m === "pick" ? "manual" : "pick"); setSelected(null); }}
          className="text-[10px] text-[#2563EB] hover:underline ml-auto">
          {mode === "pick" ? "Enter manually" : "Pick from clients"}
        </button>
      </div>
      {mode === "pick" ? (
        <>
          <select className={cls} onChange={(e) => setSelected(clients.find(x => x.id === e.target.value) ?? null)}>
            <option value="">Select a client…</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
          </select>
          {selected && (
            <>
              <input type="hidden" name="clientName" value={selected.name} />
              <input type="hidden" name="clientPhone" value={selected.phone} />
              <p className="text-xs text-[#16A34A] bg-[#DCFCE7] border border-[#BBF7D0] rounded-[8px] px-3 py-1.5">{selected.name} · {selected.phone}</p>
            </>
          )}
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Client Name" name="clientName" required />
          <Field label="Client Phone" name="clientPhone" placeholder="+254..." required />
        </div>
      )}
    </div>
  );
}

function Field({ label, name, type = "text", placeholder, required }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#334155] mb-1">{label}</label>
      <input type={type} name={name} placeholder={placeholder} required={required}
        className="w-full bg-white border border-[#E2E8F0] rounded-[10px] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors" />
    </div>
  );
}

function JobModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] shrink-0">
          <h2 className="font-semibold text-[#0F172A] text-[15px]">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-[#94A3B8] hover:text-[#334155] hover:bg-[#F1F5F9] rounded-[8px] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
