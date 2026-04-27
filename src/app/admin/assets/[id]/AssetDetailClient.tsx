"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, MapPin, Phone, Package, Calendar, Shield,
  Wrench, FileText, StickyNote, Plus, Edit2, Archive,
  CheckCircle2, Clock, ExternalLink, Download,
  Clipboard, ShieldCheck, Award, Truck,
} from "lucide-react";
import { formatKES, formatDate, statusLabel, statusColor } from "@/lib/utils";

const DOC_CONFIG: Record<string, { label: string; Icon: React.ElementType; color: string; bg: string }> = {
  INVOICE:               { label: "Invoice",              Icon: FileText,    color: "text-blue-600",   bg: "bg-blue-50"   },
  JOB_CARD:              { label: "Job Card",             Icon: Clipboard,   color: "text-slate-600",  bg: "bg-slate-100" },
  WARRANTY_CERTIFICATE:  { label: "Warranty Certificate", Icon: ShieldCheck, color: "text-green-600",  bg: "bg-green-50"  },
  INSTALLATION_REPORT:   { label: "Installation Report",  Icon: FileText,    color: "text-indigo-600", bg: "bg-indigo-50" },
  SERVICE_REPORT:        { label: "Service Report",       Icon: Award,       color: "text-purple-600", bg: "bg-purple-50" },
  FUEL_CALIBRATION_REPORT: { label: "Fuel Calibration",  Icon: Package,     color: "text-amber-600",  bg: "bg-amber-50"  },
  DELIVERY_NOTE:         { label: "Delivery Note",        Icon: Truck,       color: "text-cyan-600",   bg: "bg-cyan-50"   },
  OTHER:                 { label: "Document",             Icon: FileText,    color: "text-slate-500",  bg: "bg-slate-100" },
};

type Job = {
  id: string; jobType: string; status: string; description: string | null;
  scheduledDate: Date | null; createdAt: Date;
  workers: { id: string; name: string }[];
  invoice: { invoiceNumber: string; amount: number; status: string } | null;
};

type Document = {
  id: string; type: string; title: string | null; pdfUrl: string | null;
  sentAt: Date | null; sentVia: string | null; generatedAt: Date;
};

export type AssetDetailData = {
  id: string; name: string; assetType: string;
  clientName: string; clientPhone: string | null;
  location: string | null; zone: string | null;
  identifier: string | null; serialNumber: string | null;
  registrationNumber: string | null; deviceNumber: string | null;
  simNumber: string | null; installationDate: Date | null;
  warrantyExpiryDate: Date | null; lastServiceDate: Date | null;
  notes: string | null;
  jobs: Job[];
  documents: Document[];
};

type Tab = "overview" | "jobs" | "documents" | "notes";

