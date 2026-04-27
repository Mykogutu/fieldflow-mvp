"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, MapPin, Phone, Package, Calendar, Shield,
  Wrench, FileText, StickyNote, Plus, Download,
  Clipboard, ShieldCheck, Award, Truck,
  CheckCircle2, Hash, Zap, Droplets, History,
} from "lucide-react";
import { formatKES, formatDate, statusLabel } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";

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

// ── Asset type icon ───────────────────────────────────────────────────────────
function assetMeta(type: string): { icon: React.ElementType; color: string; bg: string } {
  const t = type.toLowerCase();
  if (t.includes("tank"))    return { icon: Droplets, color: "text-blue-600",   bg: "bg-blue-50" };
  if (t.includes("vehicle")) return { icon: Truck,    color: "text-amber-600",  bg: "bg-amber-50" };
  if (t.includes("tracker") || t.includes("device") || t.includes("sensor"))
    return { icon: Zap, color: "text-purple-600", bg: "bg-purple-50" };
  if (t.includes("solar") || t.includes("inverter"))
    return { icon: Zap, color: "text-green-600",  bg: "bg-green-50" };
  return { icon: Package, color: "text-slate-600", bg: "bg-slate-100" };
}

function warrantyBadge(date: Date | null) {
  if (!date) return null;
  const days = Math.floor((new Date(date).getTime() - Date.now()) / 86400000);
  if (days < 0)  return { label: "Warranty Expired", color: "text-[#DC2626]", bg: "bg-red-50", border: "border-red-200" };
  if (days < 30) return { label: `Warranty: ${days}d left`, color: "text-[#D97706]", bg: "bg-amber-50", border: "border-amber-200" };
  return { label: "Under Warranty", color: "text-[#16A34A]", bg: "bg-green-50", border: "border-green-200" };
}

// ── Info row ──────────────────────────────────────────────────────────────────
function InfoRow({ label, value, icon: Icon, highlight }: {
  label: string; value: string; icon: React.ElementType; highlight?: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0]">
      <div className="w-8 h-8 rounded-[8px] bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-[#64748B]" />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide">{label}</p>
        <p className={`text-sm font-medium mt-0.5 ${highlight ?? "text-[#0F172A]"}`}>{value}</p>
      </div>
    </div>
  );
}

