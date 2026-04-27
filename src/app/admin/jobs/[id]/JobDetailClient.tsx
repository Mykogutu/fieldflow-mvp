"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Phone, MapPin, Package, User, Clock, CheckCircle,
  AlertTriangle, FileText, ExternalLink, Calendar, Banknote,
  X, RefreshCw, CheckCircle2, XCircle, Send, Download,
  ChevronDown, Clipboard, ShieldCheck, Award, FileCheck,
  Truck, MessageCircle,
} from "lucide-react";
import { formatKES, formatDate, statusLabel, statusColor } from "@/lib/utils";
import {
  updateJobStatus, rescheduleJob, reassignJob,
  closeJob, markJobPaid, deleteJob,
} from "@/app/actions/job-actions";

// ── Event config ──────────────────────────────────────────────────────────────
const EVENT_CONFIG: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  CREATED:           { label: "Job created",               color: "bg-blue-100 text-blue-600",    Icon: FileText      },
  ASSIGNED:          { label: "Worker assigned",           color: "bg-blue-100 text-blue-600",    Icon: User          },
  WHATSAPP_SENT:     { label: "Assignment sent via WhatsApp", color: "bg-green-100 text-green-600", Icon: MessageCircle },
  ACCEPTED:          { label: "Worker accepted",           color: "bg-green-100 text-green-600",  Icon: CheckCircle2  },
  DECLINED:          { label: "Worker declined",           color: "bg-red-100 text-red-600",      Icon: AlertTriangle },
  CHECKED_IN:        { label: "Worker arrived on-site",    color: "bg-indigo-100 text-indigo-600", Icon: MapPin       },
  COMPLETED:         { label: "Worker marked job done",    color: "bg-purple-100 text-purple-600", Icon: CheckCircle2 },
  OTP_SENT:          { label: "OTP sent to client",        color: "bg-amber-100 text-amber-600",  Icon: Phone        },
  OTP_VERIFIED:      { label: "Client verified OTP",       color: "bg-green-100 text-green-600",  Icon: CheckCircle2 },
  VERIFIED:          { label: "Job verified",              color: "bg-green-100 text-green-600",  Icon: CheckCircle2 },
  INVOICE_GENERATED: { label: "Invoice generated",         color: "bg-slate-100 text-slate-600",  Icon: FileText     },
  JOB_CARD_GENERATED:{ label: "Job card generated",        color: "bg-slate-100 text-slate-600",  Icon: Clipboard    },
  WARRANTY_GENERATED:{ label: "Warranty generated",        color: "bg-slate-100 text-slate-600",  Icon: ShieldCheck  },
  POSTPONED:         { label: "Job postponed",             color: "bg-amber-100 text-amber-600",  Icon: Clock        },
  RESCHEDULED:       { label: "Job rescheduled",           color: "bg-blue-100 text-blue-600",    Icon: Calendar     },
  REASSIGNED:        { label: "Reassigned to new worker",  color: "bg-blue-100 text-blue-600",    Icon: RefreshCw    },
  STATUS_CHANGE:     { label: "Status updated",            color: "bg-slate-100 text-slate-500",  Icon: CheckCircle  },
  CLOSED:            { label: "Job closed",                color: "bg-slate-100 text-slate-500",  Icon: CheckCircle  },
  CANCELLED:         { label: "Job cancelled",             color: "bg-red-100 text-red-500",      Icon: XCircle      },
  ISSUE_REPORTED:    { label: "Issue reported",            color: "bg-red-100 text-red-600",      Icon: AlertTriangle},
  PAYMENT_RECORDED:  { label: "Payment recorded",          color: "bg-green-100 text-green-600",  Icon: Banknote     },
};

