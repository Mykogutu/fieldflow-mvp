import { prisma } from "./prisma";
import { sendDocsToClient, sendReviewRequest } from "./twilio";
import { getWorkspaceConfig } from "./workspace-config";
import { currentWorkspaceId } from "./workspace";
import { getTemplate } from "./industry-templates";
import type { WhatsAppSender } from "./senders";

export async function createNotification(params: {
  type: string;
  title: string;
  message: string;
  jobId?: string;
  link?: string;
}): Promise<void> {
  const workspaceId = await currentWorkspaceId();
  await prisma.notification.create({ data: { ...params, workspaceId } });
}

export async function deliverJobVerifiedDocs(
  jobId: string,
  companyName: string,
  sender?: WhatsAppSender | null
): Promise<void> {
  const workspaceId = await currentWorkspaceId();
  const job = await prisma.job.findFirst({
    where: { id: jobId, workspaceId },
    include: { invoice: true },
  });
  if (!job) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const invoiceUrl = job.invoice
    ? `${siteUrl}/api/invoices/${job.invoice.id}/pdf`
    : undefined;

  await sendDocsToClient(
    job.clientPhone,
    {
      clientName: job.clientName,
      invoiceUrl,
      invoiceNumber: job.invoice?.invoiceNumber,
      amount: job.invoice ? `KES ${job.invoice.amount.toLocaleString()}` : undefined,
      jobId: job.jobNumber,
      companyName,
    },
    sender
  );

  await sendReviewRequest(
    job.clientPhone,
    {
      clientName: job.clientName,
      companyName,
      jobType: job.jobType,
      jobId: job.id,
    },
    sender
  );
}

export async function getCompanyName(): Promise<string> {
  const workspaceId = await currentWorkspaceId();
  const settings = await prisma.setting.findMany({
    where: { workspaceId, key: { in: ["company_name", "industry"] } },
    select: { key: true, value: true },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  if (map.company_name?.trim()) return map.company_name;

  const industryName = getTemplate(map.industry).displayName;
  if (industryName) return industryName;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  });
  return workspace?.name ?? "Field Services";
}

/**
 * Preferred accessor — returns the full workspace config for messaging.
 * Use this in new code instead of getCompanyName().
 */
export async function getWorkspace() {
  return getWorkspaceConfig();
}
