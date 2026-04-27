import { prisma } from "@/lib/prisma";
import { currentWorkspaceId } from "@/lib/workspace";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  FileText, Download, Clipboard, ShieldCheck, Award,
  FileEdit, Package, Truck, CheckSquare, FileCheck,
} from "lucide-react";

const DOC_CONFIG: Record<string, { label: string; Icon: React.ElementType; color: string; bg: string }> = {
  INVOICE:                     { label: "Invoice",                    Icon: FileText,    color: "text-blue-600",   bg: "bg-blue-50"   },
  JOB_CARD:                    { label: "Job Card",                   Icon: Clipboard,   color: "text-slate-600",  bg: "bg-slate-100" },
  WARRANTY_CERTIFICATE:        { label: "Warranty Certificate",       Icon: ShieldCheck, color: "text-green-600",  bg: "bg-green-50"  },
  INSTALLATION_REPORT:         { label: "Installation Report",        Icon: FileCheck,   color: "text-indigo-600", bg: "bg-indigo-50" },
  SERVICE_REPORT:              { label: "Service Report",             Icon: Award,       color: "text-purple-600", bg: "bg-purple-50" },
  FUEL_CALIBRATION_REPORT:     { label: "Fuel Calibration Report",    Icon: Package,     color: "text-amber-600",  bg: "bg-amber-50"  },
  DEVICE_REPLACEMENT_REPORT:   { label: "Device Replacement Report",  Icon: Package,     color: "text-orange-600", bg: "bg-orange-50" },
  CLIENT_CONFIRMATION_RECEIPT: { label: "Client Confirmation",        Icon: CheckSquare, color: "text-green-600",  bg: "bg-green-50"  },
  DELIVERY_NOTE:               { label: "Delivery Note",              Icon: Truck,       color: "text-cyan-600",   bg: "bg-cyan-50"   },
  COMPLIANCE_CERTIFICATE:      { label: "Compliance Certificate",     Icon: FileEdit,    color: "text-teal-600",   bg: "bg-teal-50"   },
  OTHER:                       { label: "Document",                   Icon: FileText,    color: "text-slate-500",  bg: "bg-slate-100" },
};

const ALL_TYPES = Object.keys(DOC_CONFIG);

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams?: { type?: string };
}) {
  const workspaceId = await currentWorkspaceId();
  const typeFilter = searchParams?.type;

  const docs = await prisma.document.findMany({
    where: {
      workspaceId,
      ...(typeFilter ? { type: typeFilter as never } : {}),
    },
    orderBy: { generatedAt: "desc" },
    take: 50,
  });

  const total = await prisma.document.count({ where: { workspaceId } });

  // Type counts for filter badges
  const typeCounts = await prisma.document.groupBy({
    by: ["type"],
    where: { workspaceId },
    _count: { _all: true },
  });
  const countMap = Object.fromEntries(typeCounts.map((t) => [t.type, t._count._all]));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Documents</h1>
          <p className="text-xs text-slate-400 mt-0.5">{total} total documents generated</p>
        </div>
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href="/admin/documents"
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
            !typeFilter ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-slate-600 hover:border-blue-300"
          }`}
        >
          All ({total})
        </Link>
        {ALL_TYPES.filter((t) => countMap[t]).map((t) => (
          <Link
            key={t}
            href={`/admin/documents?type=${t}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              typeFilter === t ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-slate-600 hover:border-blue-300"
            }`}
          >
            {DOC_CONFIG[t]?.label ?? t} ({countMap[t]})
          </Link>
        ))}
      </div>

      {/* Documents table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {docs.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <FileText className="w-10 h-10 text-slate-200" />
            <p className="text-sm text-slate-400">No documents generated yet.</p>
            <p className="text-xs text-slate-400">Documents are auto-generated when jobs are completed and verified.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Job</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Generated</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {docs.map((doc) => {
                  const cfg = DOC_CONFIG[doc.type] ?? DOC_CONFIG.OTHER;
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                            <cfg.Icon className={`w-4 h-4 ${cfg.color}`} />
                          </div>
                          <span className="text-xs font-medium text-slate-700 whitespace-nowrap">{cfg.label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-slate-700 truncate max-w-xs">{doc.title ?? cfg.label}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        {doc.jobId ? (
                          <Link href={`/admin/jobs/${doc.jobId}`} className="text-xs text-blue-600 hover:underline font-medium">
                            View Job →
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(doc.generatedAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        {doc.pdfUrl ? (
                          <a
                            href={doc.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </a>
                        ) : (
                          <span className="text-xs text-slate-300">No PDF</span>
                        )}
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
