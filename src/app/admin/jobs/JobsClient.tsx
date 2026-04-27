"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createJob, reassignJob, rescheduleJob, updateJobStatus } from "@/app/actions/job-actions";
import { formatKES, formatDate } from "@/lib/utils";
import { Plus, X, ExternalLink, Minus, Download, Search } from "lucide-react";

function formatScheduled(date: Date | string | null) {
  if (!date) return "—";
  const d = new Date(date);
  const day = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return { day, time };
}

// ── Design system ─────────────────────────────────────────────────────────────
const inputCls =
  "w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";
const btnPrimary =
  "inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50";
const btnSecondary =
  "inline-flex items-center gap-2 bg-white border border-gray-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 hover:border-gray-300 transition-colors";

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  ASSIGNED:    { label: "Assigned",    cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  IN_PROGRESS: { label: "In Progress", cls: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  POSTPONED:   { label: "Postponed",   cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  RESCHEDULED: { label: "Rescheduled", cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  COMPLETED_PENDING_VERIFICATION: { label: "Awaiting OTP", cls: "bg-purple-50 text-purple-700 border border-purple-200" },
  VERIFIED:    { label: "Verified",    cls: "bg-green-50 text-green-700 border border-green-200" },
  CLOSED:      { label: "Closed",      cls: "bg-slate-100 text-slate-600 border border-slate-200" },
  DECLINED:    { label: "Declined",    cls: "bg-red-50 text-red-700 border border-red-200" },
  ISSUE_REPORTED: { label: "Issue",    cls: "bg-red-50 text-red-700 border border-red-200" },
  CANCELLED:   { label: "Cancelled",  cls: "bg-slate-100 text-slate-500 border border-slate-200" },
};
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    cls: "bg-slate-100 text-slate-600 border border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Worker {
  id: string;
  name: string;
  phone: string;
  baseZone?: string | null;
}
interface AssetOption {
  id: string;
  name: string;
  assetType: string;
  clientName: string;
}
interface Job {
  id: string;
  jobNumber: string;
  clientName: string;
  clientPhone: string;
  jobType: string;
  status: string;
  priority: string;
  location: string | null;
  scheduledDate: Date | string | null;
  quotedAmount: number | null;
  finalAmount: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  workers: Worker[];
  invoice: { id: string; invoiceNumber: string; status: string; amount: number } | null;
  asset: { id: string; name: string; assetType: string } | null;
}

const STATUS_TABS = [
  { label: "All",           value: "" },
  { label: "Active",        value: "IN_PROGRESS" },
  { label: "Assigned",      value: "ASSIGNED" },
  { label: "Awaiting OTP",  value: "COMPLETED_PENDING_VERIFICATION" },
  { label: "Postponed",     value: "POSTPONED" },
  { label: "Verified",      value: "VERIFIED" },
  { label: "Issues",        value: "ISSUE_REPORTED" },
];

export default function JobsClient({
  jobs,
  total,
  pages,
  workers,
  jobTypes,
  zones,
  assets,
  currentStatus,
  currentSearch,
}: {
  jobs: Job[];
  total: number;
  pages: number;
  workers: Worker[];
  jobTypes: string[];
  zones: string[];
  assets: AssetOption[];
  currentStatus?: string;
  currentSearch?: string;
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");

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
      else {
        setShowCreate(false);
        setFeedback("Job created!");
        router.refresh();
      }
    });
  }

  async function handleReassign(jobId: string, workerId: string) {
    startTransition(async () => {
      const res = await reassignJob(jobId, workerId);
      if (res.ok) router.refresh();
    });
  }

  async function handleReschedule(jobId: string, date: string) {
    startTransition(async () => {
      const res = await rescheduleJob(jobId, date);
      if (res.ok) router.refresh();
    });
  }

  async function handleStatusChange(jobId: string, status: string) {
    startTransition(async () => {
      await updateJobStatus(jobId, status);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          Jobs{" "}
          <span className="text-slate-400 text-lg font-normal">({total})</span>
        </h1>
        <button onClick={() => setShowCreate(true)} className={btnPrimary}>
          <Plus className="w-4 h-4" />
          New Job
        </button>
      </div>

      {feedback && (
        <p className="text-sm bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl">
          {feedback}
        </p>
      )}

      {/* Status tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => navigate({ status: t.value })}
            className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-colors ${
              (currentStatus ?? "") === t.value
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-slate-600 hover:bg-slate-50 hover:border-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by client, job type, location..."
          defaultValue={currentSearch}
          onKeyDown={(e) => {
            if (e.key === "Enter")
              navigate({ search: (e.target as HTMLInputElement).value });
          }}
          className={`${inputCls} pl-10`}
        />
      </div>

      {/* Jobs table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Job #
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Client
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Worker
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Scheduled
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Amount
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-4 text-slate-500 font-mono text-xs">
                    {job.jobNumber}
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-900">
                      {job.clientName}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {job.clientPhone}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-slate-700">{job.jobType}</p>
                    {job.asset && (
                      <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100 max-w-[140px] truncate">
                        {job.asset.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {job.workers.length > 0 ? (
                      <span className="text-slate-700">
                        {job.workers.map((w) => w.name).join(", ")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400 text-xs">
                        <Minus className="w-3 h-3" />
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {(() => {
                      const s = formatScheduled(job.scheduledDate);
                      if (typeof s === "string") return <span className="text-slate-400 text-xs">{s}</span>;
                      return (
                        <div>
                          <p className="text-xs text-slate-700">{s.day}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{s.time}</p>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-900">
                    {job.finalAmount
                      ? formatKES(job.finalAmount)
                      : job.quotedAmount
                      ? formatKES(job.quotedAmount)
                      : <span className="text-slate-400 font-normal">—</span>}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => setSelectedJob(job)}
                      title="Manage job"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                        <Plus className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500 font-medium">
                        No jobs found
                      </p>
                      <p className="text-xs text-slate-400">
                        Create your first job to get started
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Job Modal */}
      {showCreate && (
        <Modal title="New Job" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Client Name" name="clientName" required />
              <Field
                label="Client Phone"
                name="clientPhone"
                placeholder="+254..."
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Job Type
                </label>
                <select name="jobType" required className={inputCls}>
                  <option value="">Select type</option>
                  {jobTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Priority
                </label>
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
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Zone
                </label>
                <select name="zone" className={inputCls}>
                  <option value="">Select zone</option>
                  {zones.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                label="Scheduled Date & Time"
                name="scheduledDate"
                type="datetime-local"
              />
            </div>
            <Field
              label="Quoted Amount (KES)"
              name="quotedAmount"
              type="number"
            />
            <Field label="Description" name="description" />
            {assets.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Linked Asset (optional)
                </label>
                <select name="assetId" className={inputCls}>
                  <option value="">No asset linked</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} — {a.assetType} ({a.clientName})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Assign Worker (optional — auto-assigned if blank)
              </label>
              <select name="workerId" className={inputCls}>
                <option value="">Auto-assign best worker</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.phone})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className={`flex-1 ${btnSecondary} justify-center`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className={`flex-1 ${btnPrimary} justify-center`}
              >
                {isPending ? "Creating..." : "Create Job"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Manage Job Modal */}
      {selectedJob && (
        <Modal
          title={`Job: ${selectedJob.jobNumber}`}
          onClose={() => setSelectedJob(null)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Info label="Client" value={selectedJob.clientName} />
              <Info label="Phone" value={selectedJob.clientPhone} />
              <Info label="Type" value={selectedJob.jobType} />
              <Info
                label="Status"
                value={
                  STATUS_CONFIG[selectedJob.status]?.label ?? selectedJob.status
                }
              />
              <Info label="Location" value={selectedJob.location ?? "—"} />
              <Info
                label="Scheduled"
                value={formatDate(selectedJob.scheduledDate)}
              />
              {selectedJob.finalAmount != null && (
                <Info
                  label="Amount"
                  value={formatKES(selectedJob.finalAmount)}
                />
              )}
              {selectedJob.invoice && (
                <Info
                  label="Invoice"
                  value={`${selectedJob.invoice.invoiceNumber} (${selectedJob.invoice.status})`}
                />
              )}
              {selectedJob.asset && (
                <Info
                  label="Asset"
                  value={`${selectedJob.asset.name} (${selectedJob.asset.assetType})`}
                />
              )}
            </div>

            {selectedJob.invoice?.id && (
              <a
                href={`/api/invoices/${selectedJob.invoice.id}/pdf`}
                target="_blank"
                className="flex items-center justify-center gap-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-xl py-2.5 text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Invoice PDF
              </a>
            )}

            {/* Reassign */}
            {["ASSIGNED", "POSTPONED", "DECLINED", "RESCHEDULED"].includes(
              selectedJob.status
            ) && (
              <div>
                <p className="text-xs font-medium text-slate-700 mb-1">
                  Reassign Worker
                </p>
                <select
                  onChange={(e) => {
                    if (e.target.value)
                      handleReassign(selectedJob.id, e.target.value);
                  }}
                  className={inputCls}
                >
                  <option value="">Select worker...</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Reschedule */}
            {["POSTPONED", "RESCHEDULED"].includes(selectedJob.status) && (
              <div>
                <p className="text-xs font-medium text-slate-700 mb-1">
                  Reschedule
                </p>
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    id={`reschedule-${selectedJob.id}`}
                    className={`${inputCls} flex-1`}
                  />
                  <button
                    onClick={() => {
                      const el = document.getElementById(
                        `reschedule-${selectedJob.id}`
                      ) as HTMLInputElement;
                      if (el.value)
                        handleReschedule(selectedJob.id, el.value);
                    }}
                    className={btnPrimary}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Cancel */}
            {!["VERIFIED", "CLOSED", "CANCELLED"].includes(
              selectedJob.status
            ) && (
              <button
                onClick={() => {
                  handleStatusChange(selectedJob.id, "CANCELLED");
                  setSelectedJob(null);
                }}
                className="w-full border border-red-200 bg-red-50 text-red-600 rounded-xl py-2.5 text-sm font-medium hover:bg-red-100 transition-colors"
              >
                Cancel Job
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const inputCls =
    "w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        className={inputCls}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-900 mt-0.5">{value}</p>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
