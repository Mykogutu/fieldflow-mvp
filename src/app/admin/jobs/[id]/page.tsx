import { prisma } from "@/lib/prisma";
import { currentWorkspaceId } from "@/lib/workspace";
import { notFound } from "next/navigation";
import { getUsers } from "@/app/actions/user-actions";
import JobDetailClient from "./JobDetailClient";

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

async function getJob(id: string) {
  const workspaceId = await currentWorkspaceId();
  const job = await prisma.job.findFirst({
    where: { id, workspaceId },
    include: {
      workers: { select: { id: true, name: true, phone: true } },
      invoice: true,
      events: { orderBy: { createdAt: "asc" } },
      asset: true,
    },
  });
  if (!job) return null;

  // Fetch documents linked to this job
  const documents = await prisma.document.findMany({
    where: { workspaceId, jobId: id },
    orderBy: { generatedAt: "desc" },
  });

  const enabledDocuments = await prisma.setting.findFirst({
    where: { workspaceId, key: "enabled_documents" },
    select: { value: true },
  });
  let enabledKeys = ["invoice", "job_card", "warranty"];
  if (enabledDocuments?.value) {
    try {
      enabledKeys = JSON.parse(enabledDocuments.value) as string[];
    } catch {
      enabledKeys = ["invoice", "job_card", "warranty"];
    }
  }
  const enabledDocumentOptions = enabledKeys
    .map((key) => ({ key, ...(DOC_LABELS[key] ?? { type: key.toUpperCase(), label: key.replace(/_/g, " ") }) }));

  return { ...job, documents, enabledDocumentOptions };
}

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const [job, workers] = await Promise.all([
    getJob(params.id),
    getUsers("TECHNICIAN"),
  ]);

  if (!job) notFound();

  return (
    <JobDetailClient
      job={{
        ...job,
        workers: job.workers,
        events: job.events.map(e => ({ ...e, createdAt: e.createdAt })),
        asset: job.asset,
        invoice: job.invoice,
        documents: job.documents,
        enabledDocumentOptions: job.enabledDocumentOptions,
        allWorkers: workers,
      } as never}
    />
  );
}
