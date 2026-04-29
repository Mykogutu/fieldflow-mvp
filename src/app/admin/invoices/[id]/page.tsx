import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Receipt,
  Send,
  User,
  Wrench,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { currentWorkspaceId } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { formatDate, formatKES } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#F1F5F9] py-3 last:border-0">
      <span className="text-xs font-medium text-[#94A3B8]">{label}</span>
      <span className="text-right text-sm font-semibold text-[#0F172A]">{value}</span>
    </div>
  );
}

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, workspaceId },
    include: {
      job: {
        include: {
          workers: { select: { name: true, phone: true } },
          asset: { select: { id: true, name: true, assetType: true, location: true } },
        },
      },
    },
  });

  if (!invoice) notFound();

  const worker = invoice.workerName ?? invoice.job.workers[0]?.name ?? "Unassigned";
  const workerPhone = invoice.job.workers[0]?.phone;
  const paidAmount = invoice.partialAmount ?? (invoice.status === "PAID" ? invoice.amount : 0);
  const balance = Math.max(invoice.amount - paidAmount, 0);
  const message = encodeURIComponent(
    `Hi ${invoice.clientName}, your invoice ${invoice.invoiceNumber} for ${formatKES(invoice.amount)} is ready.`
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/admin/invoices"
            className="mt-1 inline-flex min-h-9 min-w-9 items-center justify-center rounded-[10px] border border-[#E2E8F0] bg-white text-[#64748B] transition-colors hover:bg-[#F8FAFC] hover:text-[#2563EB]"
            aria-label="Back to invoices"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="ff-page-title">{invoice.invoiceNumber}</h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="ff-page-desc">Invoice details, payment status, and job context.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="ff-btn-secondary inline-flex min-h-10 items-center gap-2 px-4 py-2 text-sm"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </a>
          <a
            href={`https://wa.me/${invoice.clientPhone.replace("+", "")}?text=${message}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ff-btn-primary inline-flex min-h-10 items-center gap-2 px-4 py-2 text-sm"
          >
            <Send className="h-4 w-4" />
            Send via WhatsApp
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {[
          { label: "Invoice Amount", value: formatKES(invoice.amount), Icon: Receipt, bg: "bg-[#EFF6FF]", color: "text-[#2563EB]" },
          { label: "Paid", value: paidAmount > 0 ? formatKES(paidAmount) : "None", Icon: CheckCircle2, bg: "bg-[#F0FDF4]", color: "text-[#16A34A]" },
          { label: "Outstanding", value: balance > 0 ? formatKES(balance) : "Clear", Icon: FileText, bg: balance > 0 ? "bg-[#FFF1F2]" : "bg-[#F0FDF4]", color: balance > 0 ? "text-[#DC2626]" : "text-[#16A34A]" },
          { label: "Created", value: formatDate(invoice.createdAt), Icon: Calendar, bg: "bg-[#F1F5F9]", color: "text-[#64748B]" },
        ].map(({ label, value, Icon, bg, color }) => (
          <div key={label} className="rounded-[16px] border border-[#E2E8F0] bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#94A3B8]">{label}</p>
                <p className={`truncate text-base font-bold ${color}`}>{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-[16px] border border-[#E2E8F0] bg-white shadow-card lg:col-span-2">
          <div className="border-b border-[#E2E8F0] px-5 py-4">
            <h2 className="text-sm font-semibold text-[#0F172A]">Invoice Summary</h2>
            <p className="mt-0.5 text-xs text-[#94A3B8]">Generated from the completed job.</p>
          </div>
          <div className="p-5">
            <div className="overflow-hidden rounded-[12px] border border-[#E2E8F0]">
              <div className="grid grid-cols-[1fr_auto] bg-[#F8FAFC] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                <span>Item</span>
                <span>Amount</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-start gap-4 px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">{invoice.job.jobType}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                    {invoice.job.description || "Service completed and awaiting client payment records."}
                  </p>
                </div>
                <p className="text-sm font-bold text-[#0F172A]">{formatKES(invoice.amount)}</p>
              </div>
              <div className="flex items-center justify-between border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                <span className="text-sm font-semibold text-[#0F172A]">Total</span>
                <span className="text-lg font-bold text-[#0F172A]">{formatKES(invoice.amount)}</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-[12px] border border-[#E2E8F0] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-[#2563EB]" />
                  <h3 className="text-sm font-semibold text-[#0F172A]">Client</h3>
                </div>
                <InfoRow label="Name" value={invoice.clientName} />
                <InfoRow
                  label="Phone"
                  value={
                    <a href={`https://wa.me/${invoice.clientPhone.replace("+", "")}`} className="text-[#2563EB] hover:underline">
                      {invoice.clientPhone}
                    </a>
                  }
                />
                <InfoRow label="Location" value={invoice.job.location || "Not set"} />
              </div>

              <div className="rounded-[12px] border border-[#E2E8F0] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-[#2563EB]" />
                  <h3 className="text-sm font-semibold text-[#0F172A]">Job</h3>
                </div>
                <InfoRow
                  label="Job"
                  value={<Link href={`/admin/jobs/${invoice.job.id}`} className="text-[#2563EB] hover:underline">{invoice.job.jobNumber}</Link>}
                />
                <InfoRow label="Worker" value={worker} />
                <InfoRow label="Worker phone" value={workerPhone || "Not set"} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[16px] border border-[#E2E8F0] bg-white shadow-card">
            <div className="border-b border-[#E2E8F0] px-5 py-4">
              <h2 className="text-sm font-semibold text-[#0F172A]">Payment Details</h2>
            </div>
            <div className="px-5 py-2">
              <InfoRow label="Status" value={<StatusBadge status={invoice.status} size="xs" />} />
              <InfoRow label="Paid at" value={invoice.paidAt ? formatDate(invoice.paidAt) : "Not paid"} />
              <InfoRow label="Method" value={invoice.paymentMethod || "Not recorded"} />
              <InfoRow label="Reference" value={invoice.paymentReference || "Not recorded"} />
              <InfoRow label="Notes" value={invoice.paymentNotes || "None"} />
            </div>
          </div>

          {invoice.job.asset && (
            <div className="rounded-[16px] border border-[#E2E8F0] bg-white shadow-card">
              <div className="border-b border-[#E2E8F0] px-5 py-4">
                <h2 className="text-sm font-semibold text-[#0F172A]">Asset</h2>
              </div>
              <div className="px-5 py-2">
                <InfoRow
                  label="Asset"
                  value={<Link href={`/admin/assets/${invoice.job.asset.id}`} className="text-[#2563EB] hover:underline">{invoice.job.asset.name}</Link>}
                />
                <InfoRow label="Type" value={invoice.job.asset.assetType} />
                <InfoRow label="Location" value={invoice.job.asset.location || invoice.job.location || "Not set"} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
