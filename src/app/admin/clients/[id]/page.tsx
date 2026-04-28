import { getClientWithDetails } from "@/app/actions/client-actions";
import { formatKES, formatDate, statusLabel } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Phone, MapPin, Mail, Building2, Briefcase, FileText,
  Package, ArrowLeft, ExternalLink, MessageCircle,
  User, Calendar, TrendingUp, AlertCircle, Plus,
} from "lucide-react";

// ── Avatar ────────────────────────────────────────────────────────────────────
function ClientAvatar({ name, size = "lg" }: { name: string; size?: "lg" | "md" }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = [
    "bg-blue-100 text-[#1D4ED8]", "bg-purple-100 text-[#7C3AED]",
    "bg-green-100 text-[#15803D]", "bg-amber-100 text-[#B45309]",
    "bg-indigo-100 text-[#4338CA]", "bg-pink-100 text-pink-700",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sz = size === "lg" ? "w-16 h-16 text-xl" : "w-10 h-10 text-sm";
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-bold shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await getClientWithDetails(params.id);
  if (!client) notFound();

  const totalInvoiced = client.invoices.reduce((s: number, inv: { amount: number }) => s + inv.amount, 0);
  const totalPaid     = client.invoices.filter((inv: { status: string }) => inv.status === "PAID")
    .reduce((s: number, inv: { amount: number }) => s + inv.amount, 0);
  const outstanding   = totalInvoiced - totalPaid;

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
        <Link href="/admin/clients" className="hover:text-[#2563EB] flex items-center gap-1 font-medium transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Clients
        </Link>
        <span>/</span>
        <span className="text-[#64748B] font-medium truncate">{client.name}</span>
      </div>

      {/* ── Profile Header ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-5 sm:p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <ClientAvatar name={client.name} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-[#0F172A]">{client.name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-[6px] font-semibold
                ${client.type === "COMPANY"
                  ? "bg-[#EFF6FF] text-[#1D4ED8] border border-blue-100"
                  : "bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]"}`}>
                {client.type === "COMPANY" ? "Company" : "Individual"}
              </span>
              {!client.isActive && (
                <span className="text-xs px-2.5 py-1 rounded-[6px] bg-[#F1F5F9] text-[#94A3B8] border border-[#E2E8F0]">
                  Inactive
                </span>
              )}
            </div>
            {client.company && (
              <p className="text-sm text-[#64748B] flex items-center gap-1.5 mb-2">
                <Building2 className="w-3.5 h-3.5" />{client.company}
              </p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-[#64748B]">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#94A3B8]" />{client.phone}
              </span>
              {client.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#94A3B8]" />{client.email}
                </span>
              )}
              {client.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" />{client.location}
                </span>
              )}
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Link href={`/admin/jobs?client=${encodeURIComponent(client.phone)}`}
              className="ff-btn-secondary inline-flex items-center gap-1.5 text-sm px-3 py-2">
              <Plus className="w-4 h-4" /> New Job
            </Link>
            <a href={`https://wa.me/${client.phone.replace("+", "")}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-[#16A34A] hover:bg-green-700 text-white px-3 py-2 rounded-[10px] text-sm font-semibold transition-colors">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          </div>
        </div>

        {/* ── 4 Stat Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-[#E2E8F0]">
          {[
            { label: "Total Jobs", value: client.jobs.length.toString(), icon: Briefcase, color: "text-[#2563EB]", bg: "bg-[#EFF6FF]" },
            { label: "Assets", value: client.assets.length.toString(), icon: Package, color: "text-[#7C3AED]", bg: "bg-[#F5F3FF]" },
            { label: "Total Invoiced", value: formatKES(totalInvoiced), icon: TrendingUp, color: "text-[#0891B2]", bg: "bg-[#ECFEFF]" },
            {
              label: "Outstanding",
              value: outstanding > 0 ? formatKES(outstanding) : "Clear",
              icon: AlertCircle,
              color: outstanding > 0 ? "text-[#DC2626]" : "text-[#16A34A]",
              bg: outstanding > 0 ? "bg-[#FFF1F2]" : "bg-[#F0FDF4]",
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="flex items-center gap-3 p-3.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className={`w-9 h-9 rounded-[8px] ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-[10px] text-[#94A3B8] font-medium">{label}</p>
                <p className={`text-base font-bold leading-tight ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Jobs list */}
        <div className="lg:col-span-2 bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[8px] bg-[#EFF6FF] flex items-center justify-center">
                <Briefcase className="w-3.5 h-3.5 text-[#2563EB]" />
              </div>
              <h2 className="font-semibold text-[#0F172A] text-sm">Jobs</h2>
              <span className="text-[10px] bg-[#F1F5F9] text-[#64748B] px-1.5 py-0.5 rounded-full font-semibold">
                {client.jobs.length}
              </span>
            </div>
            <Link href={`/admin/jobs?client=${encodeURIComponent(client.phone)}`}
              className="text-xs text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors">
              View all →
            </Link>
          </div>

          {client.jobs.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-[#94A3B8]" />
              </div>
              <p className="text-sm font-medium text-[#475569]">No jobs yet</p>
              <p className="text-xs text-[#94A3B8]">Jobs for this client will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F8FAFC]">
              {client.jobs.slice(0, 10).map((job: {
                id: string; jobType: string; status: string; createdAt: Date | string;
                workers: { name: string }[];
                invoice: { amount: number } | null;
              }) => (
                <Link key={job.id} href={`/admin/jobs/${job.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center shrink-0">
                    <Briefcase className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#0F172A] truncate group-hover:text-[#2563EB] transition-colors">
                      {job.jobType}
                    </p>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      {job.workers.map((w: { name: string }) => w.name).join(", ") || "Unassigned"} · {formatDate(job.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {job.invoice && (
                      <span className="text-sm font-bold text-[#0F172A]">{formatKES(job.invoice.amount)}</span>
                    )}
                    <StatusBadge status={job.status} size="xs" />
                  </div>
                </Link>
              ))}
              {client.jobs.length > 10 && (
                <div className="px-5 py-3 text-center">
                  <Link href={`/admin/jobs?client=${encodeURIComponent(client.phone)}`}
                    className="text-xs text-[#2563EB] font-semibold hover:text-[#1D4ED8]">
                    + {client.jobs.length - 10} more jobs
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* Assets */}
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center gap-2">
              <div className="w-7 h-7 rounded-[8px] bg-[#F5F3FF] flex items-center justify-center">
                <Package className="w-3.5 h-3.5 text-[#7C3AED]" />
              </div>
              <h2 className="font-semibold text-[#0F172A] text-sm">Assets</h2>
              <span className="text-[10px] bg-[#F1F5F9] text-[#64748B] px-1.5 py-0.5 rounded-full font-semibold ml-auto">
                {client.assets.length}
              </span>
            </div>
            {client.assets.length === 0 ? (
              <p className="px-5 py-10 text-center text-xs text-[#94A3B8]">No assets linked.</p>
            ) : (
              <div className="divide-y divide-[#F8FAFC]">
                {client.assets.map((a: { id: string; name: string; assetType: string }) => (
                  <Link key={a.id} href={`/admin/assets/${a.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-[#F8FAFC] transition-colors group">
                    <div className="w-7 h-7 rounded-[8px] bg-[#F5F3FF] flex items-center justify-center shrink-0">
                      <Package className="w-3.5 h-3.5 text-[#7C3AED]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0F172A] truncate group-hover:text-[#2563EB] transition-colors">{a.name}</p>
                      <p className="text-[10px] text-[#94A3B8]">{a.assetType}</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[#94A3B8] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Invoices */}
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center gap-2">
              <div className="w-7 h-7 rounded-[8px] bg-[#EFF6FF] flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
              </div>
              <h2 className="font-semibold text-[#0F172A] text-sm">Invoices</h2>
              <span className="text-[10px] bg-[#F1F5F9] text-[#64748B] px-1.5 py-0.5 rounded-full font-semibold ml-auto">
                {client.invoices.length}
              </span>
            </div>
            {client.invoices.length === 0 ? (
              <p className="px-5 py-10 text-center text-xs text-[#94A3B8]">No invoices yet.</p>
            ) : (
              <div className="divide-y divide-[#F8FAFC]">
                {client.invoices.slice(0, 7).map((inv: {
                  id: string; invoiceNumber: string; amount: number; status: string; createdAt: Date | string;
                }) => (
                  <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold font-mono text-[#0F172A]">{inv.invoiceNumber}</p>
                      <p className="text-[10px] text-[#94A3B8] mt-0.5">{formatDate(inv.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-[#0F172A]">{formatKES(inv.amount)}</span>
                      <StatusBadge status={inv.status} size="xs" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          {client.notes && (
            <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-5">
              <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-2">Notes</p>
              <p className="text-sm text-[#334155] whitespace-pre-wrap leading-relaxed">{client.notes}</p>
            </div>
          )}

          {/* Quick actions */}
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-4">
            <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">Quick Actions</p>
            <div className="space-y-2">
              <a href={`https://wa.me/${client.phone.replace("+", "")}`}
                target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] border border-[#E2E8F0] hover:border-[#86EFAC] hover:bg-[#F0FDF4] transition-colors text-xs font-medium text-[#334155]">
                <MessageCircle className="w-4 h-4 text-[#16A34A]" /> Message on WhatsApp
              </a>
              <Link href={`/admin/jobs?client=${encodeURIComponent(client.phone)}`}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] border border-[#E2E8F0] hover:border-[#2563EB]/30 hover:bg-[#EFF6FF]/30 transition-colors text-xs font-medium text-[#334155]">
                <Briefcase className="w-4 h-4 text-[#2563EB]" /> View All Jobs
              </Link>
              <Link href={`/admin/invoices?client=${encodeURIComponent(client.phone)}`}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] border border-[#E2E8F0] hover:border-[#2563EB]/30 hover:bg-[#EFF6FF]/30 transition-colors text-xs font-medium text-[#334155]">
                <FileText className="w-4 h-4 text-[#2563EB]" /> View Invoices
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
