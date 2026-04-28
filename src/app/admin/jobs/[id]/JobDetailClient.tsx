"use client";
import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Phone, MapPin, Package, User, Clock, CheckCircle,
  AlertTriangle, FileText, Calendar, Banknote,
  X, RefreshCw, CheckCircle2, XCircle, Send, Download,
  Clipboard, ShieldCheck, Award, FileCheck,
  Truck, MessageCircle, MoreHorizontal, Zap, Plus,
  ChevronDown, Eye, Copy, Image as ImageIcon, CreditCard,
  Edit3, Flag, RotateCcw, Star, History, Hash, Building2,
  Navigation,
} from "lucide-react";
import { formatKES, formatDate, statusLabel } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  updateJobStatus, rescheduleJob, reassignJob,
  closeJob, markJobPaid, deleteJob, updateJob,
} from "@/app/actions/job-actions";

// ── Event config ───────────────────────────────────────────────────────────────
const EVENT_CONFIG: Record<string, { label: string; color: string; dot: string; Icon: React.ElementType }> = {
  CREATED:            { label: "Job created",                  color: "bg-[#EFF6FF] text-[#2563EB]",    dot: "bg-[#3B82F6]",    Icon: FileText      },
  ASSIGNED:           { label: "Worker assigned",              color: "bg-[#EFF6FF] text-[#2563EB]",    dot: "bg-[#3B82F6]",    Icon: User          },
  WHATSAPP_SENT:      { label: "Assignment sent via WhatsApp", color: "bg-[#F0FDF4] text-[#16A34A]",  dot: "bg-[#22C55E]",   Icon: MessageCircle },
  ACCEPTED:           { label: "Worker accepted",              color: "bg-[#F0FDF4] text-[#16A34A]",  dot: "bg-[#22C55E]",   Icon: CheckCircle2  },
  DECLINED:           { label: "Worker declined",              color: "bg-[#FFF1F2] text-[#DC2626]",      dot: "bg-[#EF4444]",     Icon: AlertTriangle },
  CHECKED_IN:         { label: "Worker arrived on-site",       color: "bg-[#EEF2FF] text-[#4F46E5]",dot: "bg-[#6366F1]",  Icon: Navigation    },
  COMPLETED:          { label: "Worker marked job done",       color: "bg-[#F5F3FF] text-[#7C3AED]",dot: "bg-[#8B5CF6]",  Icon: CheckCircle2  },
  OTP_SENT:           { label: "OTP sent to client",           color: "bg-[#FFFBEB] text-[#D97706]",  dot: "bg-[#F59E0B]",   Icon: Phone         },
  OTP_VERIFIED:       { label: "Client verified OTP",          color: "bg-[#F0FDF4] text-[#16A34A]",  dot: "bg-[#22C55E]",   Icon: CheckCircle2  },
  VERIFIED:           { label: "Job verified",                 color: "bg-[#F0FDF4] text-[#15803D]",  dot: "bg-green-600",   Icon: CheckCircle2  },
  INVOICE_GENERATED:  { label: "Invoice generated",            color: "bg-[#F8FAFC] text-[#475569]",  dot: "bg-slate-400",   Icon: FileText      },
  JOB_CARD_GENERATED: { label: "Job card generated",           color: "bg-[#F8FAFC] text-[#475569]",  dot: "bg-slate-400",   Icon: Clipboard     },
  WARRANTY_GENERATED: { label: "Warranty generated",           color: "bg-[#F8FAFC] text-[#475569]",  dot: "bg-slate-400",   Icon: ShieldCheck   },
  POSTPONED:          { label: "Job postponed",                color: "bg-[#FFFBEB] text-[#B45309]",  dot: "bg-[#F59E0B]",   Icon: Clock         },
  RESCHEDULED:        { label: "Job rescheduled",              color: "bg-[#EFF6FF] text-[#2563EB]",    dot: "bg-[#3B82F6]",    Icon: Calendar      },
  REASSIGNED:         { label: "Reassigned to new worker",     color: "bg-[#EFF6FF] text-[#2563EB]",    dot: "bg-[#3B82F6]",    Icon: RefreshCw     },
  STATUS_CHANGE:      { label: "Status updated",               color: "bg-[#F8FAFC] text-[#64748B]",  dot: "bg-slate-400",   Icon: CheckCircle   },
  CLOSED:             { label: "Job closed",                   color: "bg-[#F8FAFC] text-[#64748B]",  dot: "bg-slate-400",   Icon: CheckCircle   },
  CANCELLED:          { label: "Job cancelled",                color: "bg-[#FFF1F2] text-[#DC2626]",      dot: "bg-[#EF4444]",     Icon: XCircle       },
  ISSUE_REPORTED:     { label: "Issue reported",               color: "bg-[#FFF1F2] text-[#DC2626]",      dot: "bg-[#EF4444]",     Icon: AlertTriangle },
  PAYMENT_RECORDED:   { label: "Payment recorded",             color: "bg-[#F0FDF4] text-[#16A34A]",  dot: "bg-[#22C55E]",   Icon: Banknote      },
  NOTE_ADDED:         { label: "Note added",                   color: "bg-[#F8FAFC] text-[#475569]",  dot: "bg-slate-400",   Icon: Edit3         },
};

