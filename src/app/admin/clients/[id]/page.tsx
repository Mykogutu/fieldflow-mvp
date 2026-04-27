import { getClientWithDetails } from "@/app/actions/client-actions";
import { formatKES, formatDate, statusLabel, statusColor } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Phone, MapPin, Mail, Building2, Briefcase, FileText,
  Package, ArrowLeft, ExternalLink,
} from "lucide-react";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await getClientWithDetails(params.id);
  if (!client) notFound();

  const totalInvoiced = client.invoices.reduce((s, inv) => s + inv.amount, 0);
  const totalPaid = client.invoices
    .filter((inv) => inv.status === "PAID")
    .reduce((s, inv) => s + inv.amount, 0);
  const outstanding = totalInvoiced - totalPaid;
  const lastJob = client.jobs[0];

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/admin/clients" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />Clients
        </Link>
        <span>/</span>
        <span className="text-slate-700 font-medium truncate">{client.name}</span>
      </div>

      {/* Profile header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xl font-bold shrink-0">
            {client.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${client.type === "COMPANY" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                {client.type === "COMPANY" ? "Company" : "Individual"}
              </span>
            </div>
            {client.company && (
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                <Building2 className="w-3.5 h-3.5" />{client.company}
              </p>
            )}
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{client.phone}</span>
              {client.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{client.email}</span>}
              {client.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{client.location}</span>}
            </div>
          </div>
          <a
            href={`https://wa.me/${client.phone.replace("+", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors shrink-0"
          >
            <ExternalLink className="w-4 h-4" /> WhatsApp
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <StatCard label="Total Jobs" value={client.jobs.length.toString()} />
          <StatCard label="Assets" value={client.assets.length.toString()} />
          <StatCard label="Total Invoiced" value={formatKES(totalInvoiced)} />
          <StatCard label="Outstanding" value={formatKES(outstanding)} color={outstanding > 0 ? "text-red-600" : "text-green-600"} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Jobs */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-slate-400" />Jobs
              <span className="text-slate-400 font-normal text-sm">({client.jobs.length})</span>
            </h2>
            <Link href={`/admin/jobs?client=${encodeURIComponent(client.phone)}`} className="text-xs text-blue-600 hover:text-blue-700">
              View all →
            </Link>
          </div>
          {client.jobs.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">No jobs yet for this client.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {client.jobs.slice(0, 8).map((job) => (
                <Link key={job.id} href={`/admin/jobs/${job.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{job.jobType}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {job.workers.map((w) => w.name).join(", ") || "Unassigned"} · {formatDate(job.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {job.invoice && (
                      <span className="text-xs font-medium text-slate-600">{formatKES(job.invoice.amount)}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(job.status)}`}>
                      {statusLabel(job.status)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Assets + Invoices */}
        <div className="space-y-5">
          {/* Assets */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-400" />
              <h2 className="font-semibold text-slate-900">Assets</h2>
              <span className="text-slate-400 font-normal text-sm">({client.assets.length})</span>
            </div>
            {client.assets.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No assets linked.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {client.assets.map((a) => (
                  <Link key={a.id} href={`/admin/assets/${a.id}`} className="block px-5 py-3 hover:bg-slate-50 transition-colors">
                    <p className="text-sm font-medium text-slate-900 truncate">{a.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{a.assetType}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Invoices */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <h2 className="font-semibold text-slate-900">Invoices</h2>
              <span className="text-slate-400 font-normal text-sm">({client.invoices.length})</span>
            </div>
            {client.invoices.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No invoices yet.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {client.invoices.slice(0, 6).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{inv.invoiceNumber}</p>
                      <p className="text-xs text-slate-400">{formatDate(inv.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-slate-700">{formatKES(inv.amount)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        inv.status === "PAID" ? "bg-green-100 text-green-700" :
                        inv.status === "PARTIALLY_PAID" ? "bg-amber-100 text-amber-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>{inv.status === "PARTIALLY_PAID" ? "Partial" : inv.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          {client.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-slate-500 mb-2">Notes</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "text-slate-900" }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}
