"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  FileText, Download, DollarSign, Clock, CheckCircle2,
  XCircle, TrendingUp, Send, Phone, ExternalLink,
  Eye,
} from "lucide-react";
import { updateInvoiceStatus } from "@/app/actions/invoice-actions";
import { formatDate, formatKES } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";

interface Invoice {
  id: string; invoiceNumber: string; clientName: string; clientPhone: string;
  amount: number; status: string; pdfUrl: string | null;
  paidAt: Date | string | null; createdAt: Date | string;
  workerName: string | null;
  job: { id?: string; jobNumber?: string; jobType: string; location: string | null; workers: { name: string }[] };
}

export default function InvoicesClient({
  invoices, total, currentStatus,
}: {
  invoices: Invoice[]; total: number; pages: number; currentStatus?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(status: string) {
    const sp = new URLSearchParams();
    if (status && status !== "ALL") sp.set("status", status);
    router.push(`/admin/invoices?${sp.toString()}`);
  }

  async function markPaid(id: string) {
    startTransition(async () => {
      await updateInvoiceStatus(id, "PAID");
      router.refresh();
    });
  }

  // Compute summary stats
  const pendingInvoices  = invoices.filter(i => i.status === "PENDING");
  const paidInvoices     = invoices.filter(i => i.status === "PAID");
  const totalRevenue     = paidInvoices.reduce((s, i) => s + i.amount, 0);
  const totalOutstanding = pendingInvoices.reduce((s, i) => s + i.amount, 0);

  const tabs = [
    { key: "ALL",       label: "All",       count: total },
    { key: "PENDING",   label: "Pending",   count: pendingInvoices.length },
    { key: "PAID",      label: "Paid",      count: paidInvoices.length },
    { key: "CANCELLED", label: "Cancelled", count: invoices.filter(i => i.status === "CANCELLED").length },
  ];

  return (
    <div className="space-y-5">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="ff-page-title">Invoices</h1>
        <p className="ff-page-desc">{total} total · {pendingInvoices.length} awaiting payment</p>
      </div>

      {/* ── Summary metrics ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Invoices", value: total.toString(), icon: FileText, color: "text-[#2563EB]", bg: "bg-[#EFF6FF]" },
          { label: "Pending", value: pendingInvoices.length.toString(), icon: Clock, color: pendingInvoices.length > 0 ? "text-[#D97706]" : "text-[#94A3B8]", bg: pendingInvoices.length > 0 ? "bg-[#FFFBEB]" : "bg-[#F1F5F9]" },
          { label: "Total Paid", value: formatKES(totalRevenue), icon: TrendingUp, color: "text-[#16A34A]", bg: "bg-[#F0FDF4]" },
          { label: "Outstanding", value: totalOutstanding > 0 ? formatKES(totalOutstanding) : "Clear", icon: DollarSign, color: totalOutstanding > 0 ? "text-[#DC2626]" : "text-[#16A34A]", bg: totalOutstanding > 0 ? "bg-[#FFF1F2]" : "bg-[#F0FDF4]" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-3.5 sm:p-4 flex items-center gap-2.5 sm:gap-3">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-[#94A3B8] font-medium leading-tight">{label}</p>
              <p className={`text-base sm:text-lg font-bold leading-tight truncate ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab bar + table card ──────────────────────────────────────────── */}
      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
        {/* Tab bar */}
        <div className="border-b border-[#E2E8F0] px-4 py-3 overflow-x-auto scrollbar-none">
          <div className="flex gap-2 min-w-max">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => navigate(tab.key)}
                className={`ff-tab min-h-9 px-4 py-2 ${(currentStatus ?? "ALL") === tab.key ? "ff-tab-active" : "ff-tab-inactive"}`}>
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold
                    ${(currentStatus ?? "ALL") === tab.key ? "bg-[#2563EB]/15 text-[#2563EB]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {invoices.length === 0 && (
          <div className="py-20 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#94A3B8]" />
            </div>
            <p className="text-sm font-semibold text-[#475569]">No invoices found</p>
            <p className="text-xs text-[#94A3B8]">Invoices are auto-generated when workers report job completion</p>
          </div>
        )}

        {invoices.length > 0 && (
          <>
            {/* ── Mobile card list (sm:hidden) ─────────────────────────── */}
            <div className="sm:hidden divide-y divide-[#F1F5F9]">
              {invoices.map(inv => (
                <div key={inv.id} onClick={() => router.push(`/admin/invoices/${inv.id}`)}
                  className="block cursor-pointer px-4 py-3.5 hover:bg-[#F8FAFC] transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-[10px] bg-[#EFF6FF] flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-[#2563EB]" />
                      </div>
                      <div>
                        <p className="font-mono text-xs font-bold text-[#0F172A]">{inv.invoiceNumber}</p>
                        <p className="text-[11px] text-[#94A3B8]">{formatDate(inv.createdAt)}</p>
                      </div>
                    </div>
                    <StatusBadge status={inv.status} size="xs" />
                  </div>
                  <p className="text-sm font-semibold text-[#0F172A] truncate">{inv.clientName}</p>
                  <p className="text-xs text-[#64748B] truncate">
                    {inv.job.jobType}
                    {(inv.workerName ?? inv.job.workers[0]?.name) ? ` · ${inv.workerName ?? inv.job.workers[0]?.name}` : ""}
                  </p>
                  <div className="flex items-center justify-between mt-2.5">
                    <div>
                      <p className="text-base font-bold text-[#0F172A]">{formatKES(inv.amount)}</p>
                      {inv.paidAt && <p className="text-[11px] text-[#16A34A]">Paid {formatDate(inv.paidAt)}</p>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {inv.status === "PENDING" && (
                        <button onClick={(e) => { e.stopPropagation(); markPaid(inv.id); }} disabled={isPending}
                          className="text-[11px] font-semibold text-[#16A34A] border border-[#86EFAC] hover:bg-[#F0FDF4] px-2.5 py-1.5 rounded-[8px] transition-colors disabled:opacity-50">
                          Mark Paid
                        </button>
                      )}
                      <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-[8px] border border-[#E2E8F0] text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors" title="Download">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <a href={`https://wa.me/${inv.clientPhone.replace("+", "")}?text=${encodeURIComponent(
                        `Hi ${inv.clientName}, your invoice ${inv.invoiceNumber} for ${formatKES(inv.amount)} is ready.`)}`}
                        target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-[8px] border border-[#E2E8F0] text-[#64748B] hover:text-[#16A34A] hover:bg-[#F0FDF4] transition-colors" title="WhatsApp">
                        <Send className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Desktop table (hidden sm:block) ──────────────────────── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="ff-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Client</th>
                    <th>Job / Worker</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} onClick={() => router.push(`/admin/invoices/${inv.id}`)}
                      className="cursor-pointer hover:bg-[#FAFBFD] transition-colors">
                      {/* Invoice # */}
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-[8px] bg-[#EFF6FF] flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-[#2563EB]" />
                          </div>
                          <div>
                            <p className="font-mono text-xs font-bold text-[#0F172A] group-hover:text-[#2563EB]">{inv.invoiceNumber}</p>
                            {inv.job.location && (
                              <p className="text-[10px] text-[#94A3B8] mt-0.5 truncate max-w-[100px]">{inv.job.location}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Client */}
                      <td>
                        <p className="font-semibold text-[#0F172A] text-sm truncate max-w-[140px]">{inv.clientName}</p>
                          <a href={`https://wa.me/${inv.clientPhone.replace("+", "")}`}
                            target="_blank" rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] text-[#94A3B8] hover:text-[#16A34A] transition-colors flex items-center gap-1 mt-0.5">
                          <Phone className="w-2.5 h-2.5" />{inv.clientPhone}
                        </a>
                      </td>
                      {/* Job / Worker */}
                      <td>
                        <p className="text-sm text-[#334155] truncate max-w-[140px]">{inv.job.jobType}</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5 truncate">
                          {inv.workerName ?? inv.job.workers[0]?.name ?? "—"}
                        </p>
                      </td>
                      {/* Amount */}
                      <td>
                        <p className="text-sm font-bold text-[#0F172A]">{formatKES(inv.amount)}</p>
                        {inv.paidAt && <p className="text-[10px] text-[#16A34A] mt-0.5">Paid {formatDate(inv.paidAt)}</p>}
                      </td>
                      {/* Status */}
                      <td><StatusBadge status={inv.status} size="xs" /></td>
                      {/* Date */}
                      <td className="text-[#64748B] whitespace-nowrap text-xs">{formatDate(inv.createdAt)}</td>
                      {/* Actions */}
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/invoices/${inv.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-[8px] border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-2 text-[11px] font-semibold text-[#2563EB] transition-colors hover:bg-[#DBEAFE]" title="View Invoice">
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </Link>
                          <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-[8px] border border-[#E2E8F0] p-2 text-[#64748B] transition-colors hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]" title="Download PDF">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <a href={`https://wa.me/${inv.clientPhone.replace("+", "")}?text=${encodeURIComponent(
                            `Hi ${inv.clientName}, your invoice ${inv.invoiceNumber} for ${formatKES(inv.amount)} is ready.`)}`}
                            target="_blank" rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-[8px] border border-[#E2E8F0] p-2 text-[#64748B] transition-colors hover:border-green-400 hover:bg-[#F0FDF4] hover:text-[#16A34A]" title="Send via WhatsApp">
                            <Send className="w-3.5 h-3.5" />
                          </a>
                          {inv.status === "PENDING" && (
                            <button onClick={(e) => { e.stopPropagation(); markPaid(inv.id); }} disabled={isPending}
                              className="min-h-9 rounded-[8px] border border-[#86EFAC] px-3 py-2 text-[11px] font-semibold text-[#16A34A] transition-colors hover:bg-[#F0FDF4] hover:text-[#15803D] disabled:opacity-50 whitespace-nowrap">
                              Mark Paid
                            </button>
                          )}
                          {inv.job.id && (
                            <Link href={`/admin/jobs/${inv.job.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-[8px] border border-[#E2E8F0] p-2 text-[#64748B] transition-colors hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]" title="View Job">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