const DOC_CONFIG: Record<string, { label: string; Icon: React.ElementType; color: string; bg: string }> = {
  INVOICE:                     { label: "Invoice",              Icon: FileText,    color: "text-[#2563EB]",   bg: "bg-[#EFF6FF]"   },
  JOB_CARD:                    { label: "Job Card",             Icon: Clipboard,   color: "text-[#475569]",  bg: "bg-[#F1F5F9]" },
  WARRANTY_CERTIFICATE:        { label: "Warranty",             Icon: ShieldCheck, color: "text-[#16A34A]",  bg: "bg-[#F0FDF4]"  },
  INSTALLATION_REPORT:         { label: "Installation Report",  Icon: FileCheck,   color: "text-[#4F46E5]", bg: "bg-[#EEF2FF]" },
  SERVICE_REPORT:               { label: "Service Report",       Icon: Award,       color: "text-[#9333EA]", bg: "bg-[#F5F3FF]" },
  FUEL_CALIBRATION_REPORT:     { label: "Fuel Calibration",     Icon: Package,     color: "text-[#D97706]",  bg: "bg-[#FFFBEB]"  },
  DEVICE_REPLACEMENT_REPORT:   { label: "Device Replacement",   Icon: Package,     color: "text-[#EA580C]", bg: "bg-[#FFF7ED]" },
  CLIENT_CONFIRMATION_RECEIPT: { label: "Client Confirmation",  Icon: CheckCircle2,color: "text-[#16A34A]",  bg: "bg-[#F0FDF4]"  },
  DELIVERY_NOTE:               { label: "Delivery Note",        Icon: Truck,       color: "text-[#0891B2]",   bg: "bg-[#ECFEFF]"   },
  OTHER:                       { label: "Document",             Icon: FileText,    color: "text-[#64748B]",  bg: "bg-[#F1F5F9]" },
};

// ── Types ──────────────────────────────────────────────────────────────────────
type Worker   = { id: string; name: string; phone: string };
type Asset    = { id: string; name: string; assetType: string; identifier: string | null; serialNumber: string | null; registrationNumber: string | null };
type Invoice  = { id: string; invoiceNumber: string; amount: number; status: string; paidAt: Date | null; paymentMethod: string | null; paymentReference: string | null; pdfUrl: string | null };
type JobEvent = { id: string; type: string; note: string | null; createdAt: Date };
type Document = { id: string; type: string; title: string | null; pdfUrl: string | null; sentAt: Date | null; sentVia: string | null; generatedAt: Date };

export type JobDetailData = {
  id: string; jobNumber: string; jobType: string; status: string; priority: string;
  clientName: string; clientPhone: string; location: string | null; zone: string | null;
  description: string | null; scheduledDate: Date | null;
  quotedAmount: number | null; finalAmount: number | null;
  otpCode: string | null; verifiedAt: Date | null; completedAt: Date | null;
  postponeReason: string | null;
  workers: Worker[]; invoice: Invoice | null; events: JobEvent[];
  asset: Asset | null; documents: Document[]; allWorkers: Worker[];
};

type TabId = "timeline" | "documents" | "details" | "notes" | "photos" | "payments";

// ── Small helpers ──────────────────────────────────────────────────────────────
function priorityBadge(priority: string) {
  if (priority === "EMERGENCY") return "bg-[#FFF1F2] text-red-700 border border-[#FECACA]";
  if (priority === "HIGH")      return "bg-[#FFF7ED] text-[#C2410C] border border-orange-200";
  if (priority === "LOW")       return "bg-[#F8FAFC] text-[#64748B] border border-slate-200";
  return "";
}