export default function AssetDetailClient({ asset }: { asset: AssetDetailData }) {
  const [tab, setTab] = useState<Tab>("overview");

  const meta          = assetMeta(asset.assetType);
  const completedJobs = asset.jobs.filter(j => j.status === "VERIFIED" || j.status === "CLOSED");
  const totalRevenue  = asset.jobs.reduce((s, j) => s + (j.invoice?.status === "PAID" ? j.invoice.amount : 0), 0);
  const warrant       = warrantyBadge(asset.warrantyExpiryDate);
  const warrantyActive = asset.warrantyExpiryDate && new Date(asset.warrantyExpiryDate) > new Date();

  const createJobUrl = `/admin/jobs?assetId=${asset.id}&clientName=${encodeURIComponent(asset.clientName)}&clientPhone=${encodeURIComponent(asset.clientPhone ?? "")}`;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview",  label: "Overview" },
    { id: "jobs",      label: "Jobs",      count: asset.jobs.length },
    { id: "documents", label: "Documents", count: asset.documents.length },
    { id: "notes",     label: "Notes" },
  ];

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
        <Link href="/admin/assets" className="hover:text-[#2563EB] flex items-center gap-1 font-medium transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Assets
        </Link>
        <span>/</span>
        <span className="text-[#64748B] font-medium truncate">{asset.name}</span>
      </div>

      {/* ── Header Card ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-5 sm:p-6">
        <div className="flex items-start gap-4 flex-wrap">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-[14px] flex items-center justify-center shrink-0 ${meta.bg}`}>
            <meta.icon className={`w-7 h-7 ${meta.color}`} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-[#0F172A]">{asset.name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-[6px] font-semibold ${meta.bg} ${meta.color}`}>
                {asset.assetType}
              </span>
              {warrant && (
                <span className={`text-xs px-2.5 py-1 rounded-[6px] font-semibold flex items-center gap-1 ${warrant.bg} ${warrant.color} border ${warrant.border}`}>
                  <Shield className="w-3 h-3" /> {warrant.label}
                </span>
              )}
            </div>
            <p className="text-sm text-[#64748B] font-medium">{asset.clientName}</p>
            <div className="flex flex-wrap gap-4 mt-1.5 text-xs text-[#94A3B8]">
              {asset.clientPhone && (
                <a href={`https://wa.me/${asset.clientPhone.replace("+", "")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-[#16A34A] transition-colors">
                  <Phone className="w-3.5 h-3.5" />{asset.clientPhone}
                </a>
              )}
              {asset.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />{asset.location}
                </span>
              )}
              {asset.zone && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />Zone: {asset.zone}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Link href={createJobUrl} className="ff-btn-primary inline-flex items-center gap-1.5 text-sm px-3.5 py-2">
              <Plus className="w-4 h-4" /> Create Job
            </Link>
            <Link href={`/admin/assets?edit=${asset.id}`}
              className="ff-btn-secondary inline-flex items-center gap-1.5 text-sm px-3.5 py-2">
              <Wrench className="w-4 h-4" /> Edit
            </Link>
          </div>
        </div>

        {/* ── 4 Stat Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-[#E2E8F0]">
          {[
            { label: "Total Jobs", value: asset.jobs.length.toString(), icon: Wrench, color: "text-[#2563EB]", bg: "bg-blue-50" },
            { label: "Completed", value: completedJobs.length.toString(), icon: CheckCircle2, color: "text-[#16A34A]", bg: "bg-green-50" },
            { label: "Revenue", value: formatKES(totalRevenue), icon: Package, color: "text-[#7C3AED]", bg: "bg-purple-50" },
            { label: "Last Service", value: asset.lastServiceDate ? formatDate(asset.lastServiceDate) : "—", icon: History, color: "text-[#0891B2]", bg: "bg-cyan-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="flex items-center gap-3 p-3 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className={`w-8 h-8 rounded-[8px] ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-[10px] text-[#94A3B8] font-medium">{label}</p>
                <p className={`text-sm font-bold leading-tight ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Card ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
        {/* Tab bar */}
        <div className="border-b border-[#E2E8F0] px-4 overflow-x-auto scrollbar-none">
          <div className="flex gap-0 min-w-max">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`ff-tab ${tab === t.id ? "ff-tab-active" : "ff-tab-inactive"}`}>
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold
                    ${tab === t.id ? "bg-[#2563EB]/15 text-[#2563EB]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Overview Tab ─────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="p-5">
            {[
              asset.serialNumber       && { label: "Serial Number",        value: asset.serialNumber,       icon: Hash },
              asset.registrationNumber && { label: "Registration No.",     value: asset.registrationNumber, icon: Hash },
              asset.identifier         && { label: "Identifier",           value: asset.identifier,         icon: Hash },
              asset.deviceNumber       && { label: "Device Number",        value: asset.deviceNumber,       icon: Zap },
              asset.simNumber          && { label: "SIM Number",           value: asset.simNumber,          icon: Phone },
              asset.zone               && { label: "Zone",                 value: asset.zone,               icon: MapPin },
              asset.installationDate   && { label: "Installation Date",    value: formatDate(asset.installationDate!), icon: Calendar },
              asset.warrantyExpiryDate && { label: "Warranty Expires",     value: formatDate(asset.warrantyExpiryDate!), icon: Shield,
                highlight: warrantyActive ? "text-[#16A34A]" : "text-[#DC2626]" },
              asset.lastServiceDate    && { label: "Last Service",         value: formatDate(asset.lastServiceDate!), icon: CheckCircle2 },
              asset.clientPhone        && { label: "Client Phone",         value: asset.clientPhone,        icon: Phone },
            ].filter(Boolean).length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
                  <Package className="w-5 h-5 text-[#94A3B8]" />
                </div>
                <p className="text-sm font-medium text-[#475569]">No additional details</p>
                <p className="text-xs text-[#94A3B8]">Edit the asset to add identifiers, dates and notes</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {asset.serialNumber && (
                  <InfoRow label="Serial Number" value={asset.serialNumber} icon={Hash} />
                )}
                {asset.registrationNumber && (
                  <InfoRow label="Registration No." value={asset.registrationNumber} icon={Hash} />
                )}
                {asset.identifier && (
                  <InfoRow label="Identifier" value={asset.identifier} icon={Hash} />
                )}
                {asset.deviceNumber && (
                  <InfoRow label="Device Number" value={asset.deviceNumber} icon={Zap} />
                )}
                {asset.simNumber && (
                  <InfoRow label="SIM Number" value={asset.simNumber} icon={Phone} />
                )}
                {asset.zone && (
                  <InfoRow label="Zone" value={asset.zone} icon={MapPin} />
                )}
                {asset.installationDate && (
                  <InfoRow label="Installation Date" value={formatDate(asset.installationDate)} icon={Calendar} />
                )}
                {asset.warrantyExpiryDate && (
                  <InfoRow label="Warranty Expires" value={formatDate(asset.warrantyExpiryDate)} icon={Shield}
                    highlight={warrantyActive ? "text-[#16A34A]" : "text-[#DC2626]"} />
                )}
                {asset.lastServiceDate && (
                  <InfoRow label="Last Service" value={formatDate(asset.lastServiceDate)} icon={CheckCircle2} />
                )}
                {asset.clientPhone && (
                  <InfoRow label="Client Phone" value={asset.clientPhone} icon={Phone} />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Jobs Tab ─────────────────────────────────────────────────────── */}
        {tab === "jobs" && (
          asset.jobs.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
                <Wrench className="w-5 h-5 text-[#94A3B8]" />
              </div>
              <p className="text-sm font-medium text-[#475569]">No jobs linked yet</p>
              <Link href={createJobUrl} className="ff-btn-primary text-xs px-3 py-2 inline-flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Create first job
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ff-table">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Date</th>
                    <th>Worker</th>
                    <th>Status</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {asset.jobs.map(j => (
                    <tr key={j.id}>
                      <td>
                        <Link href={`/admin/jobs/${j.id}`}
                          className="font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors">
                          {j.jobType}
                        </Link>
                        {j.description && (
                          <p className="text-[11px] text-[#94A3B8] mt-0.5 line-clamp-1">{j.description}</p>
                        )}
                      </td>
                      <td className="text-[#64748B] whitespace-nowrap">
                        {formatDate(j.scheduledDate ?? j.createdAt)}
                      </td>
                      <td className="text-[#64748B]">
                        {j.workers.map(w => w.name).join(", ") || "—"}
                      </td>
                      <td><StatusBadge status={j.status} size="xs" /></td>
                      <td className="text-right font-semibold text-[#0F172A]">
                        {j.invoice ? formatKES(j.invoice.amount) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── Documents Tab ────────────────────────────────────────────────── */}
        {tab === "documents" && (
          asset.documents.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#94A3B8]" />
              </div>
              <p className="text-sm font-medium text-[#475569]">No documents yet</p>
              <p className="text-xs text-[#94A3B8]">Documents are generated when jobs are completed</p>
            </div>
          ) : (
            <div className="p-5 space-y-2">
              {asset.documents.map(doc => {
                const cfg = DOC_CONFIG[doc.type] ?? DOC_CONFIG.OTHER;
                return (
                  <div key={doc.id}
                    className="flex items-center gap-3 p-3.5 rounded-[12px] border border-[#E2E8F0] hover:border-[#2563EB]/30 hover:bg-blue-50/20 transition-colors group">
                    <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${cfg.bg}`}>
                      <cfg.Icon className={`w-4.5 h-4.5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A] truncate">{doc.title ?? cfg.label}</p>
                      <p className="text-[10px] text-[#94A3B8] mt-0.5">
                        {formatDate(doc.generatedAt)}{doc.sentAt ? ` · Sent via ${doc.sentVia ?? "WhatsApp"}` : ""}
                      </p>
                    </div>
                    {doc.pdfUrl && (
                      <a href={doc.pdfUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#2563EB] font-semibold hover:text-[#1D4ED8] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── Notes Tab ────────────────────────────────────────────────────── */}
        {tab === "notes" && (
          <div className="p-5">
            {asset.notes ? (
              <div className="p-4 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0]">
                <p className="text-sm text-[#334155] whitespace-pre-wrap leading-relaxed">{asset.notes}</p>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
                  <StickyNote className="w-5 h-5 text-[#94A3B8]" />
                </div>
                <p className="text-sm font-medium text-[#475569]">No notes recorded</p>
                <Link href={`/admin/assets?edit=${asset.id}`}
                  className="text-xs text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors">
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
