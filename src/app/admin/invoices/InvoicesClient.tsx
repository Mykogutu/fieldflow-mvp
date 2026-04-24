"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateInvoiceStatus } from "@/app/actions/invoice-actions";
import { formatDate, formatKES } from "@/lib/utils";

interface Invoice {
  id: string; invoiceNumber: string; clientName: string; clientPhone: string;
  amount: number; status: string; pdfUrl: string | null; paidAt: string | null;
  createdAt: string; workerName: string | null;
  job: { jobType: string; location: string | null; workers: { name: string }[] };
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Invoices <span className="text-gray-400 text-lg font-normal">({total})</span></h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {["ALL", "PENDING", "PAID", "CANCELLED"].map((s) => (
          <button
            key={s}
            onClick={() => navigate(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              (currentStatus ?? "ALL") === s
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-blue-400"
            }`}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Invoice #</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Client</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Job Type</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Worker</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{inv.clientName}</p>
                    <p className="text-xs text-gray-400">{inv.clientPhone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{inv.job.jobType}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.workerName ?? inv.job.workers[0]?.name ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{formatKES(inv.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_BADGE[inv.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(inv.createdAt)}</td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <a
                      href={`/api/invoices/${inv.id}/pdf`}
                      target="_blank"
                      className="text-blue-600 hover:underline text-xs"
                    >
                      PDF
                    </a>
                    {inv.status === "PENDING" && (
                      <button
                        onClick={() => markPaid(inv.id)}
                        disabled={isPending}
                        className="text-green-600 hover:underline text-xs"
                      >
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">No invoices found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