// ── Mark Paid Modal ────────────────────────────────────────────────────────────
function MarkPaidModal({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const [method, setMethod] = useState("MPESA");
  const [reference, setReference] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      await markJobPaid(jobId, method, reference || undefined);
      onClose(); router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Record Payment</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#94A3B8]"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[#475569] block mb-1.5">Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)} className="ff-input text-sm">
              {["MPESA", "CASH", "BANK", "CHEQUE", "OTHER"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          {method === "MPESA" && (
            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1.5">M-Pesa Reference</label>
              <input value={reference} onChange={e => setReference(e.target.value)}
                placeholder="e.g. QJ7F8K2L" maxLength={20} className="ff-input text-sm" />
            </div>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="ff-btn-secondary flex-1 text-sm">Cancel</button>
          <button onClick={submit} disabled={pending}
            className="flex-1 bg-[#16A34A] hover:bg-green-700 text-white rounded-[10px] py-2 text-sm font-semibold disabled:opacity-50 transition-colors">
            {pending ? "Saving…" : "Mark Paid"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reschedule Modal ───────────────────────────────────────────────────────────
function RescheduleModal({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const [date, setDate] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!date) return;
    startTransition(async () => {
      await rescheduleJob(jobId, date);
      onClose(); router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Reschedule Job</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#94A3B8]"><X className="w-4 h-4" /></button>
        </div>
        <div>
          <label className="text-xs font-medium text-[#475569] block mb-1.5">New Date & Time</label>
          <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="ff-input text-sm" />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="ff-btn-secondary flex-1 text-sm">Cancel</button>
          <button onClick={submit} disabled={!date || pending} className="ff-btn-primary flex-1 text-sm disabled:opacity-50">
            {pending ? "Saving…" : "Reschedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reassign Modal ─────────────────────────────────────────────────────────────
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
      onClose(); router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Reassign Worker</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#94A3B8]"><X className="w-4 h-4" /></button>
        </div>
        <div>
          <label className="text-xs font-medium text-[#475569] block mb-1.5">Select Worker</label>
          <select value={workerId} onChange={e => setWorkerId(e.target.value)} className="ff-input text-sm">
            <option value="">Choose worker…</option>
            {allWorkers.map(w => <option key={w.id} value={w.id}>{w.name} · {w.phone}</option>)}
          </select>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="ff-btn-secondary flex-1 text-sm">Cancel</button>
          <button onClick={submit} disabled={!workerId || pending} className="ff-btn-primary flex-1 text-sm disabled:opacity-50">
            {pending ? "Saving…" : "Reassign"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Job Modal ─────────────────────────────────────────────────────────────
function EditJobModal({ job, onClose }: { job: JobDetailData; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateJob(job.id, {
        jobType:       (fd.get("jobType")       as string) || undefined,
        description:   fd.get("description")    as string,
        location:      fd.get("location")       as string,
        zone:          fd.get("zone")           as string,
        scheduledDate: fd.get("scheduledDate")  as string || undefined,
        quotedAmount:  fd.get("quotedAmount")   ? Number(fd.get("quotedAmount")) : undefined,
        priority:      fd.get("priority")       as string || undefined,
      });
      if (res.error) { setError(res.error); return; }
      onClose();
      router.refresh();
    });
  }

  const inp = "ff-input text-sm";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-lg max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] shrink-0">
          <h3 className="font-bold text-[#0F172A]">Edit Job · {job.jobNumber}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F8FAFC] text-[#94A3B8]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <p className="text-xs text-[#DC2626] bg-[#FFF1F2] border border-[#FECACA] px-3 py-2 rounded-[8px]">{error}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5">Job Type</label>
              <input name="jobType" defaultValue={job.jobType} className={inp} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5">Priority</label>
              <select name="priority" defaultValue={job.priority} className={inp}>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="EMERGENCY">Emergency</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1.5">Location</label>
            <input name="location" defaultValue={job.location ?? ""} className={inp} placeholder="Address / location" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5">Scheduled Date & Time</label>
              <input name="scheduledDate" type="datetime-local" className={inp}
                defaultValue={job.scheduledDate ? new Date(job.scheduledDate).toISOString().slice(0, 16) : ""} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5">Quoted Amount (KES)</label>
              <input name="quotedAmount" type="number" defaultValue={job.quotedAmount ?? ""} className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1.5">Description / Notes</label>
            <textarea name="description" rows={3} defaultValue={job.description ?? ""}
              className={`${inp} resize-none`} placeholder="Job description, notes…" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="ff-btn-secondary flex-1 text-sm">Cancel</button>
            <button type="submit" disabled={pending} className="ff-btn-primary flex-1 text-sm disabled:opacity-50">
              {pending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Cancel Job Button (header) ─────────────────────────────────────────────────
function CancelJobButton({ job }: { job: JobDetailData }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isDone = job.status === "CLOSED" || job.status === "CANCELLED";
  if (isDone) return null;
  function handle() {
    if (!confirm("Cancel this job? This cannot be undone.")) return;
    startTransition(async () => { await deleteJob(job.id); router.refresh(); });
  }
  return (
    <button onClick={handle} disabled={pending}
      className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-[10px] border border-[#FCA5A5] text-[#DC2626] hover:bg-[#FFF1F2] transition-colors font-semibold disabled:opacity-50">
      <X className="w-4 h-4" /> Cancel Job
    </button>
  );
}

// ── More Actions Dropdown ──────────────────────────────────────────────────────
function MoreActionsMenu({ job }: { job: JobDetailData }) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<"paid" | "reschedule" | "reassign" | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  const isDone = job.status === "CLOSED" || job.status === "CANCELLED";
  const inv = job.invoice;
  const isPaid = inv?.status === "PAID";

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function doClose() {
    if (!confirm("Close this job?")) return;
    startTransition(async () => { await closeJob(job.id); router.refresh(); });
  }
  function doCancel() {
    if (!confirm("Cancel this job? This cannot be undone.")) return;
    startTransition(async () => { await deleteJob(job.id); router.refresh(); });
  }

  const items = [
    { label: "Message Client", icon: MessageCircle, action: () => { setOpen(false); window.open(`https://wa.me/${job.clientPhone.replace("+", "")}?text=${encodeURIComponent(`Hi ${job.clientName}, following up on your ${job.jobType}.`)}`, "_blank"); }, color: "text-[#15803D]" },
    ...(inv && !isPaid ? [{ label: "Mark as Paid", icon: Banknote, action: () => { setModal("paid"); setOpen(false); }, color: "text-[#15803D]" }] : []),
    ...(!isDone ? [{ label: "Reschedule Job", icon: Calendar, action: () => { setModal("reschedule"); setOpen(false); }, color: "text-[#1D4ED8]" }] : []),
    ...(!isDone ? [{ label: "Reassign Worker", icon: RefreshCw, action: () => { setModal("reassign"); setOpen(false); }, color: "text-[#334155]" }] : []),
    { label: "Duplicate Job", icon: Copy, action: () => setOpen(false), color: "text-[#334155]" },
    ...((!isDone && (job.status === "VERIFIED" || job.status === "COMPLETED_PENDING_VERIFICATION"))
      ? [{ label: "Close Job", icon: CheckCircle2, action: () => { doClose(); setOpen(false); }, color: "text-[#334155]" }] : []),
    ...(!isDone ? [{ label: "Cancel Job", icon: XCircle, action: () => { doCancel(); setOpen(false); }, color: "text-[#DC2626]" }] : []),
  ];

  return (
    <>
      {modal === "paid" && <MarkPaidModal jobId={job.id} onClose={() => setModal(null)} />}
      {modal === "reschedule" && <RescheduleModal jobId={job.id} onClose={() => setModal(null)} />}
      {modal === "reassign" && (
        <ReassignModal jobId={job.id} allWorkers={job.allWorkers}
          currentWorkerId={job.workers[0]?.id} onClose={() => setModal(null)} />
      )}
      <div ref={ref} className="relative">
        <button onClick={() => setOpen(v => !v)}
          className="ff-btn-secondary inline-flex items-center gap-1.5 text-sm px-3 py-2">
          More actions
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1.5 bg-white rounded-[12px] border border-[#E2E8F0] shadow-card py-1 z-30 w-48 min-w-max">
            {items.map((item, i) => (
              <button key={i} onClick={item.action}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium hover:bg-[#F8FAFC] transition-colors ${item.color}`}>
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Timeline Tab ───────────────────────────────────────────────────────────────
function TimelineTab({ events }: { events: JobEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mb-3">
          <History className="w-5 h-5 text-[#94A3B8]" />
        </div>
        <p className="text-sm font-medium text-[#64748B]">No timeline events yet</p>
        <p className="text-xs text-[#94A3B8] mt-1">Events will appear here as the job progresses</p>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[17px] top-2 bottom-2 w-px bg-[#E2E8F0]" />
        <div className="space-y-4">
          {[...events].reverse().map((ev, i) => {
            const cfg = EVENT_CONFIG[ev.type] ?? {
              label: ev.type.replace(/_/g, " ").toLowerCase(),
              color: "bg-[#F8FAFC] text-[#64748B]",
              dot: "bg-slate-300",
              Icon: Clock,
            };
            const isLatest = i === 0;
            return (
              <div key={ev.id} className="relative flex items-start gap-3.5 pl-10">
                {/* Dot */}
                <div className={`absolute left-0 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
                  <cfg.Icon className="w-4 h-4" />
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-[#0F172A] capitalize leading-tight">{cfg.label}</p>
                    {isLatest && (
                      <span className="text-[10px] bg-[#2563EB] text-white px-2 py-0.5 rounded-full font-semibold">Latest</span>
                    )}
                  </div>
                  {ev.note && <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{ev.note}</p>}
                  <p className="text-[10px] text-[#94A3B8] mt-1">{formatDate(ev.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Documents Tab ──────────────────────────────────────────────────────────────
function DocumentsTab({ docs, clientPhone, clientName }: {
  docs: Document[]; clientPhone: string; clientName: string;
}) {
  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mb-3">
          <FileText className="w-5 h-5 text-[#94A3B8]" />
        </div>
        <p className="text-sm font-medium text-[#64748B]">No documents yet</p>
        <p className="text-xs text-[#94A3B8] mt-1">Documents are auto-generated when the job is verified</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-2">
      {docs.map(doc => {
        const cfg = DOC_CONFIG[doc.type] ?? DOC_CONFIG.OTHER;
        const waText = `Hi ${clientName}, please find your ${cfg.label} attached.`;
        return (
          <div key={doc.id}
            className="flex items-center gap-3 p-3.5 rounded-[12px] border border-[#E2E8F0] hover:border-[#2563EB]/30 hover:bg-[#EFF6FF]/30 transition-colors group">
            <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${cfg.bg}`}>
              <cfg.Icon className={`w-4.5 h-4.5 ${cfg.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#0F172A] truncate">{doc.title ?? cfg.label}</p>
              <p className="text-[10px] text-[#94A3B8] mt-0.5">
                {formatDate(doc.generatedAt)}
                {doc.sentAt ? ` · Sent via ${doc.sentVia ?? "WhatsApp"}` : " · Not sent yet"}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {doc.pdfUrl && (
                <a href={doc.pdfUrl} target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-[8px] border border-[#E2E8F0] text-[#64748B] hover:border-[#2563EB]/50 hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors" title="Download">
                  <Download className="w-3.5 h-3.5" />
                </a>
              )}
              <a href={`https://wa.me/${clientPhone.replace("+", "")}?text=${encodeURIComponent(waText)}`}
                target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-[8px] border border-[#E2E8F0] text-[#64748B] hover:border-[#4ADE80] hover:text-[#16A34A] hover:bg-[#F0FDF4] transition-colors" title="Send via WhatsApp">
                <MessageCircle className="w-3.5 h-3.5" />
              </a>
              {doc.pdfUrl && (
                <a href={doc.pdfUrl} target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-[8px] border border-[#E2E8F0] text-[#64748B] hover:border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors" title="View">
                  <Eye className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Details Tab ────────────────────────────────────────────────────────────────
function DetailsTab({ job }: { job: JobDetailData }) {
  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: "Job Type", value: job.jobType, icon: Hash },
          { label: "Status", value: statusLabel(job.status), icon: Flag },
          { label: "Priority", value: job.priority, icon: Zap },
          { label: "Location", value: job.location ?? "—", icon: MapPin },
          { label: "Zone", value: job.zone ?? "—", icon: Navigation },
          { label: "Scheduled", value: job.scheduledDate ? formatDate(job.scheduledDate) : "—", icon: Calendar },
          { label: "Quoted Amount", value: job.quotedAmount ? formatKES(job.quotedAmount) : "—", icon: Banknote },
          { label: "Final Amount", value: job.invoice ? formatKES(job.invoice.amount) : job.finalAmount ? formatKES(job.finalAmount) : "—", icon: CreditCard },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-start gap-3 p-3.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="w-8 h-8 rounded-[8px] bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0">
              <Icon className="w-3.5 h-3.5 text-[#64748B]" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide">{label}</p>
              <p className="text-sm font-medium text-[#0F172A] mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Notes Tab ─────────────────────────────────────────────────────────────────
function NotesTab({ job }: { job: JobDetailData }) {
  const hasNotes = job.description || job.postponeReason;
  if (!hasNotes) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mb-3">
          <Edit3 className="w-5 h-5 text-[#94A3B8]" />
        </div>
        <p className="text-sm font-medium text-[#64748B]">No notes yet</p>
        <p className="text-xs text-[#94A3B8] mt-1">Job notes and postponement reasons appear here</p>
      </div>
    );
  }
  return (
    <div className="p-5 space-y-4">
      {job.description && (
        <div className="p-4 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0]">
          <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-2">Job Description</p>
          <p className="text-sm text-[#334155] whitespace-pre-wrap leading-relaxed">{job.description}</p>
        </div>
      )}
      {job.postponeReason && (
        <div className="p-4 rounded-[12px] bg-[#FFFBEB] border border-[#FDE68A]">
          <p className="text-[10px] font-semibold text-[#D97706] uppercase tracking-wide mb-2">Postponement Reason</p>
          <p className="text-sm text-[#92400E] leading-relaxed">{job.postponeReason}</p>
        </div>
      )}
    </div>
  );
}

// ── Photos Tab ────────────────────────────────────────────────────────────────
function PhotosTab() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mb-3">
        <ImageIcon className="w-5 h-5 text-[#94A3B8]" />
      </div>
      <p className="text-sm font-medium text-[#64748B]">No photos yet</p>
      <p className="text-xs text-[#94A3B8] mt-1">Workers can attach before/after photos via WhatsApp</p>
    </div>
  );
}

// ── Payments Tab ──────────────────────────────────────────────────────────────
function PaymentsTab({ job }: { job: JobDetailData }) {
  const inv = job.invoice;
  if (!inv) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mb-3">
          <CreditCard className="w-5 h-5 text-[#94A3B8]" />
        </div>
        <p className="text-sm font-medium text-[#64748B]">No invoice yet</p>
        <p className="text-xs text-[#94A3B8] mt-1">Invoice is auto-generated when the worker reports completion</p>
      </div>
    );
  }
  const isPaid = inv.status === "PAID";
  return (
    <div className="p-5 space-y-4">
      {/* Invoice summary */}
      <div className="p-4 rounded-[12px] border border-[#E2E8F0] bg-white">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide">Invoice</p>
            <p className="font-mono text-sm font-bold text-[#0F172A] mt-0.5">{inv.invoiceNumber}</p>
          </div>
          <StatusBadge status={inv.status} />
        </div>
        <p className="text-3xl font-bold text-[#0F172A]">{formatKES(inv.amount)}</p>
        {inv.paidAt && (
          <p className="text-xs text-[#64748B] mt-2">Paid {formatDate(inv.paidAt)}</p>
        )}
        {inv.paymentMethod && (
          <p className="text-xs text-[#64748B] mt-1">
            via {inv.paymentMethod}{inv.paymentReference ? ` · ${inv.paymentReference}` : ""}
          </p>
        )}
      </div>
      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {inv.pdfUrl && (
          <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer"
            className="ff-btn-secondary inline-flex items-center gap-1.5 text-sm px-3 py-2">
            <Download className="w-3.5 h-3.5" /> Download Invoice
          </a>
        )}
        <a href={`https://wa.me/${job.clientPhone.replace("+", "")}?text=${encodeURIComponent(
          `Hi ${job.clientName}, your invoice ${inv.invoiceNumber} for ${formatKES(inv.amount)} is ready.`)}`}
          target="_blank" rel="noopener noreferrer"
          className="ff-btn-secondary inline-flex items-center gap-1.5 text-sm px-3 py-2">
          <Send className="w-3.5 h-3.5" /> Send Invoice
        </a>
        {!isPaid && (
          <a href={`https://wa.me/${job.clientPhone.replace("+", "")}?text=${encodeURIComponent(
            `Hi ${job.clientName}, a gentle reminder that your invoice of ${formatKES(inv.amount)} (${inv.invoiceNumber}) is still pending. Thank you!`)}`}
            target="_blank" rel="noopener noreferrer"
            className="ff-btn-secondary inline-flex items-center gap-1.5 text-sm px-3 py-2 text-[#B45309] border-[#FCD34D] hover:bg-[#FFFBEB]">
            <AlertTriangle className="w-3.5 h-3.5" /> Send Reminder
          </a>
        )}
      </div>
    </div>
  );
}

// ── Admin Quick Actions ────────────────────────────────────────────────────────
function AdminQuickActions({ job, onTabChange }: { job: JobDetailData; onTabChange?: (tab: TabId) => void }) {
  const [modal, setModal] = useState<"paid" | "reschedule" | "reassign" | null>(null);
  const [cancelPending, startCancelTransition] = useTransition();
  const router = useRouter();
  const worker = job.workers[0];
  const inv = job.invoice;
  const isPaid = inv?.status === "PAID";
  const isDone = job.status === "CLOSED" || job.status === "CANCELLED";

  function doCancel() {
    if (!confirm("Cancel this job? This cannot be undone.")) return;
    startCancelTransition(async () => { await deleteJob(job.id); router.refresh(); });
  }

  type Action = { label: string; icon: React.ElementType; color: string; bg: string; href?: string; onClick?: () => void; disabled?: boolean };

  const actions: Action[] = [
    {
      label: "Send Invoice", icon: FileText, color: "text-[#1D4ED8]", bg: "bg-[#EFF6FF]",
      ...(inv
        ? { href: `https://wa.me/${job.clientPhone.replace("+", "")}?text=${encodeURIComponent(`Hi ${job.clientName}, please find your invoice ${inv.invoiceNumber} of ${formatKES(inv.amount)} attached.`)}` }
        : { disabled: true, onClick: () => {} }),
    },
    {
      label: "Send Job Card", icon: Clipboard, color: "text-[#334155]", bg: "bg-[#F8FAFC]",
      href: `https://wa.me/${job.clientPhone.replace("+", "")}?text=${encodeURIComponent(`Hi ${job.clientName}, your job card for ${job.jobType} is ready.`)}`,
    },
    {
      label: "Send Warranty", icon: ShieldCheck, color: "text-[#15803D]", bg: "bg-[#F0FDF4]",
      href: `https://wa.me/${job.clientPhone.replace("+", "")}?text=${encodeURIComponent(`Hi ${job.clientName}, your warranty certificate is attached.`)}`,
    },
    {
      label: "Send Service Report", icon: Award, color: "text-[#7C3AED]", bg: "bg-[#F5F3FF]",
      href: `https://wa.me/${job.clientPhone.replace("+", "")}?text=${encodeURIComponent(`Hi ${job.clientName}, your service report is attached.`)}`,
    },
    {
      label: "Send Payment Reminder", icon: Banknote, color: "text-[#B45309]", bg: "bg-[#FFFBEB]",
      ...(inv && !isPaid
        ? { href: `https://wa.me/${job.clientPhone.replace("+", "")}?text=${encodeURIComponent(`Hi ${job.clientName}, reminder: your invoice of ${formatKES(inv.amount)} is still pending. Ref: ${inv.invoiceNumber}.`)}` }
        : { disabled: true, onClick: () => {} }),
    },
    {
      label: "Reschedule Job", icon: Calendar, color: "text-[#1D4ED8]", bg: "bg-[#EFF6FF]",
      ...(!isDone ? { onClick: () => setModal("reschedule") } : { disabled: true, onClick: () => {} }),
    },
    {
      label: "Reassign Worker", icon: RefreshCw, color: "text-[#334155]", bg: "bg-[#F8FAFC]",
      ...(!isDone ? { onClick: () => setModal("reassign") } : { disabled: true, onClick: () => {} }),
    },
    {
      label: "Add Note", icon: Edit3, color: "text-[#4338CA]", bg: "bg-[#EEF2FF]",
      onClick: () => onTabChange?.("notes"),
    },
    {
      label: "View Client", icon: Building2, color: "text-[#334155]", bg: "bg-[#F8FAFC]",
      href: `/admin/clients?search=${encodeURIComponent(job.clientPhone)}`,
    },
    {
      label: "View Asset", icon: Package, color: "text-[#334155]", bg: "bg-[#F8FAFC]",
      ...(job.asset ? { href: `/admin/assets/${job.asset.id}` } : { disabled: true, onClick: () => {} }),
    },
    {
      label: "Duplicate Job", icon: Copy, color: "text-[#334155]", bg: "bg-[#F8FAFC]",
      onClick: () => {},
    },
    {
      label: "Cancel Job", icon: XCircle, color: "text-[#DC2626]", bg: "bg-[#FFF1F2]",
      ...(!isDone ? { onClick: doCancel } : { disabled: true, onClick: () => {} }),
    },
  ];

  const cls = (disabled?: boolean) =>
    `flex items-center gap-2 px-3 py-2.5 rounded-[10px] border border-[#E2E8F0] hover:border-[#2563EB]/20 hover:bg-[#F8FAFC] transition-colors text-left ${disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`;

  return (
    <>
      {modal === "reschedule" && <RescheduleModal jobId={job.id} onClose={() => setModal(null)} />}
      {modal === "reassign" && (
        <ReassignModal jobId={job.id} allWorkers={job.allWorkers}
          currentWorkerId={worker?.id} onClose={() => setModal(null)} />
      )}
      <div className="grid grid-cols-2 gap-2 p-4">
        {actions.map((action, i) => {
          const content = (
            <>
              <div className={`w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 ${action.bg}`}>
                <action.icon className={`w-3.5 h-3.5 ${action.color}`} />
              </div>
              <span className="text-xs font-medium text-[#334155] leading-tight truncate">{action.label}</span>
            </>
          );
          if (action.href) {
            return (
              <a key={i} href={action.href}
                target={action.href.startsWith("http") ? "_blank" : undefined}
                rel={action.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className={cls(action.disabled)}>{content}</a>
            );
          }
          return (
            <button key={i} onClick={action.onClick} disabled={action.disabled} className={cls(action.disabled)}>
              {content}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function JobDetailClient({ job }: { job: JobDetailData }) {
  const [activeTab, setActiveTab] = useState<TabId>("timeline");
  const [showEdit, setShowEdit] = useState(false);
  const worker = job.workers[0] ?? null;
  const inv = job.invoice;
  const isPaid = inv?.status === "PAID";
  const isVerified = job.status === "VERIFIED" || job.status === "CLOSED";
  const noteCount = (job.description ? 1 : 0) + (job.postponeReason ? 1 : 0);

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "timeline", label: "Timeline", count: job.events.length },
    { id: "documents", label: "Documents", count: job.documents.length },
    { id: "details", label: "Job Details" },
    { id: "notes", label: "Notes", count: noteCount || undefined },
    { id: "photos", label: "Photos" },
    { id: "payments", label: "Payments" },
  ];

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
        <Link href="/admin/jobs"
          className="hover:text-[#2563EB] flex items-center gap-1 font-medium transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Jobs
        </Link>
        <span>/</span>
        <span className="font-mono text-[#64748B] font-medium">{job.jobNumber}</span>
      </div>

      {/* ── Header Card ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-mono text-xs bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] px-2.5 py-1 rounded-[6px] font-medium">
                {job.jobNumber}
              </span>
              <StatusBadge status={job.status} />
              {job.priority !== "NORMAL" && (
                <span className={`text-xs px-2.5 py-1 rounded-[6px] font-semibold ${priorityBadge(job.priority)}`}>
                  {job.priority === "EMERGENCY" ? "🚨 Emergency" : job.priority === "HIGH" ? "⚠️ High Priority" : job.priority}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] leading-tight">{job.jobType}</h1>
            <div className="flex items-center gap-3 sm:gap-4 mt-2 flex-wrap">
              {job.scheduledDate && (
                <p className="text-xs text-[#64748B] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" /> {formatDate(job.scheduledDate)}
                </p>
              )}
              {job.location && (
                <p className="text-xs text-[#64748B] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" /> {job.location}
                </p>
              )}
              {job.completedAt && (
                <p className="text-xs text-[#64748B] flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-[#94A3B8]" /> Completed {formatDate(job.completedAt)}
                </p>
              )}
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <MoreActionsMenu job={job} />
            <button onClick={() => setShowEdit(true)}
              className="ff-btn-primary inline-flex items-center gap-1.5 text-sm px-3 py-2">
              <Edit3 className="w-4 h-4" /> Edit Job
            </button>
            <CancelJobButton job={job} />
          </div>
        </div>

        {/* ── 5 Info Cards Row ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5 pt-5 border-t border-[#E2E8F0]">

          {/* Client */}
          <div className="rounded-[12px] border border-[#E2E8F0] overflow-hidden bg-white">
            <div className="p-3.5 space-y-1.5">
              <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide flex items-center gap-1.5">
                <User className="w-3 h-3" /> Client
              </p>
              <p className="text-sm font-semibold text-[#0F172A] truncate">{job.clientName}</p>
              <p className="text-[11px] text-[#64748B] truncate">{job.clientPhone}</p>
              {job.location && (
                <p className="text-[11px] text-[#94A3B8] flex items-center gap-1 truncate">
                  <MapPin className="w-2.5 h-2.5 shrink-0" />{job.location}
                </p>
              )}
            </div>
            <div className="border-t border-[#E2E8F0] px-3.5 py-2.5">
              <a href={`https://wa.me/${job.clientPhone.replace("+", "")}?text=${encodeURIComponent(`Hi ${job.clientName}, following up on your ${job.jobType}.`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-[#334155] hover:text-[#16A34A] transition-colors">
                <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" /> Send WhatsApp
              </a>
            </div>
          </div>

          {/* Worker */}
          <div className="rounded-[12px] border border-[#E2E8F0] overflow-hidden bg-white">
            <div className="p-3.5 space-y-1.5">
              <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide flex items-center gap-1.5">
                <User className="w-3 h-3" /> Worker
              </p>
              {worker ? (
                <>
                  <p className="text-sm font-semibold text-[#0F172A] truncate">{worker.name}</p>
                  <p className="text-[11px] text-[#64748B] truncate">{worker.phone}</p>
                  <StatusBadge status={job.status} size="xs" />
                </>
              ) : (
                <p className="text-xs text-[#94A3B8]">Not assigned</p>
              )}
            </div>
            <div className="border-t border-[#E2E8F0] px-3.5 py-2.5 flex items-center gap-3">
              {worker ? (
                <>
                  <a href={`tel:${worker.phone}`}
                    className="flex items-center gap-1.5 text-xs font-medium text-[#334155] hover:text-[#2563EB] transition-colors">
                    <Phone className="w-3 h-3" /> Call
                  </a>
                  <span className="text-[#E2E8F0]">|</span>
                  <a href={`https://wa.me/${worker.phone.replace("+", "")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-[#334155] hover:text-[#16A34A] transition-colors">
                    <MessageCircle className="w-3 h-3 text-[#25D366]" /> WhatsApp
                  </a>
                </>
              ) : (
                <span className="text-xs text-[#94A3B8]">No worker yet</span>
              )}
            </div>
          </div>

          {/* Asset */}
          <div className="rounded-[12px] border border-[#E2E8F0] overflow-hidden bg-white">
            <div className="p-3.5 space-y-1.5">
              <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide flex items-center gap-1.5">
                <Package className="w-3 h-3" /> Asset
              </p>
              {job.asset ? (
                <>
                  <p className="text-sm font-semibold text-[#0F172A] truncate">{job.asset.name}</p>
                  <p className="text-[11px] text-[#64748B] truncate">
                    {job.asset.assetType}{job.asset.identifier ? ` · ${job.asset.identifier}` : ""}
                  </p>
                  {(job.asset.serialNumber ?? job.asset.registrationNumber) && (
                    <p className="text-[11px] text-[#94A3B8] font-mono truncate">
                      ID: {job.asset.serialNumber ?? job.asset.registrationNumber}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-[#94A3B8]">No asset linked</p>
              )}
            </div>
            <div className="border-t border-[#E2E8F0] px-3.5 py-2.5">
              {job.asset ? (
                <Link href={`/admin/assets/${job.asset.id}`}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#334155] hover:text-[#2563EB] transition-colors">
                  <Package className="w-3 h-3" /> View Asset
                </Link>
              ) : (
                <span className="text-xs text-[#94A3B8]">—</span>
              )}
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-[12px] border border-[#E2E8F0] overflow-hidden bg-white">
            <div className="p-3.5 space-y-1.5">
              <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide flex items-center gap-1.5">
                <Banknote className="w-3 h-3" /> Payment
              </p>
              {inv ? (
                <>
                  <p className="text-xl font-bold text-[#0F172A]">{formatKES(inv.amount)}</p>
                  <StatusBadge status={inv.status} size="xs" />
                  <p className="text-[11px] text-[#64748B]">Invoiced: {formatKES(inv.amount)}</p>
                  {inv.paidAt && (
                    <p className="text-[11px] text-[#64748B]">Paid: {formatDate(inv.paidAt)}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-[#0F172A]">{job.quotedAmount ? formatKES(job.quotedAmount) : "—"}</p>
                  <p className="text-[11px] text-[#94A3B8]">No invoice yet</p>
                </>
              )}
            </div>
            <div className="border-t border-[#E2E8F0] px-3.5 py-2.5">
              {inv ? (
                <button onClick={() => setActiveTab("payments")}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#334155] hover:text-[#2563EB] transition-colors">
                  <CreditCard className="w-3 h-3" /> View Invoice
                </button>
              ) : (
                <span className="text-xs text-[#94A3B8]">Pending</span>
              )}
            </div>
          </div>

          {/* Verification */}
          <div className="rounded-[12px] border border-[#E2E8F0] overflow-hidden bg-white col-span-2 sm:col-span-1">
            <div className="p-3.5 space-y-1.5">
              <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> Verification
              </p>
              {isVerified ? (
                <>
                  <p className="text-sm font-semibold text-[#16A34A]">OTP Verified</p>
                  {job.verifiedAt && <p className="text-[11px] text-[#64748B]">{formatDate(job.verifiedAt)}</p>}
                  <p className="text-[11px] text-[#64748B]">Verified by client</p>
                </>
              ) : job.otpCode ? (
                <>
                  <p className="text-sm font-semibold text-[#D97706]">OTP Sent</p>
                  <p className="text-[11px] text-[#64748B]">Awaiting client</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-[#94A3B8]">Not started</p>
                  <p className="text-[11px] text-[#94A3B8]">No OTP yet</p>
                </>
              )}
            </div>
            <div className="border-t border-[#E2E8F0] px-3.5 py-2.5">
              <button onClick={() => setActiveTab("timeline")}
                className="flex items-center gap-1.5 text-xs font-medium text-[#334155] hover:text-[#2563EB] transition-colors">
                <Eye className="w-3 h-3" /> View details
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── Body: Main Tabs + Right Panel ──────────────────────────────────── */}
      <div className="flex gap-5 items-start">
        {/* Left: Tab Card */}
        <div className="flex-1 bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden min-w-0">
          {/* Tab Bar */}
          <div className="border-b border-[#E2E8F0] px-4 overflow-x-auto scrollbar-none">
            <div className="flex gap-0 min-w-max">
              {tabs.map(tab => (
                <button key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`ff-tab ${activeTab === tab.id ? "ff-tab-active" : "ff-tab-inactive"}`}>
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold
                      ${activeTab === tab.id ? "bg-[#2563EB]/15 text-[#2563EB]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "timeline" && <TimelineTab events={job.events} />}
          {activeTab === "documents" && (
            <DocumentsTab docs={job.documents} clientPhone={job.clientPhone} clientName={job.clientName} />
          )}
          {activeTab === "details" && <DetailsTab job={job} />}
          {activeTab === "notes" && <NotesTab job={job} />}
          {activeTab === "photos" && <PhotosTab />}
          {activeTab === "payments" && <PaymentsTab job={job} />}
        </div>

        {/* Right Panel */}
        <div className="hidden xl:flex flex-col gap-4 w-80 shrink-0">

          {/* Documents */}
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
            <div className="px-4 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#64748B]" />
                <h3 className="text-sm font-semibold text-[#0F172A]">Documents</h3>
                {job.documents.length > 0 && (
                  <span className="text-[10px] bg-[#F1F5F9] text-[#64748B] px-1.5 py-0.5 rounded-full font-semibold">
                    {job.documents.length}
                  </span>
                )}
              </div>
              <button onClick={() => setActiveTab("documents")}
                className="text-xs text-[#2563EB] font-medium hover:text-[#1D4ED8] transition-colors">
                View all
              </button>
            </div>
            {job.documents.length === 0 ? (
              <div className="px-4 py-5 text-center">
                <p className="text-xs text-[#94A3B8]">Auto-generated when job is verified</p>
              </div>
            ) : (
              <div className="p-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#F1F5F9]">
                      <th className="text-left text-[10px] font-semibold text-[#94A3B8] uppercase pb-2 pr-2">Document</th>
                      <th className="text-left text-[10px] font-semibold text-[#94A3B8] uppercase pb-2 pr-2">Type</th>
                      <th className="text-left text-[10px] font-semibold text-[#94A3B8] uppercase pb-2 pr-2">Status</th>
                      <th className="text-right text-[10px] font-semibold text-[#94A3B8] uppercase pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.documents.map(doc => {
                      const cfg = DOC_CONFIG[doc.type] ?? DOC_CONFIG.OTHER;
                      return (
                        <tr key={doc.id} className="border-b border-[#F1F5F9] last:border-0">
                          <td className="py-2 pr-2">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-6 h-6 rounded-[5px] flex items-center justify-center shrink-0 ${cfg.bg}`}>
                                <cfg.Icon className={`w-3 h-3 ${cfg.color}`} />
                              </div>
                              <span className="font-medium text-[#0F172A] truncate" style={{maxWidth: "60px"}}>
                                {doc.title ?? cfg.label}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 pr-2">
                            <span className="text-[10px] text-[#64748B] truncate block" style={{maxWidth: "50px"}}>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="py-2 pr-2">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              doc.sentAt ? "bg-[#F0FDF4] text-[#15803D]" : "bg-[#F1F5F9] text-[#64748B]"
                            }`}>
                              {doc.sentAt ? "Sent" : "Pending"}
                            </span>
                          </td>
                          <td className="py-2">
                            <div className="flex items-center gap-0.5 justify-end">
                              {doc.pdfUrl && (
                                <>
                                  <a href={doc.pdfUrl} target="_blank" rel="noopener noreferrer"
                                    className="p-1 rounded hover:bg-[#F1F5F9] text-[#94A3B8] hover:text-[#64748B] transition-colors" title="View">
                                    <Eye className="w-3 h-3" />
                                  </a>
                                  <a href={doc.pdfUrl} download
                                    className="p-1 rounded hover:bg-[#F1F5F9] text-[#94A3B8] hover:text-[#64748B] transition-colors" title="Download">
                                    <Download className="w-3 h-3" />
                                  </a>
                                </>
                              )}
                              <a href={`https://wa.me/${job.clientPhone.replace("+", "")}?text=${encodeURIComponent(`Hi ${job.clientName}, here is your ${cfg.label}.`)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="p-1 rounded hover:bg-[#F0FDF4] text-[#94A3B8] hover:text-[#16A34A] transition-colors" title="Send via WhatsApp">
                                <MessageCircle className="w-3 h-3" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <button className="mt-2 flex items-center gap-1.5 text-xs text-[#2563EB] font-medium hover:text-[#1D4ED8] transition-colors">
                  <Plus className="w-3 h-3" /> Generate Document
                </button>
              </div>
            )}
          </div>

          {/* Admin Actions */}
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
            <div className="px-4 py-3.5 border-b border-[#E2E8F0] flex items-center gap-2">
              <div className="w-7 h-7 rounded-[8px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-[#64748B]" />
              </div>
              <h3 className="text-sm font-semibold text-[#0F172A]">Admin Actions</h3>
            </div>
            <AdminQuickActions job={job} onTabChange={setActiveTab} />
          </div>

          {/* Job Notes */}
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
            <div className="px-4 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#0F172A]">
                Job Notes{noteCount > 0 ? ` (${noteCount})` : ""}
              </h3>
              <button onClick={() => setActiveTab("notes")}
                className="text-xs text-[#2563EB] font-medium hover:text-[#1D4ED8] transition-colors">
                Add Note
              </button>
            </div>
            <div className="p-4">
              {job.description ? (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                    A
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#334155] leading-relaxed">{job.description}</p>
                    <p className="text-[10px] text-[#94A3B8] mt-1.5">
                      Added by Admin · {job.scheduledDate ? formatDate(job.scheduledDate) : "—"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#94A3B8] text-center py-2">No notes yet</p>
              )}
              {job.postponeReason && (
                <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
                  <p className="text-[10px] font-semibold text-[#D97706] uppercase tracking-wide mb-1.5">
                    Postponement Reason
                  </p>
                  <p className="text-xs text-[#92400E] leading-relaxed">{job.postponeReason}</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Edit Job Modal */}
      {showEdit && <EditJobModal job={job} onClose={() => setShowEdit(false)} />}
    </div>
  );
}