const DOC_CONFIG: Record<string, { label: string; Icon: React.ElementType; color: string; bg: string }> = {
  INVOICE:                     { label: "Invoice",               Icon: FileText,    color: "text-blue-600",   bg: "bg-blue-50"   },
  JOB_CARD:                    { label: "Job Card",              Icon: Clipboard,   color: "text-slate-600",  bg: "bg-slate-100" },
  WARRANTY_CERTIFICATE:        { label: "Warranty Certificate",  Icon: ShieldCheck, color: "text-green-600",  bg: "bg-green-50"  },
  INSTALLATION_REPORT:         { label: "Installation Report",   Icon: FileCheck,   color: "text-indigo-600", bg: "bg-indigo-50" },
  SERVICE_REPORT:              { label: "Service Report",        Icon: Award,       color: "text-purple-600", bg: "bg-purple-50" },
  FUEL_CALIBRATION_REPORT:     { label: "Fuel Calibration",      Icon: Package,     color: "text-amber-600",  bg: "bg-amber-50"  },
  DEVICE_REPLACEMENT_REPORT:   { label: "Device Replacement",    Icon: Package,     color: "text-orange-600", bg: "bg-orange-50" },
  CLIENT_CONFIRMATION_RECEIPT: { label: "Client Confirmation",   Icon: CheckCircle2,color: "text-green-600",  bg: "bg-green-50"  },
  DELIVERY_NOTE:               { label: "Delivery Note",         Icon: Truck,       color: "text-cyan-600",   bg: "bg-cyan-50"   },
  OTHER:                       { label: "Document",              Icon: FileText,    color: "text-slate-500",  bg: "bg-slate-100" },
};

type Worker = { id: string; name: string; phone: string };
type Asset = {
  id: string; name: string; assetType: string;
  identifier: string | null; serialNumber: string | null; registrationNumber: string | null;
};
type Invoice = {
  id: string; invoiceNumber: string; amount: number; status: string;
  paidAt: Date | null; paymentMethod: string | null; paymentReference: string | null;
  pdfUrl: string | null;
};
type JobEvent = { id: string; type: string; note: string | null; createdAt: Date };
type Document = {
  id: string; type: string; title: string | null; pdfUrl: string | null;
  sentAt: Date | null; sentVia: string | null; generatedAt: Date;
};

export type JobDetailData = {
  id: string; jobNumber: string; jobType: string; status: string; priority: string;
  clientName: string; clientPhone: string; location: string | null; zone: string | null;
  description: string | null; scheduledDate: Date | null;
  quotedAmount: number | null; finalAmount: number | null;
  otpCode: string | null; verifiedAt: Date | null; completedAt: Date | null;
  postponeReason: string | null;
  workers: Worker[];
  invoice: Invoice | null;
  events: JobEvent[];
  asset: Asset | null;
  documents: Document[];
  allWorkers: Worker[];
};

