import { prisma } from "@/lib/prisma";
import { currentWorkspaceId } from "@/lib/workspace";
import DocumentsClient from "./DocumentsClient";

const DOC_LABELS: Record<string, { type: string; label: string }> = {
  invoice: { type: "INVOICE", label: "Invoice" },
  job_card: { type: "JOB_CARD", label: "Job Card" },
  warranty: { type: "WARRANTY_CERTIFICATE", label: "Warranty Certificate" },
  completion_certificate: { type: "COMPLETION_CERTIFICATE", label: "Completion Certificate" },
  quotation: { type: "QUOTATION", label: "Quotation" },
  service_report: { type: "SERVICE_REPORT", label: "Service Report" },
  installation_report: { type: "INSTALLATION_REPORT", label: "Installation Report" },
  fuel_calibration_report: { type: "FUEL_CALIBRATION_REPORT", label: "Fuel Calibration Report" },
  device_replacement_report: { type: "DEVICE_REPLACEMENT_REPORT", label: "Device Replacement Report" },
  client_confirmation_receipt: { type: "CLIENT_CONFIRMATION_RECEIPT", label: "Client Confirmation Receipt" },
  delivery_note: { type: "DELIVERY_NOTE", label: "Delivery Note" },
  compliance_certificate: { type: "COMPLIANCE_CERTIFICATE", label: "Compliance Certificate" },
};

const VALID_DOCUMENT_TYPES = new Set([
  "INVOICE",
  "JOB_CARD",
  "WARRANTY_CERTIFICATE",
  "COMPLETION_CERTIFICATE",
  "QUOTATION",
  "INSTALLATION_REPORT",
  "SERVICE_REPORT",
  "FUEL_CALIBRATION_REPORT",
  "DEVICE_REPLACEMENT_REPORT",
  "CLIENT_CONFIRMATION_RECEIPT",
  "DELIVERY_NOTE",
  "COMPLIANCE_CERTIFICATE",
  "OTHER",
]);

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams?: { type?: string };
}) {
  const workspaceId = await currentWorkspaceId();
  const typeFilter = searchParams?.type;

  const where = {
    workspaceId,
    ...(typeFilter && VALID_DOCUMENT_TYPES.has(typeFilter) ? { type: typeFilter as never } : {}),
    ...(typeFilter && !VALID_DOCUMENT_TYPES.has(typeFilter) ? { id: "__no_document_type__" } : {}),
  };

  const [rawDocs, total, typeCounts, enabledSetting] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      take: 50,
    }),
    prisma.document.count({ where: { workspaceId } }),
    prisma.document.groupBy({
      by: ["type"],
      where: { workspaceId },
      _count: { _all: true },
    }),
    prisma.setting.findFirst({ where: { workspaceId, key: "enabled_documents" }, select: { value: true } }),
  ]);

  let enabledKeys = ["invoice", "job_card", "warranty"];
  if (enabledSetting?.value) {
    try {
      enabledKeys = JSON.parse(enabledSetting.value) as string[];
    } catch {
      enabledKeys = ["invoice", "job_card", "warranty"];
    }
  }
  const enabledDocumentOptions = enabledKeys.map((key) => ({
    key,
    ...(DOC_LABELS[key] ?? { type: key.toUpperCase(), label: key.replace(/_/g, " ") }),
  }));

  // Enrich docs with client name and asset name from linked jobs
  const jobIds = rawDocs.map(d => d.jobId).filter(Boolean) as string[];
  const jobs = jobIds.length > 0
    ? await prisma.job.findMany({
        where: { id: { in: jobIds }, workspaceId },
        select: { id: true, clientName: true, asset: { select: { name: true } } },
      })
    : [];

  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j]));

  const docs = rawDocs.map(doc => ({
    ...doc,
    clientName: doc.jobId ? (jobMap[doc.jobId]?.clientName ?? null) : null,
    assetName: doc.jobId ? (jobMap[doc.jobId]?.asset?.name ?? null) : null,
  }));

  return (
    <DocumentsClient
      docs={docs as never}
      total={total}
      typeCounts={typeCounts}
      typeFilter={typeFilter}
      enabledDocumentOptions={enabledDocumentOptions}
    />
  );
}
