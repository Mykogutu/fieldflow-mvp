"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import {
  FileText, Download, Clipboard, ShieldCheck, Award,
  FileEdit, Package, Truck, CheckSquare, FileCheck,
  Send, CheckCircle2, MessageCircle, Mail, Check,
  Eye, MoreHorizontal,
} from "lucide-react";
import { markDocumentSent } from "@/app/actions/document-actions";
import { formatDate } from "@/lib/utils";

const DOC_CONFIG: Record<string, { label: string; Icon: React.ElementType; color: string; bg: string }> = {
  INVOICE:                     { label: "Invoice",                   Icon: FileText,    color: "text-blue-600",   bg: "bg-blue-50"   },
  JOB_CARD:                    { label: "Job Card",                  Icon: Clipboard,   color: "text-slate-600",  bg: "bg-slate-100" },
  WARRANTY_CERTIFICATE:        { label: "Warranty Certificate",      Icon: ShieldCheck, color: "text-green-600",  bg: "bg-green-50"  },
  INSTALLATION_REPORT:         { label: "Installation Report",       Icon: FileCheck,   color: "text-indigo-600", bg: "bg-indigo-50" },
  SERVICE_REPORT:              { label: "Service Report",            Icon: Award,       color: "text-purple-600", bg: "bg-purple-50" },
  FUEL_CALIBRATION_REPORT:     { label: "Fuel Calibration Report",   Icon: Package,     color: "text-amber-600",  bg: "bg-amber-50"  },
  DEVICE_REPLACEMENT_REPORT:   { label: "Device Replacement Report", Icon: Package,     color: "text-orange-600", bg: "bg-orange-50" },
  CLIENT_CONFIRMATION_RECEIPT: { label: "Client Confirmation",       Icon: CheckSquare, color: "text-green-600",  bg: "bg-green-50"  },
  DELIVERY_NOTE:               { label: "Delivery Note",             Icon: Truck,       color: "text-cyan-600",   bg: "bg-cyan-50"   },
  COMPLIANCE_CERTIFICATE:      { label: "Compliance Certificate",    Icon: FileEdit,    color: "text-teal-600",   bg: "bg-teal-50"   },
  OTHER:                       { label: "Document",                  Icon: FileText,    color: "text-slate-500",  bg: "bg-slate-100" },
};

const ALL_TYPES = Object.keys(DOC_CONFIG);

type Doc = {
  id: string; type: string; title: string | null;
  jobId: string | null; pdfUrl: string | null;
  sentAt: Date | null; sentVia: string | null; generatedAt: Date;
  clientName?: string | null; assetName?: string | null;
};

interface Props {
  docs: Doc[]; total: number;
  typeCounts: { type: string; _count: { _all: number } }[];
  typeFilter?: string;
}

