"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createJob, reassignJob, rescheduleJob, updateJobStatus } from "@/app/actions/job-actions";
import { statusColor, statusLabel, formatDate, formatKES } from "@/lib/utils";

interface Worker { id: string; name: string; phone: string; baseZone?: string | null }
interface Job {
  id: string; jobNumber: string; clientName: string; clientPhone: string;
  jobType: string; status: string; priority: string; location: string | null;
  scheduledDate: string | null; quotedAmount: number | null; finalAmount: number | null;
  createdAt: string; updatedAt: string;
  workers: Worker[];
  invoice: { id: string; invoiceNumber: string; status: string; amount: number } | null;
}

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Active", value: "IN_PROGRESS" },
  { label: "Assigned", value: "ASSIGNED" },
  { label: "Awaiting OTP", value: "COMPLETED_PENDING_VERIFICATION" },
  { label: "Postponed", value: "POSTPONED" },
  { label: "Verified", value: "VERIFIED" },
  { label: "Issues", value: "ISSUE_REPORTED" },
];

export default function JobsClient({
  jobs, total, pages, workers, jobTypes, zones, currentStatus, currentSearch,
}: {
  jobs: Job[]; total: number; pages: number; workers: Worker[];
  jobTypes: string[]; zones: string[]; currentStatus?: string; currentSearch?: string;
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
      else { setShowCreate(false); setFeedback("Job created!"); router.refresh(); }
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Jobs <span className="text-gray-400 text-lg font-normal">({total})</span></h1>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          + New Job
        </button>
      </div>

      {feedback && <p className="text-sm bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg">{feedback}</p>}

      {/* Status tabs */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => navigate({ status: t.value })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              (currentStatus ?? "") === t.value
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-blue-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by client, job type, location..."
        defaultValue={currentSearch}
        onKeyDown={(e) => {
          if (e.key === "Enter") navigate({ search: (e.target as HTMLInputElement).value });
        }}
        className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Jobs table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Job #</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Client</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Worker</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Scheduled</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{job.jobNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{job.clientName}</p>
                    <p className="text-xs text-gray-400">{job.clientPhone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{job.jobType}</td>
                  <td className="px-4 py-3 text-gray-600">{job.workers.map((w) => w.name).join(", ") || <span className="text-gray-300">Unassigned</span>}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(job.scheduledDate)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(job.status)}`}>
                      {statusLabel(job.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {job.finalAmount ? formatKES(job.finalAmount) : job.quotedAmount ? formatKES(job.quotedAmount) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedJob(job)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">No jobs found</td>
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
              <Field label="Client Phone" name="clientPhone" placeholder="+254..." required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Job Type</label>
                <select name="jobType" required className={inputCls}>
                  <option value="">Select type</option>
                  {jobTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
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
                <label className="block text-xs font-medium text-gray-700 mb-1">Zone</label>
                <select name="zone" className={inputCls}>
                  <option value="">Select zone</option>
                  {zones.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <Field label="Scheduled Date & Time" name="scheduledDate" type="datetime-local" />
            </div>
            <Field label="Quoted Amount (KES)" name="quotedAmount" type="number" />
            <Field label="Description" name="description" />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Assign Worker (optional — auto-assigned if blank)</label>
              <select name="workerId" className={inputCls}>
                <option value="">Auto-assign best worker</option>
                {workers.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.phone})</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={isPending} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {isPending ? "Creating..." : "Create Job"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Manage Job Modal */}
      {selectedJob && (
        <Modal title={`Job: ${selectedJob.jobNumber}`} onClose={() => setSelectedJob(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Info label="Client" value={selectedJob.clientName} />
              <Info label="Phone" value={selectedJob.clientPhone} />
              <Info label="Type" value={selectedJob.jobType} />
              <Info label="Status" value={statusLabel(selectedJob.status)} />
              <Info label="Location" value={selectedJob.location ?? "—"} />
              <Info label="Scheduled" value={formatDate(selectedJob.scheduledDate)} />
              {selectedJob.finalAmount && <Info label="Amount" value={formatKES(selectedJob.finalAmount)} />}
              {selectedJob.invoice && <Info label="Invoice" value={`${selectedJob.invoice.invoiceNumber} (${selectedJob.invoice.status})`} />}
            </div>

            {selectedJob.invoice?.id && (
              <a
                href={`/api/invoices/${selectedJob.invoice.id}/pdf`}
                target="_blank"
                className="block text-center border border-blue-500 text-blue-600 rounded-lg py-2 text-sm hover:bg-blue-50"
              >
                📄 Download Invoice PDF
              </a>
            )}

            {/* Reassign */}
            {["ASSIGNED", "POSTPONED", "DECLINED", "RESCHEDULED"].includes(selectedJob.status) && (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1">Reassign Worker</p>
                <select
                  onChange={(e) => { if (e.target.value) handleReassign(selectedJob.id, e.target.value); }}
                  className={inputCls}
                >
                  <option value="">Select worker...</option>
                  {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            )}

            {/* Reschedule */}
            {["POSTPONED", "RESCHEDULED"].includes(selectedJob.status) && (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1">Reschedule</p>
                <div className="flex gap-2">
                  <input type="datetime-local" id={`reschedule-${selectedJob.id}`} className={`${inputCls} flex-1`} />
                  <button
                    onClick={() => {
                      const el = document.getElementById(`reschedule-${selectedJob.id}`) as HTMLInputElement;
                      if (el.value) handleReschedule(selectedJob.id, el.value);
                    }}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Cancel */}
            {!["VERIFIED", "CLOSED", "CANCELLED"].includes(selectedJob.status) && (
              <button
                onClick={() => { handleStatusChange(selectedJob.id, "CANCELLED"); setSelectedJob(null); }}
                className="w-full border border-red-300 text-red-600 rounded-lg py-2 text-sm hover:bg-red-50"
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

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({ label, name, type = "text", placeholder, required }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} name={name} placeholder={placeholder} required={required} className={inputCls} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