export default function AssetDetailClient({ asset }: { asset: AssetDetailData }) {
  const [tab, setTab] = useState<Tab>("overview");

  const completedJobs = asset.jobs.filter(j => j.status === "VERIFIED" || j.status === "CLOSED");
  const totalRevenue = asset.jobs.reduce((s, j) => s + (j.invoice?.status === "PAID" ? j.invoice.amount : 0), 0);
  const warrantyActive = asset.warrantyExpiryDate && new Date(asset.warrantyExpiryDate) > new Date();

  const TABS: { id: Tab; label: string; Icon: React.ElementType; count?: number }[] = [
    { id: "overview",   label: "Overview",   Icon: Package },
    { id: "jobs",       label: "Jobs",       Icon: Wrench,   count: asset.jobs.length },
    { id: "documents",  label: "Documents",  Icon: FileText, count: asset.documents.length },
    { id: "notes",      label: "Notes",      Icon: StickyNote },
  ];

  // Build create-job URL pre-filled with asset info
  const createJobUrl = `/admin/jobs?assetId=${asset.id}&clientName=${encodeURIComponent(asset.clientName)}&clientPhone=${encodeURIComponent(asset.clientPhone ?? "")}`;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/admin/assets" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Assets
        </Link>
        <span>/</span>
        <span className="text-slate-700 font-medium truncate">{asset.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{asset.name}</h1>
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">{asset.assetType}</span>
              {warrantyActive && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-medium flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Under Warranty
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {asset.clientName}
              {asset.clientPhone && <> · <a href={`https://wa.me/${asset.clientPhone.replace("+","")}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-600">{asset.clientPhone}</a></>}
            </p>
            {asset.location && (
              <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" />{asset.location}
              </p>
            )}
          </div>
          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link href={createJobUrl}
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3.5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" /> Create Job
            </Link>
            <Link href={`/admin/assets?edit=${asset.id}`}
              className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-slate-700 px-3.5 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
              <Edit2 className="w-4 h-4" /> Edit
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <Stat label="Total Jobs" value={asset.jobs.length.toString()} />
          <Stat label="Completed" value={completedJobs.length.toString()} />
          <Stat label="Lifetime Revenue" value={formatKES(totalRevenue)} />
          <Stat label="Last Service" value={asset.lastServiceDate ? formatDate(asset.lastServiceDate) : "—"} />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              <t.Icon className="w-4 h-4" />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {tab === "overview" && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {asset.identifier && <Info label="Identifier" value={asset.identifier} Icon={Package} />}
              {asset.serialNumber && <Info label="Serial Number" value={asset.serialNumber} Icon={Package} />}
              {asset.registrationNumber && <Info label="Registration" value={asset.registrationNumber} Icon={Package} />}
              {asset.deviceNumber && <Info label="Device Number" value={asset.deviceNumber} Icon={Package} />}
              {asset.simNumber && <Info label="SIM Number" value={asset.simNumber} Icon={Phone} />}
              {asset.zone && <Info label="Zone" value={asset.zone} Icon={MapPin} />}
              {asset.installationDate && <Info label="Installed" value={formatDate(asset.installationDate)} Icon={Calendar} />}
              {asset.warrantyExpiryDate && (
                <Info
                  label="Warranty Expires"
                  value={formatDate(asset.warrantyExpiryDate)}
                  Icon={Shield}
                  highlight={warrantyActive ? "text-green-600" : "text-red-500"}
                />
              )}
              {asset.lastServiceDate && <Info label="Last Service" value={formatDate(asset.lastServiceDate)} Icon={CheckCircle2} />}
              {asset.clientPhone && (
                <Info label="Client Phone" value={asset.clientPhone} Icon={Phone} />
              )}
            </div>
            {(!asset.identifier && !asset.serialNumber && !asset.registrationNumber && !asset.deviceNumber && !asset.simNumber && !asset.installationDate) && (
              <p className="text-sm text-slate-400 text-center py-6">No additional details recorded for this asset.</p>
            )}
          </div>
        )}

        {/* Jobs tab */}
        {tab === "jobs" && (
          <div>
            {asset.jobs.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <Wrench className="w-10 h-10 text-slate-200" />
                <p className="text-sm text-slate-400">No jobs linked to this asset yet.</p>
                <Link href={createJobUrl} className="text-xs text-blue-600 hover:underline font-medium">Create first job →</Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Job</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Worker</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {asset.jobs.map(j => (
                      <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <Link href={`/admin/jobs/${j.id}`} className="font-medium text-blue-600 hover:underline">{j.jobType}</Link>
                          {j.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{j.description}</p>}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(j.scheduledDate ?? j.createdAt)}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {j.workers.map(w => w.name).join(", ") || "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(j.status)}`}>
                            {statusLabel(j.status)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm font-medium text-slate-700">
                          {j.invoice ? formatKES(j.invoice.amount) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Documents tab */}
        {tab === "documents" && (
          <div>
            {asset.documents.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <FileText className="w-10 h-10 text-slate-200" />
                <p className="text-sm text-slate-400">No documents generated for this asset yet.</p>
                <p className="text-xs text-slate-400">Documents appear here after jobs are completed.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {asset.documents.map(doc => {
                  const cfg = DOC_CONFIG[doc.type] ?? DOC_CONFIG.OTHER;
                  return (
                    <div key={doc.id} className="px-5 py-4 flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                        <cfg.Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{doc.title ?? cfg.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(doc.generatedAt)}{doc.sentAt ? ` · Sent ${doc.sentVia ?? ""}` : ""}</p>
                      </div>
                      {doc.pdfUrl && (
                        <a href={doc.pdfUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium shrink-0">
                          <Download className="w-3.5 h-3.5" /> PDF
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Notes tab */}
        {tab === "notes" && (
          <div className="p-6">
            {asset.notes ? (
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{asset.notes}</p>
            ) : (
              <div className="py-12 flex flex-col items-center gap-3">
                <StickyNote className="w-10 h-10 text-slate-200" />
                <p className="text-sm text-slate-400">No notes recorded for this asset.</p>
                <Link href={`/admin/assets?edit=${asset.id}`} className="text-xs text-blue-600 hover:underline font-medium">
                  Edit asset to add notes →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900 mt-0.5">{value}</p>
    </div>
  );
}

function Info({ label, value, Icon, highlight }: { label: string; value: string; Icon: React.ElementType; highlight?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
      </div>
      <div>
        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">{label}</p>
        <p className={`text-sm font-medium mt-0.5 ${highlight ?? "text-slate-800"}`}>{value}</p>
      </div>
    </div>
  );
}