// ── Mark Sent button ──────────────────────────────────────────────────────────
function MarkSentButton({ doc }: { doc: Doc }) {
  const [pending, startTransition] = useTransition();
  const [showMenu, setShowMenu] = useState(false);
  const [done, setDone] = useState(!!doc.sentAt);
  const [sentInfo, setSentInfo] = useState({ at: doc.sentAt, via: doc.sentVia });

  if (done && sentInfo.at) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#16A34A] bg-green-50 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" />
        {sentInfo.via ? sentInfo.via : "Sent"}
      </span>
    );
  }

  function handleMark(via: "WHATSAPP" | "EMAIL" | "MANUAL") {
    setShowMenu(false);
    startTransition(async () => {
      const res = await markDocumentSent(doc.id, via);
      if (res.ok) { setDone(true); setSentInfo({ at: new Date(), via }); }
    });
  }

  return (
    <div className="relative">
      <button onClick={() => setShowMenu(v => !v)} disabled={pending}
        className="inline-flex items-center gap-1 text-xs font-medium text-[#64748B] hover:text-[#2563EB] transition-colors disabled:opacity-50">
        <Send className="w-3 h-3" />
        {pending ? "Marking…" : "Mark Sent"}
      </button>
      {showMenu && (
        <div className="absolute right-0 top-6 z-20 bg-white border border-[#E2E8F0] rounded-[10px] shadow-card py-1 w-44">
          {[
            { via: "WHATSAPP" as const, icon: MessageCircle, label: "Via WhatsApp", color: "text-green-600" },
            { via: "EMAIL" as const,    icon: Mail,           label: "Via Email",    color: "text-blue-600" },
            { via: "MANUAL" as const,   icon: Check,          label: "Manual",       color: "text-[#64748B]" },
          ].map(({ via, icon: Icon, label, color }) => (
            <button key={via} onClick={() => handleMark(via)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#334155] hover:bg-[#F8FAFC] transition-colors">
              <Icon className={`w-3.5 h-3.5 ${color}`} /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DocumentsClient({ docs, total, typeCounts, typeFilter }: Props) {
  const countMap = Object.fromEntries(typeCounts.map(t => [t.type, t._count._all]));
  const sentCount = docs.filter(d => d.sentAt).length;
  const unsentCount = docs.filter(d => !d.sentAt).length;

  const activeTypes = ALL_TYPES.filter(t => countMap[t]);

  return (
    <div className="space-y-5">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="ff-page-title">Documents</h1>
        <p className="ff-page-desc">{total} documents generated · {unsentCount} not yet delivered</p>
      </div>

      {/* ── Summary metrics ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Docs", value: total.toString(), icon: FileText, color: "text-[#2563EB]", bg: "bg-blue-50" },
          { label: "Delivered", value: sentCount.toString(), icon: CheckCircle2, color: "text-[#16A34A]", bg: "bg-green-50" },
          { label: "Undelivered", value: unsentCount.toString(), icon: Send, color: unsentCount > 0 ? "text-[#D97706]" : "text-[#94A3B8]", bg: unsentCount > 0 ? "bg-amber-50" : "bg-[#F1F5F9]" },
          { label: "Types", value: activeTypes.length.toString(), icon: Package, color: "text-[#7C3AED]", bg: "bg-purple-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-[10px] ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-[#94A3B8] font-medium">{label}</p>
              <p className={`text-lg font-bold leading-tight ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab bar + table card ──────────────────────────────────────────── */}
      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
        {/* Tab bar */}
        <div className="border-b border-[#E2E8F0] px-4 overflow-x-auto scrollbar-none">
          <div className="flex gap-0 min-w-max">
            <Link href="/admin/documents"
              className={`ff-tab ${!typeFilter ? "ff-tab-active" : "ff-tab-inactive"}`}>
              All
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold
                ${!typeFilter ? "bg-[#2563EB]/15 text-[#2563EB]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                {total}
              </span>
            </Link>
            {activeTypes.map(t => (
              <Link key={t} href={`/admin/documents?type=${t}`}
                className={`ff-tab ${typeFilter === t ? "ff-tab-active" : "ff-tab-inactive"}`}>
                {DOC_CONFIG[t]?.label ?? t}
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold
                  ${typeFilter === t ? "bg-[#2563EB]/15 text-[#2563EB]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                  {countMap[t]}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Table */}
        {docs.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#94A3B8]" />
            </div>
            <p className="text-sm font-semibold text-[#475569]">No documents yet</p>
            <p className="text-xs text-[#94A3B8]">Documents are auto-generated when jobs are completed and verified</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title / Client</th>
                  <th>Job</th>
                  <th>Generated</th>
                  <th>Delivery</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map(doc => {
                  const cfg = DOC_CONFIG[doc.type] ?? DOC_CONFIG.OTHER;
                  return (
                    <tr key={doc.id}>
                      {/* Type */}
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 ${cfg.bg}`}>
                            <cfg.Icon className={`w-4 h-4 ${cfg.color}`} />
                          </div>
                          <span className="text-xs font-semibold text-[#334155] whitespace-nowrap">{cfg.label}</span>
                        </div>
                      </td>

                      {/* Title / client */}
                      <td>
                        <p className="text-sm font-medium text-[#0F172A] truncate max-w-[200px]">
                          {doc.title ?? cfg.label}
                        </p>
                        {doc.clientName && (
                          <p className="text-[11px] text-[#94A3B8] mt-0.5 truncate">{doc.clientName}</p>
                        )}
                        {doc.assetName && (
                          <p className="text-[11px] text-[#94A3B8] truncate">{doc.assetName}</p>
                        )}
                      </td>

                      {/* Job link */}
                      <td>
                        {doc.jobId ? (
                          <Link href={`/admin/jobs/${doc.jobId}`}
                            className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors">
                            View Job →
                          </Link>
                        ) : (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="text-[#64748B] whitespace-nowrap text-xs">
                        {formatDate(doc.generatedAt)}
                      </td>

                      {/* Delivery */}
                      <td><MarkSentButton doc={doc} /></td>

                      {/* Actions */}
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {doc.pdfUrl && (
                            <>
                              <a href={doc.pdfUrl} target="_blank" rel="noopener noreferrer"
                                className="p-1.5 rounded-[6px] border border-[#E2E8F0] text-[#64748B] hover:border-[#2563EB]/50 hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
                                title="View PDF">
                                <Eye className="w-3.5 h-3.5" />
                              </a>
                              <a href={doc.pdfUrl} download target="_blank" rel="noopener noreferrer"
                                className="p-1.5 rounded-[6px] border border-[#E2E8F0] text-[#64748B] hover:border-[#2563EB]/50 hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
                                title="Download PDF">
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