// ── Mark Paid Modal ───────────────────────────────────────────────────────────
function MarkPaidModal({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const [method, setMethod] = useState("MPESA");
  const [reference, setReference] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      await markJobPaid(jobId, method, reference || undefined);
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Record Payment</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {["MPESA", "CASH", "BANK", "CHEQUE", "OTHER"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          {method === "MPESA" && (
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">M-Pesa Reference</label>
              <input value={reference} onChange={e => setReference(e.target.value)}
                placeholder="e.g. QJ7F8K2L" maxLength={20}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={pending}
            className="flex-1 bg-green-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
            {pending ? "Saving…" : "Mark Paid"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reschedule Modal ──────────────────────────────────────────────────────────
function RescheduleModal({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const [date, setDate] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!date) return;
    startTransition(async () => {
      await rescheduleJob(jobId, date);
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Reschedule Job</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">New Date & Time</label>
          <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={!date || pending}
            className="flex-1 bg-blue-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {pending ? "Saving…" : "Reschedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reassign Modal ────────────────────────────────────────────────────────────
function ReassignModal({ jobId, allWorkers, currentWorkerId, onClose }: {
  jobId: string; allWorkers: Worker[]; currentWorkerId?: string; onClose: () => void;
}) {
  const [workerId, setWorkerId] = useState(currentWorkerId ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!workerId) return;
    startTransition(async () => {
      await reassignJob(jobId, workerId);
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Reassign Worker</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Select Worker</label>
          <select value={workerId} onChange={e => setWorkerId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Choose worker…</option>
            {allWorkers.map(w => <option key={w.id} value={w.id}>{w.name} · {w.phone}</option>)}
          </select>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={!workerId || pending}
            className="flex-1 bg-blue-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {pending ? "Saving…" : "Reassign"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Admin Actions Panel ───────────────────────────────────────────────────────
function AdminActions({ job }: { job: JobDetailData }) {
  const [modal, setModal] = useState<"paid" | "reschedule" | "reassign" | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const worker = job.workers[0];
  const inv = job.invoice;
  const isPaid = inv?.status === "PAID";
  const isClosed = job.status === "CLOSED";
  const isCancelled = job.status === "CANCELLED";
  const isDone = isClosed || isCancelled;

  function doClose() {
    if (!confirm("Close this job?")) return;
    startTransition(async () => { await closeJob(job.id); router.refresh(); });
  }
  function doCancel() {
    if (!confirm("Cancel this job? This cannot be undone.")) return;
    startTransition(async () => { await deleteJob(job.id); router.refresh(); });
  }

  return (
    <>
      {modal === "paid" && <MarkPaidModal jobId={job.id} onClose={() => setModal(null)} />}
      {modal === "reschedule" && <RescheduleModal jobId={job.id} onClose={() => setModal(null)} />}
      {modal === "reassign" && (
        <ReassignModal jobId={job.id} allWorkers={job.allWorkers}
          currentWorkerId={worker?.id} onClose={() => setModal(null)} />
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="font-semibold text-slate-900 text-sm">Admin Actions</h2>
        </div>
        <div className="p-4 grid grid-cols-2 gap-2">
          {/* Mark Paid */}
          {inv && !isPaid && (
            <button onClick={() => setModal("paid")}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 text-xs font-medium transition-colors">
              <Banknote className="w-3.5 h-3.5 shrink-0" /> Mark Paid
            </button>
          )}

          {/* Reschedule */}
          {!isDone && (
            <button onClick={() => setModal("reschedule")}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-medium transition-colors">
              <Calendar className="w-3.5 h-3.5 shrink-0" /> Reschedule
            </button>
          )}

          {/* Reassign */}
          {!isDone && (
            <button onClick={() => setModal("reassign")}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition-colors">
              <RefreshCw className="w-3.5 h-3.5 shrink-0" /> Reassign
            </button>
          )}

          {/* Send payment reminder */}
          {inv && !isPaid && (
            <a href={`https://wa.me/${job.clientPhone.replace("+", "")}?text=${encodeURIComponent(
              `Hi ${job.clientName}, a friendly reminder that your invoice of ${formatKES(inv.amount)} for ${job.jobType} is pending. Ref: ${inv.invoiceNumber}.`)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-medium transition-colors">
              <Send className="w-3.5 h-3.5 shrink-0" /> Payment Reminder
            </a>
          )}

          {/* Ask client for OTP */}
          {job.status === "COMPLETED_PENDING_VERIFICATION" && (
            <a href={`https://wa.me/${job.clientPhone.replace("+", "")}?text=${encodeURIComponent(
              `Hi ${job.clientName}, your ${job.jobType} service has been completed. Please share your service code with the technician to confirm. Thank you!`)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-medium transition-colors">
              <Phone className="w-3.5 h-3.5 shrink-0" /> Ask for OTP
            </a>
          )}

          {/* Ask worker for update */}
          {worker && !isDone && (
            <a href={`https://wa.me/${worker.phone.replace("+", "")}?text=${encodeURIComponent(
              `Hi ${worker.name}, please send an update on the ${job.jobType} job for ${job.clientName}.`)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-medium transition-colors">
              <MessageCircle className="w-3.5 h-3.5 shrink-0" /> Ask Worker
            </a>
          )}

          {/* Close job */}
          {!isDone && (job.status === "VERIFIED" || job.status === "COMPLETED_PENDING_VERIFICATION") && (
            <button onClick={doClose} disabled={pending}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition-colors disabled:opacity-50">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Close Job
            </button>
          )}

          {/* Cancel job */}
          {!isDone && (
            <button onClick={doCancel} disabled={pending}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-medium transition-colors disabled:opacity-50">
              <XCircle className="w-3.5 h-3.5 shrink-0" /> Cancel Job
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Documents Panel ───────────────────────────────────────────────────────────
function DocumentsPanel({ docs, clientPhone, clientName }: {
  docs: Document[]; clientPhone: string; clientName: string;
}) {
  if (docs.length === 0) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100">
        <h2 className="font-semibold text-slate-900">Documents</h2>
        <p className="text-xs text-slate-400 mt-0.5">{docs.length} document{docs.length !== 1 ? "s" : ""} generated</p>
      </div>
      <div className="divide-y divide-gray-50">
        {docs.map(doc => {
          const cfg = DOC_CONFIG[doc.type] ?? DOC_CONFIG.OTHER;
          const waText = `Hi ${clientName}, please find your ${cfg.label} attached.`;
          return (
            <div key={doc.id} className="px-5 py-3.5 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                <cfg.Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{doc.title ?? cfg.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(doc.generatedAt)}{doc.sentAt ? ` · Sent ${doc.sentVia ?? ""}` : ""}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {doc.pdfUrl && (
                  <a href={doc.pdfUrl} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg border border-gray-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors" title="Download PDF">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                )}
                <a href={`https://wa.me/${clientPhone.replace("+", "")}?text=${encodeURIComponent(waText)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="p-1.5 rounded-lg border border-gray-200 text-slate-500 hover:border-green-300 hover:text-green-600 transition-colors" title="Send via WhatsApp">
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function JobDetailClient({ job }: { job: JobDetailData }) {
  const worker = job.workers[0] ?? null;
  const inv = job.invoice;
  const isPaid = inv?.status === "PAID";
  const isVerified = job.status === "VERIFIED" || job.status === "CLOSED";

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/admin/jobs" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Jobs
        </Link>
        <span>/</span>
        <span className="font-mono text-slate-600">{job.jobNumber}</span>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{job.jobNumber}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusColor(job.status)}`}>
                {statusLabel(job.status)}
              </span>
              {job.priority !== "NORMAL" && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  job.priority === "EMERGENCY" ? "bg-red-100 text-red-700" :
                  job.priority === "HIGH" ? "bg-orange-100 text-orange-700" :
                  "bg-slate-100 text-slate-500"}`}>{job.priority}</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{job.jobType}</h1>
            {job.scheduledDate && (
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                <Calendar className="w-3.5 h-3.5" /> Scheduled: {formatDate(job.scheduledDate)}
              </p>
            )}
          </div>
          {/* Quick action buttons */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <a href={`https://wa.me/${job.clientPhone.replace("+", "")}?text=${encodeURIComponent(
              `Hi ${job.clientName}, following up on your ${job.jobType} job.`)}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-slate-700 px-3.5 py-2 rounded-xl text-sm font-medium hover:border-green-400 hover:text-green-700 transition-colors">
              <Phone className="w-4 h-4" /> Message Client
            </a>
            {worker && (
              <a href={`https://wa.me/${worker.phone.replace("+", "")}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-slate-700 px-3.5 py-2 rounded-xl text-sm font-medium hover:border-blue-400 hover:text-blue-700 transition-colors">
                <User className="w-4 h-4" /> Message Worker
              </a>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <QuickStat label="Quoted" value={job.quotedAmount ? formatKES(job.quotedAmount) : "—"} />
          <QuickStat
            label="Final Amount"
            value={inv ? formatKES(inv.amount) : job.finalAmount ? formatKES(job.finalAmount) : "—"}
          />
          <QuickStat
            label="Payment"
            value={inv?.status === "PARTIALLY_PAID" ? "Partial" : (inv?.status ?? "—")}
            badge={inv ? (isPaid ? "bg-green-100 text-green-700" : inv.status === "PARTIALLY_PAID" ? "bg-amber-100 text-amber-700" : "bg-yellow-100 text-yellow-700") : ""}
          />
          <QuickStat
            label="OTP"
            value={isVerified ? "Verified" : job.otpCode ? "Sent" : "Not sent"}
            badge={isVerified ? "bg-green-100 text-green-700" : job.otpCode ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="space-y-4">
          {/* Client card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Client</h3>
            <p className="font-semibold text-slate-900">{job.clientName}</p>
            <div className="space-y-1.5 mt-2 text-sm text-slate-500">
              <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" />{job.clientPhone}</p>
              {job.location && <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" />{job.location}</p>}
              {job.zone && <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" />{job.zone}</p>}
            </div>
            <div className="flex gap-2 mt-4">
              <a href={`https://wa.me/${job.clientPhone.replace("+", "")}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 text-center text-xs bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg py-1.5 font-medium transition-colors">
                WhatsApp
              </a>
              <Link href={`/admin/clients?search=${encodeURIComponent(job.clientPhone)}`}
                className="flex-1 text-center text-xs bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg py-1.5 font-medium transition-colors">
                View Client
              </Link>
            </div>
          </div>

          {/* Worker card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Assigned Worker</h3>
            {worker ? (
              <>
                <p className="font-semibold text-slate-900">{worker.name}</p>
                <p className="text-sm text-slate-500 flex items-center gap-2 mt-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />{worker.phone}
                </p>
                <span className={`mt-2 inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(job.status)}`}>
                  {statusLabel(job.status)}
                </span>
                {job.events.length > 0 && (
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Last action: {formatDate(job.events[job.events.length - 1].createdAt)}
                  </p>
                )}
                <a href={`https://wa.me/${worker.phone.replace("+", "")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="mt-3 block text-center text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg py-1.5 font-medium transition-colors">
                  WhatsApp Worker
                </a>
              </>
            ) : (
              <p className="text-sm text-slate-400">No worker assigned yet.</p>
            )}
          </div>

          {/* Asset card */}
          {job.asset && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Linked Asset</h3>
              <p className="font-semibold text-slate-900">{job.asset.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{job.asset.assetType}</p>
              <div className="space-y-1 mt-2 text-xs text-slate-500">
                {job.asset.serialNumber && <p>SN: {job.asset.serialNumber}</p>}
                {job.asset.registrationNumber && <p>Reg: {job.asset.registrationNumber}</p>}
                {job.asset.identifier && <p className="flex items-center gap-1.5"><Package className="w-3 h-3" />{job.asset.identifier}</p>}
              </div>
              <Link href={`/admin/assets/${job.asset.id}`}
                className="mt-4 block text-center text-xs bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg py-1.5 font-medium transition-colors">
                View Asset →
              </Link>
            </div>
          )}

          {/* Invoice card */}
          {inv && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Invoice</h3>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-slate-700">{inv.invoiceNumber}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isPaid ? "bg-green-100 text-green-700" : inv.status === "PARTIALLY_PAID" ? "bg-amber-100 text-amber-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {inv.status === "PARTIALLY_PAID" ? "Partial" : inv.status}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{formatKES(inv.amount)}</p>
              {inv.paidAt && <p className="text-xs text-slate-400 mt-1">Paid {formatDate(inv.paidAt)}</p>}
              {inv.paymentMethod && <p className="text-xs text-slate-500 mt-1">via {inv.paymentMethod}{inv.paymentReference ? ` · ${inv.paymentReference}` : ""}</p>}
              <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-1.5 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg py-1.5 font-medium transition-colors">
                <Download className="w-3.5 h-3.5" /> Download PDF
              </a>
            </div>
          )}

          {/* Admin Actions */}
          <AdminActions job={job} />

          {/* Notes */}
          {job.description && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Job Notes</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{job.description}</p>
            </div>
          )}
          {job.postponeReason && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
              <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Postpone Reason</h3>
              <p className="text-sm text-amber-800">{job.postponeReason}</p>
            </div>
          )}
        </div>

        {/* Right: Timeline + Documents Panel + OTP */}
        <div className="lg:col-span-2 space-y-5">
          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h2 className="font-semibold text-slate-900">Job Timeline</h2>
              <p className="text-xs text-slate-400 mt-0.5">Full audit trail of all events</p>
            </div>
            <div className="p-5">
              {job.events.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No timeline events yet.</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100" />
                  <div className="space-y-5">
                    {job.events.map((ev, i) => {
                      const cfg = EVENT_CONFIG[ev.type] ?? {
                        label: ev.type.replace(/_/g, " ").toLowerCase(),
                        color: "bg-slate-100 text-slate-500",
                        Icon: Clock,
                      };
                      const { label, color, Icon } = cfg;
                      return (
                        <div key={ev.id} className="relative flex items-start gap-4 pl-9">
                          <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <p className="text-sm font-medium text-slate-900 capitalize">{label}</p>
                            {ev.note && <p className="text-xs text-slate-500 mt-0.5">{ev.note}</p>}
                            <p className="text-[10px] text-slate-400 mt-1">{formatDate(ev.createdAt)}</p>
                          </div>
                          {i === job.events.length - 1 && (
                            <span className="shrink-0 text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">Latest</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Documents Panel */}
          <DocumentsPanel docs={job.documents} clientPhone={job.clientPhone} clientName={job.clientName} />

          {/* OTP status */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Client Verification</h2>
            {isVerified ? (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Service confirmed by client</p>
                  {job.verifiedAt && <p className="text-xs text-green-600 mt-0.5">Verified at {formatDate(job.verifiedAt)}</p>}
                </div>
              </div>
            ) : job.otpCode ? (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">OTP sent — waiting for client</p>
                  <p className="text-xs text-amber-600 mt-0.5">Client has received a 6-digit verification code</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0" />
                <p className="text-sm text-slate-500">No OTP generated yet. Worker needs to report job completion.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickStat({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      {badge ? (
        <span className={`inline-flex mt-1 text-xs px-2.5 py-1 rounded-full font-semibold ${badge}`}>{value}</span>
      ) : (
        <p className="text-base font-bold text-slate-900 mt-0.5">{value}</p>
      )}
    </div>
  );
}
