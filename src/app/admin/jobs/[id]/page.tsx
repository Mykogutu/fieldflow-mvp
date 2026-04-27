import { prisma } from "@/lib/prisma";
import { currentWorkspaceId } from "@/lib/workspace";
import { formatKES, formatDate, statusLabel, statusColor } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Phone, MapPin, Package, User, Clock, CheckCircle,
  AlertTriangle, FileText, ExternalLink, Calendar, Banknote,
} from "lucide-react";

// ── Timeline event config ─────────────────────────────────────────────────────
const EVENT_CONFIG: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  CREATED:             { label: "Job created",               color: "bg-blue-100 text-blue-600",   Icon: FileText       },
  ASSIGNED:            { label: "Worker assigned",           color: "bg-blue-100 text-blue-600",   Icon: User           },
  WHATSAPP_SENT:       { label: "Assignment sent via WhatsApp", color: "bg-green-100 text-green-600", Icon: ExternalLink },
  ACCEPTED:            { label: "Worker accepted",           color: "bg-green-100 text-green-600", Icon: CheckCircle    },
  DECLINED:            { label: "Worker declined",           color: "bg-red-100 text-red-600",     Icon: AlertTriangle  },
  CHECKED_IN:          { label: "Worker arrived on-site",    color: "bg-indigo-100 text-indigo-600", Icon: MapPin       },
  COMPLETED:           { label: "Worker marked job done",    color: "bg-purple-100 text-purple-600", Icon: CheckCircle  },
  OTP_SENT:            { label: "OTP sent to client",        color: "bg-amber-100 text-amber-600", Icon: Phone         },
  OTP_VERIFIED:        { label: "Client verified OTP",       color: "bg-green-100 text-green-600", Icon: CheckCircle   },
  VERIFIED:            { label: "Job verified",              color: "bg-green-100 text-green-600", Icon: CheckCircle   },
  INVOICE_GENERATED:   { label: "Invoice generated",         color: "bg-slate-100 text-slate-600", Icon: FileText      },
  JOB_CARD_GENERATED:  { label: "Job card generated",        color: "bg-slate-100 text-slate-600", Icon: FileText      },
  WARRANTY_GENERATED:  { label: "Warranty generated",        color: "bg-slate-100 text-slate-600", Icon: FileText      },
  POSTPONED:           { label: "Job postponed",             color: "bg-amber-100 text-amber-600", Icon: Clock         },
  RESCHEDULED:         { label: "Job rescheduled",           color: "bg-blue-100 text-blue-600",   Icon: Calendar      },
  REASSIGNED:          { label: "Reassigned to new worker",  color: "bg-blue-100 text-blue-600",   Icon: User          },
  CLOSED:              { label: "Job closed",                color: "bg-slate-100 text-slate-500", Icon: CheckCircle   },
  CANCELLED:           { label: "Job cancelled",             color: "bg-red-100 text-red-500",     Icon: AlertTriangle },
  ISSUE_REPORTED:      { label: "Issue reported",            color: "bg-red-100 text-red-600",     Icon: AlertTriangle },
  PAYMENT_RECORDED:    { label: "Payment recorded",          color: "bg-green-100 text-green-600", Icon: Banknote      },
};

async function getJob(id: string) {
  const workspaceId = await currentWorkspaceId();
  return prisma.job.findFirst({
    where: { id, workspaceId },
    include: {
      workers: { select: { id: true, name: true, phone: true } },
      invoice: true,
      events: { orderBy: { createdAt: "asc" } },
      asset: true,
    },
  });
}

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const job = await getJob(params.id);
  if (!job) notFound();

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
                  "bg-slate-100 text-slate-500"
                }`}>{job.priority}</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{job.jobType}</h1>
            {job.scheduledDate && (
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                <Calendar className="w-3.5 h-3.5" />
                Scheduled: {formatDate(job.scheduledDate)}
              </p>
            )}
          </div>
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {inv && !isPaid && (
              <form action={`/api/invoices/${inv.id}/mark-paid`} method="POST">
                <button className="inline-flex items-center gap-1.5 bg-green-600 text-white px-3.5 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
                  <Banknote className="w-4 h-4" /> Mark Paid
                </button>
              </form>
            )}
            <a
              href={`https://wa.me/${job.clientPhone.replace("+", "")}?text=${encodeURIComponent(`Hi ${job.clientName}, following up on your ${job.jobType} job scheduled ${job.scheduledDate ? formatDate(job.scheduledDate) : "soon"}.`)}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-slate-700 px-3.5 py-2 rounded-xl text-sm font-medium hover:border-green-400 hover:text-green-700 transition-colors"
            >
              <Phone className="w-4 h-4" /> Message Client
            </a>
            {worker && (
              <a
                href={`https://wa.me/${worker.phone.replace("+", "")}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-slate-700 px-3.5 py-2 rounded-xl text-sm font-medium hover:border-blue-400 hover:text-blue-700 transition-colors"
              >
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
            value={inv?.status ?? "—"}
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
        {/* Left: cards */}
        <div className="space-y-4">
          {/* Client card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Client</h3>
            <p className="font-semibold text-slate-900">{job.clientName}</p>
            <div className="space-y-1.5 mt-2 text-sm text-slate-500">
              <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" />{job.clientPhone}</p>
              {job.location && <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" />{job.location}</p>}
            </div>
            <div className="flex gap-2 mt-4">
              <a
                href={`https://wa.me/${job.clientPhone.replace("+", "")}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 text-center text-xs bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg py-1.5 font-medium transition-colors"
              >
                WhatsApp
              </a>
              <Link
                href={`/admin/clients?search=${encodeURIComponent(job.clientPhone)}`}
                className="flex-1 text-center text-xs bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg py-1.5 font-medium transition-colors"
              >
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
                <a
                  href={`https://wa.me/${worker.phone.replace("+", "")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="mt-4 block text-center text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg py-1.5 font-medium transition-colors"
                >
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
              <Link
                href={`/admin/assets/${job.asset.id}`}
                className="mt-4 block text-center text-xs bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg py-1.5 font-medium transition-colors"
              >
                View Asset
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
              {inv.pdfUrl && (
                <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer"
                  className="mt-3 block text-center text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg py-1.5 font-medium transition-colors">
                  Download PDF
                </a>
              )}
            </div>
          )}

          {/* Notes */}
          {job.description && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Job Notes</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{job.description}</p>
            </div>
          )}
        </div>

        {/* Right: Timeline + Documents */}
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
                  {/* Vertical line */}
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
